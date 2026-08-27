import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  IonContent,
  InfiniteScrollCustomEvent,
  NavController,
  ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Trip, TripSearchParams, User } from '../../../models';
import { TripService, UserService } from '../../../services';
import { UiNotificationService } from '../../../services/ui-notification.service';
import { SharedHeaderComponent } from 'src/app/components/shared-header/shared-header.component';
import { environment } from 'src/environments/environment.prod';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonContent,
    SharedHeaderComponent,
  ],
})
export class HomePage
  implements OnInit, OnDestroy, ViewWillEnter, ViewWillLeave
{
  // Profil Utilisateur
  currentUser: User | null = null;
  userName: string = 'Utilisateur';

  readonly baseApiUrl = environment.baseApiUrl;

  // Structure des filtres de recherche
  searchParams: TripSearchParams = {
    departureCity: '',
    arrivalCity: '',
    departureDate: this.getTodayDate(),
  };

  // Listes de données réelles adaptées à l'API
  displayedTrips: Trip[] = [];
  departureCities: string[] = [];
  arrivalCities: string[] = [];

  // États de l'interface graphique
  isLoading = false;
  isSearching = false;
  currentPage = 1;
  pageSize = 10;
  totalResults = 0;
  hasUnreadNotifications = false;
  private destroy$ = new Subject<void>();

  constructor(
    private navCtrl: NavController,
    private tripService: TripService,
    private userService: UserService,
    private notificationService: UiNotificationService,
  ) {}

  ngOnInit() {
    this.loadUserProfile();
    this.loadInitialData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter() {
    // Se déclenche à CHAQUE fois que la page redevient active :
    // premier chargement, retour depuis /search-results, changement d'onglet...
    this.loadUserProfile();
    this.loadInitialData();
  }

  ionViewWillLeave() {
    // Optionnel : remettre l'UI dans un état propre en quittant,
    // pour éviter de voir un vieux spinner clignoter au retour.
    this.isSearching = false;
  }

  /**
   * Charger le profil de l'utilisateur connecté
   */
  private loadUserProfile() {
    this.userService
      .getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          this.userName = user?.fullName;
        },
        error: (err) => {
          console.error('Erreur lors du chargement du profil:', err);
          this.userName = 'Utilisateur';
        },
      });
  }

  /**
   * Chargement global des référentiels (villes et flux récents)
   */
  private loadInitialData() {
    this.isLoading = true;
    Promise.all([
      this.loadDepartureCities(),
      this.loadArrivalCities(),
      this.loadRecentTrips(),
    ])
      .then(() => {
        this.isLoading = false;
      })
      .catch((err) => {
        console.error("Erreur globale d'initialisation:", err);
        this.isLoading = false;
      });
  }

  private loadDepartureCities(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.tripService
        .getDepartureCities()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (cities) => {
            this.departureCities = cities;
            resolve();
          },
          error: (err) => reject(err),
        });
    });
  }

  private loadArrivalCities(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.tripService
        .getArrivalCities()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (cities) => {
            this.arrivalCities = cities;
            resolve();
          },
          error: (err) => reject(err),
        });
    });
  }

  /**
   * Charger la liste par défaut des plannings (anciennement trajets populaires)
   */
  private loadRecentTrips(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Simulation ou appel au service pour charger les lignes programmées par défaut
      this.tripService
        .getUncomingTrips() // Reste mappé sur la méthode du service mais traité comme flux général récent
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (trips) => {
            this.displayedTrips = trips;
            this.totalResults = trips.length;
            resolve();
          },
          error: (err) => {
            console.error(
              'Erreur lors de la récupération des plannings de voyage:',
              err,
            );
            reject(err);
          },
        });
    });
  }

  /**
   * Intervertir les sélections de départ et de destination
   */
  swapCities() {
    const temp = this.searchParams.departureCity;
    this.searchParams.departureCity = this.searchParams.arrivalCity;
    this.searchParams.arrivalCity = temp;
  }

  /**
   * Déclencher l'action de recherche et redirection avec filtres
   */
  async searchTrips() {
    if (!this.searchParams.departureCity) {
      await this.notificationService.showInfoAlert(
        'Veuillez sélectionner une ville de départ.',
        'Champ requis'
      );
      return;
    }

    if (!this.searchParams.arrivalCity) {
      await this.notificationService.showInfoAlert(
        'Veuillez sélectionner une ville de destination.',
        'Champ requis'
      );
      return;
    }

    if (!this.searchParams.departureDate) {
      await this.notificationService.showInfoAlert(
        'Veuillez spécifier votre date de voyage.',
        'Champ requis'
      );
      return;
    }

    this.navCtrl.navigateForward(['/search-results'], {
      queryParams: {
        departure: this.searchParams.departureCity,
        arrival: this.searchParams.arrivalCity,
        date: this.searchParams.departureDate,
      },
    });
  }

  openNotifications() {
    // Réinitialiser le compteur lors de l'ouverture
    // this.pushService.unreadCount.next(0);

    this.navCtrl.navigateForward('/notifications');
  }

  /**
   * Router vers la page de détail du voyage (points d'embarquement/débarquement,
   * places, horaires...). La réservation elle-même est déclenchée depuis cette
   * page de détail, pas directement depuis la liste.
   */
  selectTrip(trip: Trip) {
    this.navCtrl.navigateForward(`/trip-detail/${trip.id}`);
  }

  viewFavorites() {
    this.navCtrl.navigateForward('/favorite-trips');
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Formater proprement la durée en analysant les heures de l'API (ex: "07:00" et "12:30")
   */
  formatDuration(departure: string, arrival: string): string {
    if (!departure || !arrival) return 'N/A';
    try {
      const [depH, depM] = departure.split(':').map(Number);
      const [arrH, arrM] = arrival.split(':').map(Number);

      let diffMinutes = arrH * 60 + arrM - (depH * 60 + depM);
      if (diffMinutes < 0) diffMinutes += 24 * 60; // Gestion du passage de minuit si applicable

      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    } catch (e) {
      return 'N/A';
    }
  }
}
