import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, InfiniteScrollCustomEvent, NavController, AlertController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Trip, TripSearchParams } from '../../../models';
import { TripService } from '../../../services';

/** Forme de travail du panneau de filtres avancés (brouillon, appliqué seulement au clic sur "Appliquer"). */
interface FilterDraft {
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  passengers: number;
  category: '' | 'VIP' | 'Classique' | 'Standard';
  maxPrice: number | null;
  agencies: string[];
}

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

  // Résumé textuel pour le bandeau d'en-tête (trajet, date, passager)
  searchSummary = {
    origin: 'Départ',
    destination: 'Destination',
    date: '',
    passengersCount: 1,
    passengerName: '',
    passengerPhone: '',
  };

  // Listes de stockage des lignes
  displayedTrips: Trip[] = [];
  allTripsFromSearch: Trip[] = [];

  // Filtres actifs correspondants aux options UI (raccourcis de tri rapide)
  activeFilter: 'all' | 'cheapest' | 'earliest' | 'vip' = 'earliest';

  // Filtres avancés appliqués (issus du panneau de filtres)
  maxPriceFilter: number | null = null;
  categoryFilter: ('VIP' | 'Classique' | 'Standard') | null = null;
  agencyFilter: string[] = [];

  // Panneau de filtres avancés (bottom-sheet)
  isFilterPanelOpen = false;
  filterDraft: FilterDraft = {
    departureCity: '',
    arrivalCity: '',
    departureDate: '',
    passengers: 1,
    category: '',
    maxPrice: null,
    agencies: [],
  };

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
      this.searchSummary.passengerName = params['passengerName'] || '';
      this.searchSummary.passengerPhone = params['passengerPhone'] || '';

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
   * + les filtres avancés persistés (catégorie, prix max, agences).
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

    if (this.agencyFilter.length) {
      filtered = filtered.filter((t) => this.agencyFilter.includes(String(t.agencyName)));
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
    this.noResults = this.displayedTrips.length === 0;
  }

  // -----------------------------------------------------------------
  // PANNEAU DE FILTRES AVANCÉS (trajet, date, passagers, bus, agence, prix)
  // -----------------------------------------------------------------

  /** Liste des agences présentes dans les résultats, avec nombre de trajets — alimente les cases à cocher. */
  get availableAgencies(): { name: string; count: number }[] {
    const counts = new Map<string, number>();
    this.allTripsFromSearch.forEach((t) => {
      if (!t.agencyName) return;
      counts.set(t.agencyName, (counts.get(t.agencyName) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  /** Bornes de prix (min/max) observées dans les résultats — alimente le curseur de budget. */
  get priceBounds(): { min: number; max: number } {
    if (!this.allTripsFromSearch.length) {
      return { min: 0, max: 50000 };
    }
    const prices = this.allTripsFromSearch.map((t) => t.pricePerSeat);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }

  /** Nombre de filtres avancés actifs, affiché en badge sur le bouton "sliders". */
  get advancedFilterCount(): number {
    let count = 0;
    if (this.categoryFilter) count++;
    if (this.maxPriceFilter) count++;
    if (this.agencyFilter.length) count++;
    return count;
  }

  openFilterPanel() {
    this.filterDraft = {
      departureCity: this.searchParams.departureCity,
      arrivalCity: this.searchParams.arrivalCity,
      departureDate: this.searchParams.departureDate,
      passengers: this.searchSummary.passengersCount,
      category: this.categoryFilter || '',
      maxPrice: this.maxPriceFilter ?? this.priceBounds.max,
      agencies: [...this.agencyFilter],
    };
    this.isFilterPanelOpen = true;
  }

  closeFilterPanel() {
    this.isFilterPanelOpen = false;
  }

  swapDepartureArrival() {
    const tmp = this.filterDraft.departureCity;
    this.filterDraft.departureCity = this.filterDraft.arrivalCity;
    this.filterDraft.arrivalCity = tmp;
  }

  incrementPassengers() {
    if (this.filterDraft.passengers < 9) this.filterDraft.passengers++;
  }

  decrementPassengers() {
    if (this.filterDraft.passengers > 1) this.filterDraft.passengers--;
  }

  selectCategoryDraft(category: any) {
    this.filterDraft.category = this.filterDraft.category === category ? '' : category;
  }

  toggleAgencyDraft(agency: string) {
    const idx = this.filterDraft.agencies.indexOf(agency);
    if (idx > -1) {
      this.filterDraft.agencies.splice(idx, 1);
    } else {
      this.filterDraft.agencies.push(agency);
    }
  }

  isAgencySelected(agency: string): boolean {
    return this.filterDraft.agencies.includes(agency);
  }

  resetFilterPanel() {
    this.filterDraft.category = '';
    this.filterDraft.maxPrice = this.priceBounds.max;
    this.filterDraft.agencies = [];
  }

  /** Applique le brouillon : relance une recherche API si le trajet/la date ont changé, sinon filtre localement. */
  applyFilterPanel() {
    const paramsChanged =
      this.filterDraft.departureCity !== this.searchParams.departureCity ||
      this.filterDraft.arrivalCity !== this.searchParams.arrivalCity ||
      this.filterDraft.departureDate !== this.searchParams.departureDate;

    this.searchParams.departureCity = this.filterDraft.departureCity;
    this.searchParams.arrivalCity = this.filterDraft.arrivalCity;
    this.searchParams.departureDate = this.filterDraft.departureDate;

    this.searchSummary.origin = this.filterDraft.departureCity || 'Congo';
    this.searchSummary.destination = this.filterDraft.arrivalCity || 'Destination';
    this.searchSummary.date = this.filterDraft.departureDate
      ? this.formatDisplayDate(this.filterDraft.departureDate)
      : "Aujourd'hui";
    this.searchSummary.passengersCount = this.filterDraft.passengers;

    this.categoryFilter = (this.filterDraft.category || null) as 'VIP' | 'Classique' | 'Standard' | null;
    this.maxPriceFilter = this.filterDraft.maxPrice;
    this.agencyFilter = [...this.filterDraft.agencies];

    this.isFilterPanelOpen = false;

    if (paramsChanged) {
      this.performSearch();
    } else {
      this.applyFilter(this.activeFilter);
    }
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
    this.agencyFilter = [];
    this.activeFilter = 'earliest';
    this.performSearch();
  }

  goBack() {
    this.navCtrl.back();
  }

  modifySearch() {
    this.openFilterPanel();
  }

  onIonInfinite(event: any) {
    this.loadMoreTrips(event);
  }
}