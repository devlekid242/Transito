import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, InfiniteScrollCustomEvent, NavController, AlertController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Trip, TripSearchParams } from '../../../models';
import { TripService } from '../../../services';

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.page.html',
  styleUrls: ['./search-results.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule],
})
export class SearchResultsPage implements OnInit, OnDestroy {
  
  // Paramètres de recherche unifiés
  searchParams: TripSearchParams = {
    departureCity: '',
    arrivalCity: '',
    departureDate: '',
  };

  // Résumé textuel pour le bandeau d'en-tête
  searchSummary = {
    origin: 'Départ',
    destination: 'Destination',
    date: '',
    passengersCount: 1,
  };

  // Listes de stockage des lignes
  displayedTrips: Trip[] = [];
  allTripsFromSearch: Trip[] = [];

  // Filtres actifs correspondants aux options UI
  activeFilter: 'all' | 'cheapest' | 'earliest' | 'vip' = 'earliest';
  maxPriceFilter: number | null = null;
  categoryFilter: ('VIP' | 'Classique' | 'Standard') | null = null;

  // Gestion des états asynchrones & Pagination Backend
  isLoading = true;
  isSearching = false;
  currentPage = 1;
  pageSize = 10;
  totalResults = 0;
  noResults = false;

  private destroy$ = new Subject<void>();

  constructor(
    private navCtrl: NavController,
    private tripService: TripService,
    private alertCtrl: AlertController,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.searchParams = {
        departureCity: params['departure'] || '',
        arrivalCity: params['arrival'] || '',
        departureDate: params['date'] || '',
      };

      this.searchSummary.origin = this.searchParams.departureCity || 'Congo';
      this.searchSummary.destination = this.searchParams.arrivalCity || 'Destination';
      this.searchSummary.date = this.searchParams.departureDate ? this.formatDisplayDate(this.searchParams.departureDate) : "Aujourd'hui";
      this.searchSummary.passengersCount = params['passengers'] ? parseInt(params['passengers'], 10) : 1;

      if (this.searchParams.departureCity && this.searchParams.arrivalCity) {
        this.performSearch();
      } else {
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Effectuer la recherche initiale connectée aux query parameters requis par le contrôleur API
   */
  private performSearch() {
    this.isLoading = true;
    this.isSearching = true;
    this.currentPage = 1;

    // Transformation des filtres pour correspondre aux exigences exactes de l'API Laravel/Symfony
    const apiParams : TripSearchParams = {
      departureCity: this.searchParams.departureCity,
      arrivalCity: this.searchParams.arrivalCity,
      departureDate: this.searchParams.departureDate,
      category: this.categoryFilter || '' as any,
      maxPrice: this.maxPriceFilter !== null ? this.maxPriceFilter.toString() : '' as any
    };

    this.tripService
      .searchTrips(apiParams, this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.allTripsFromSearch = response.data || [];
          this.totalResults = response.total || 0;
          this.displayedTrips = [...this.allTripsFromSearch];
          this.noResults = this.displayedTrips.length === 0;
          
          this.isLoading = false;
          this.isSearching = false;

          this.applyFilter(this.activeFilter);
        },
        error: async (err) => {
          console.error('Erreur lors du traitement API de recherche:', err);
          this.isLoading = false;
          this.isSearching = false;
          this.noResults = true;
          await this.showAlert('Indisponibilité', 'Impossible de récupérer les lignes de trajets pour le moment.');
        },
      });
  }

  /**
   * Appliquer les filtres et les tris graphiques (Cheapest / Earliest / VIP)
   */
  applyFilter(filter: 'all' | 'cheapest' | 'earliest' | 'vip') {
    this.activeFilter = filter;
    let filtered = [...this.allTripsFromSearch];

    if (this.maxPriceFilter) {
      filtered = filtered.filter((t) => t.pricePerSeat <= this.maxPriceFilter!);
    }

    if (this.categoryFilter) {
      filtered = filtered.filter((t) => t.category === this.categoryFilter);
    }

    switch (filter) {
      case 'cheapest':
        filtered.sort((a, b) => a.pricePerSeat - b.pricePerSeat);
        break;
      case 'earliest':
        filtered.sort((a, b) => (a.departureTime || '').localeCompare(b.departureTime || ''));
        break;
      case 'vip':
        filtered = filtered.filter((t) => t.category === 'VIP');
        filtered.sort((a, b) => (a.departureTime || '').localeCompare(b.departureTime || ''));
        break;
      default:
        filtered.sort((a, b) => (a.departureTime || '').localeCompare(b.departureTime || ''));
    }

    this.displayedTrips = filtered;
  }

  /**
   * Chargement paginé séquentiel via l'Infinite Scroll d'Ionic connecté aux données du contrôleur
   */
  loadMoreTrips(event: any) {
    const customEvent = event as InfiniteScrollCustomEvent;

    if (this.displayedTrips.length >= this.totalResults) {
      customEvent.target.complete();
      customEvent.target.disabled = true;
      return;
    }

    this.currentPage++;

    const apiParams: TripSearchParams = {
      departureCity: this.searchParams.departureCity,
      arrivalCity: this.searchParams.arrivalCity,
      departureDate: this.searchParams.departureDate,
      category: this.categoryFilter || '' as any,
      maxPrice: this.maxPriceFilter !== null ? this.maxPriceFilter.toString() : '' as any
    };

    this.tripService
      .searchTrips(apiParams, this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const newTrips = (response.data || []).filter(
            (t: Trip) => !this.allTripsFromSearch.some((existing) => existing.id === t.id)
          );
          
          this.allTripsFromSearch = [...this.allTripsFromSearch, ...newTrips];
          this.applyFilter(this.activeFilter);
          
          customEvent.target.complete();

          if (this.displayedTrips.length >= this.totalResults) {
            customEvent.target.disabled = true;
          }
        },
        error: (err) => {
          console.error('Erreur lors du chargement de la page suivante:', err);
          customEvent.target.complete();
        },
      });
  }

  bookTrip(trip: Trip) {
    this.navCtrl.navigateForward(`/booking-form/${trip.id}`, {
      state: { trip },
    });
  }

  formatDuration(departure: string, arrival: string): string {
    if (!departure || !arrival) return 'N/A';
    try {
      const [depH, depM] = departure.split(':').map(Number);
      const [arrH, arrM] = arrival.split(':').map(Number);
      
      let diffMinutes = (arrH * 60 + arrM) - (depH * 60 + depM);
      if (diffMinutes < 0) diffMinutes += 24 * 60; 
      
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    } catch (e) {
      return 'N/A';
    }
  }

  private formatDisplayDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
      cssClass: 'custom-alert',
    });
    await alert.present();
  }

  resetFilters() {
    this.maxPriceFilter = null;
    this.categoryFilter = null;
    this.activeFilter = 'earliest';
    this.performSearch();
  }

  goBack() {
    this.navCtrl.back();
  }

  modifySearch() {
    this.navCtrl.back();
  }

  onIonInfinite(event: any) {
    this.loadMoreTrips(event);
  }
}