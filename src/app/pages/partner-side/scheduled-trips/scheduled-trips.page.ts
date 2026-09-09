import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonModal, IonDatetime, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { Router } from '@angular/router';
import { PartnerPermissionService } from '../../../services/partner-permission.service';
import { PartnerApiService } from '../../../services/partner-api.service';
import { PartnerHeaderComponent } from '../../../components/partner-header/partner-header.component';
import { SkeletonLoaderComponent } from '../../../components/skeleton-loader/skeleton-loader.component';

type TripFilter = 'all' | 'planifie' | 'active' | 'termine';

interface ScheduledTrip {
  id: number;
  busNumber: string;
  classType: 'VIP' | 'Classique';
  price: number;
  status: 'En cours' | 'Planifié' | 'Terminé' | 'Annulé';
  origin: string;
  destination: string;
  date: string;
  tripDate?: string;
  departureTime: string;
  arrivalTime: string;
  occupiedSeats: number;
  totalSeats: number;
}

@Component({
  selector: 'app-scheduled-trips',
  templateUrl: './scheduled-trips.page.html',
  styleUrls: ['./scheduled-trips.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
    PartnerHeaderComponent,
    SkeletonLoaderComponent,
    IonModal,
    IonDatetime,
  ],
})
export class ScheduledTripsPage implements ViewWillEnter, ViewWillLeave {
  // Filtre d'onglet actif : 'all' | 'planifie' | 'active' | 'termine'
  activeFilter: TripFilter = 'all';

  // Filtres complémentaires pour départ, destination et date
  selectedDepartureCity: string = '';
  selectedArrivalCity: string = '';
  selectedDate: string = '';

  // Liste globale des voyages planifiés (chargée depuis API)
  trips: ScheduledTrip[] = [];

  // Liste filtrée affichée
  filteredTrips: ScheduledTrip[] = [];

  // Permissions
  canViewTrips = false;
  partnerRole: string | null = null;
  loading: boolean = true;

   // Format ISO attendu par ion-datetime pour préremplir le calendrier
  get isoSelectedDate(): string | undefined {
    return this.selectedDate ? `${this.selectedDate}T00:00:00` : undefined;
  }

  // Affichage lisible dans le trigger
  get formattedSelectedDate(): string {
    if (!this.selectedDate) return 'Toutes les dates';
    const [year, month, day] = this.selectedDate.split('-');
    return `${day}/${month}/${year}`;
  }

  onDateChange(event: CustomEvent, modal: IonModal): void {
    const value = event.detail.value as string;
    this.selectedDate = value ? value.split('T')[0] : '';
    this.applyFilters();
    modal.dismiss();
  }

  clearDate(event: Event): void {
    event.stopPropagation(); // évite de rouvrir la modal (le bouton est dans le trigger)
    this.selectedDate = '';
    this.applyFilters();
  }

  constructor(
    private router: Router,
    private permissionService: PartnerPermissionService,
    private apiService: PartnerApiService,
  ) {}

  ionViewWillEnter(): void {
    this.loadPermissions();
    this.loadTrips();
  }

  ionViewWillLeave(): void {
    this.loading = false;
  }

  private loadPermissions(): void {
    const permissions = this.permissionService.getPermissions();
    this.canViewTrips = permissions?.canViewTrips || false;
    this.partnerRole = this.permissionService.getPartnerRole();
  }

  /**
   * Charger les trajets depuis l'API
   */
  private normalizeTripStatus(rawStatus?: string | null): ScheduledTrip['status'] {
    if (!rawStatus) return 'Planifié';

    const normalized = rawStatus.trim().toLowerCase();

    if (
      ['active', 'in_progress', 'in-progress', 'en cours', 'encours'].includes(
        normalized,
      )
    ) {
      return 'En cours';
    }

    if (
      ['scheduled', 'planifie', 'planifié', 'future', 'pending'].includes(
        normalized,
      )
    ) {
      return 'Planifié';
    }

    if (
      ['completed', 'termine', 'terminé', 'finished', 'done'].includes(
        normalized,
      )
    ) {
      return 'Terminé';
    }

    if (
      ['cancelled', 'canceled', 'annulé', 'annule', 'cancel'].includes(
        normalized,
      )
    ) {
      return 'Annulé';
    }

    return rawStatus as ScheduledTrip['status'];
  }

  private loadTrips(
    date?: string,
    status?: 'all' | 'scheduled' | 'active' | 'completed',
    search?: string,
    departureCity?: string,
    arrivalCity?: string,
  ): void {
    this.loading = true;
    this.apiService.getTrips(date, status, search, departureCity, arrivalCity).subscribe(
      (trips: any[]) => {
        this.trips = trips.map((trip) => ({
          id: trip.id,
          busNumber: trip.bus?.registrationNumber || trip.busNumber || 'N/A',
          classType: trip.classType || 'VIP',
          price: Number(trip.price ?? trip.pricePerSeat ?? 0),
          status: this.normalizeTripStatus(trip.status),
          origin: trip.departureCity || 'Brazzaville',
          destination: trip.arrivalCity || 'Pointe-Noire',
          date: trip.tripDate || 'N/A',
          departureTime: trip.departureTimeOfDay || trip.departureTime || '08:00',
          arrivalTime: trip.arrivalTimeOfDay || trip.arrivalTime || '12:00',
          occupiedSeats: Number(trip.seatsReserved ?? trip.occupiedSeats ?? 0),
          totalSeats: Number(trip.maxSeats ?? trip.totalSeats ?? 50),
        }));

        this.filteredTrips = [...this.trips].sort(
          (a, b) => this.getTripDateValue(a) - this.getTripDateValue(b),
        );
        this.loading = false;
      },
      (error: any) => {
        console.error('Erreur lors du chargement des trajets:', error);
        this.filteredTrips = [];
        this.loading = false;
      },
    );
  }

  // Appliquer le filtre de segment et déclencher la requête côté backend
  applyTabFilter(filter: TripFilter) {
    this.activeFilter = filter;
    this.applyFilters();
  }

  get departureCities(): string[] {
    return [...new Set(this.trips.map((trip) => trip.origin).filter(Boolean))].sort();
  }

  get arrivalCities(): string[] {
    return [...new Set(this.trips.map((trip) => trip.destination).filter(Boolean))].sort();
  }

  swapCities(): void {
    [this.selectedDepartureCity, this.selectedArrivalCity] = [
      this.selectedArrivalCity,
      this.selectedDepartureCity,
    ];
    this.applyFilters();
  }

  applyFilters(): void {
    const statusMap: Record<TripFilter, 'all' | 'scheduled' | 'active' | 'completed'> = {
      all: 'all',
      planifie: 'scheduled',
      active: 'active',
      termine: 'completed',
    };

    const date = this.selectedDate || undefined;
    const status = statusMap[this.activeFilter];
    const departureCity = this.selectedDepartureCity || undefined;
    const arrivalCity = this.selectedArrivalCity || undefined;

    this.loadTrips(date, status, undefined, departureCity, arrivalCity);
  }

  private getTripDateValue(trip: ScheduledTrip): number {
    const rawDate = trip.date || trip.tripDate || trip.departureTime || trip.arrivalTime || '';
    if (!rawDate) return Number.MAX_SAFE_INTEGER;

    const date = new Date(rawDate);
    return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
  }

  // Réinitialiser les filtres depuis l'état vide
  resetFilters(): void {
    this.selectedDepartureCity = '';
    this.selectedArrivalCity = '';
    this.selectedDate = '';
    this.applyTabFilter('all');
  }

  // Compteurs utilisés dans les chips de filtre (badges)
  get totalCount(): number {
    return this.trips.length;
  }

  get scheduledCount(): number {
    return this.trips.filter((t) => t.status === 'Planifié').length;
  }

  get activeCount(): number {
    return this.trips.filter((t) => t.status === 'En cours').length;
  }

  get completedCount(): number {
    return this.trips.filter((t) => t.status === 'Terminé').length;
  }

  // Calcul du taux de remplissage en pourcentage pour la barre de progression
  getOccupancyRate(trip: ScheduledTrip): number {
    if (trip.totalSeats === 0) return 0;
    return (trip.occupiedSeats / trip.totalSeats) * 100;
  }

  // Couleur de la barre de remplissage : signale les trajets presque complets
  getOccupancyBarClass(trip: ScheduledTrip): string {
    const rate = this.getOccupancyRate(trip);
    if (rate >= 90) return 'bg-red-500';
    if (rate >= 70) return 'bg-amber-500';
    return trip.status === 'En cours' ? 'bg-secondary' : 'bg-gray-400';
  }

  // Action pour planifier un trajet supplémentaire
  planNewTrip() {
    this.router.navigate(['/partner-add-trip']);
  }

  // Accéder au manifeste d'un voyage
  openTripManifest(trip: ScheduledTrip) {
    this.router.navigate(['/partner-manifest', trip.id]);
  }

  goBack() {
    this.router.navigate(['/tabs/partner-dashboard']);
  }
}
