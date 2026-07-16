import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { SharedHeaderComponent } from '../../../components/shared-header/shared-header.component';
import { PartnerPermissionService } from '../../../services/partner-permission.service';
import { PartnerApiService } from '../../../services/partner-api.service';
import { PartnerHeaderComponent } from '../../../components/partner-header/partner-header.component';
import { SkeletonLoaderComponent } from '../../../components/skeleton-loader/skeleton-loader.component';

interface ScheduledTrip {
  id: number;
  busNumber: string;
  classType: 'VIP' | 'Classique';
  price: number;
  status: 'En cours' | 'Planifié';
  origin: string;
  destination: string;
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
    IonicModule,
    CommonModule,
    FormsModule,
    SharedHeaderComponent,
    PartnerHeaderComponent,
    SkeletonLoaderComponent,
  ],
})
export class ScheduledTripsPage implements OnInit {
  // Filtre d'onglet actif : 'all' | 'planifie' | 'active'
  activeFilter: 'all' | 'planifie' | 'active' = 'all';

  // Liste globale des voyages planifiés (chargée depuis API)
  trips: ScheduledTrip[] = [];

  // Liste filtrée affichée
  filteredTrips: ScheduledTrip[] = [];

  // Permissions
  canViewTrips = false;
  partnerRole: string | null = null;
  loading: boolean = true;

  constructor(
    private router: Router,
    private permissionService: PartnerPermissionService,
    private apiService: PartnerApiService,
  ) {}

  ngOnInit() {
    this.loadPermissions();
    this.loadTrips();
  }

  private loadPermissions(): void {
    const permissions = this.permissionService.getPermissions();
    this.canViewTrips = permissions?.canViewTrips || false;
    this.partnerRole = this.permissionService.getPartnerRole();
  }

  /**
   * Charger les trajets depuis l'API
   */
  private loadTrips(): void {
    this.loading = true;
    this.apiService.getTrips().subscribe(
      (trips: any[]) => {
        this.trips = trips.map((trip) => ({
          id: trip.id,
          busNumber: trip.bus?.registrationNumber,
          classType: trip.classType || 'VIP',
          price: trip.price,
          status: trip.status,
          origin: trip.departureCity || 'Brazzaville',
          destination: trip.arrivalCity || 'Pointe-Noire',
          departureTime: trip.departureTimeOfDay || '08:00',
          arrivalTime: trip.arrivalTimeOfDay,
          occupiedSeats: trip.seatsReserved,
          totalSeats: trip.totalSeats || 50,
        }));
        console.log('Trajets chargés:', this.trips);
        this.applyTabFilter(this.activeFilter);
        this.loading = false;
      },
      (error: any) => {
        console.error('Erreur lors du chargement des trajets:', error);
        // Les données par défaut restent utilisées en cas d'erreur
        this.applyTabFilter(this.activeFilter);
        this.loading = false;
      },
    );
  }

  // Appliquer le filtre de segment
  applyTabFilter(filter: 'all' | 'planifie' | 'active') {
    this.activeFilter = filter;

    if (filter === 'all') {
      this.filteredTrips = [...this.trips];
    } else if (filter === 'active') {
      this.filteredTrips = this.trips.filter((t) => t.status === 'En cours');
    } else if (filter === 'planifie') {
      this.filteredTrips = this.trips.filter((t) => t.status === 'Planifié');
    }
  }

  // Réinitialiser les filtres depuis l'état vide
  resetFilters(): void {
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
