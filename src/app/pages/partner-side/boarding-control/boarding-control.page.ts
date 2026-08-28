import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { Router } from '@angular/router';
import { PartnerPermissionService } from '../../../services/partner-permission.service';
import {
  PartnerApiService,
  Trip,
  ManifestData,
} from '../../../services/partner-api.service';
import { PartnerHeaderComponent } from '../../../components/partner-header/partner-header.component';
import { SkeletonLoaderComponent } from '../../../components/skeleton-loader/skeleton-loader.component';

interface PassengerManifest {
  id: number;
  name: string;
  ticketNumber: string;
  status: 'BOARDED' | 'PENDING' | 'NO_SHOW' | 'CANCELLED';
  seatNumber: number | string;
  phone?: string;
  boardingPoint?: string;
  deboardingPoint?: string;
  price?: number;
}

@Component({
  selector: 'app-boarding-control',
  templateUrl: './boarding-control.page.html',
  styleUrls: ['./boarding-control.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
    PartnerHeaderComponent,
    SkeletonLoaderComponent,
  ],
})
export class BoardingControlPage implements ViewWillEnter, ViewWillLeave {
  trips: Trip[] = [];
  selectedTripId: number | null = null;
  selectedTrip: Trip | null = null;
  selectedManifest: ManifestData | null = null;

  passengers: PassengerManifest[] = [];
  filteredPassengers: PassengerManifest[] = [];

  activeFilter: 'all' | 'boarded' | 'pending' | 'cancelled' = 'all';
  searchQuery = '';

  loadingTrips = false;
  loadingManifest = false;
  errorMessage = '';
  loading: boolean = true;

  canBoardingControl = false;
  isWharfAgent = false;

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
    this.selectedTripId = null;
    this.selectedTrip = null;
  }

  private loadPermissions(): void {
    const permissions = this.permissionService.getPermissions();
    this.canBoardingControl = permissions?.canBoardingControl || false;
    this.isWharfAgent = this.permissionService.isWharfAgent();
  }

  private loadTrips(): void {
    this.loading = true;
    this.loadingTrips = true;
    this.errorMessage = '';
    const date = new Date().toLocaleDateString('fr-FR', {});
    // console.log(date);
    this.apiService.getTrips(date).subscribe(
      (trips) => {
        this.trips = trips || [];
        if (this.trips.length > 0) {
          this.selectTrip(this.trips[0].id);
        }
        this.loading = false;
      },
      (error: any) => {
        console.error('Erreur chargement des voyages:', error);
        this.errorMessage = 'Impossible de charger les voyages.';
        this.loading = false;
      },
      () => {
        this.loadingTrips = false;
      },
    );
  }

  selectTrip(tripId: number): void {
    if (this.selectedTripId === tripId) {
      return;
    }

    this.selectedTripId = tripId;
    this.selectedTrip = this.trips.find((trip) => trip.id === tripId) || null;
    this.loadTripManifest(tripId);
  }

  private loadTripManifest(tripId: number): void {
    this.loadingManifest = true;
    this.errorMessage = '';
    this.apiService.getTripManifest(tripId).subscribe(
      (manifest) => {
        this.selectedManifest = manifest;
        this.passengers = (manifest.passengers || []).map((p) => ({
          id: p.id,
          name: p.name,
          ticketNumber: p.ticketNumber,
          seatNumber: p.seatNumber,
          status: p.boardingStatus,
          phone: p.phoneNumber,
          boardingPoint: p.boardingPoint,
          deboardingPoint: p.deboardingPoint,
          price: p.price,
        }));
        this.applyFilters();
      },
      (error: any) => {
        console.error('Erreur chargement manifeste:', error);
        this.errorMessage = 'Impossible de charger le manifeste du voyage.';
        this.selectedManifest = null;
        this.passengers = [];
        this.filteredPassengers = [];
        this.loadingManifest = false;
      },
      () => {
        this.loadingManifest = false;
      },
    );
  }

  get selectedTripLabel(): string {
    if (!this.selectedTrip) {
      return 'Aucun voyage sélectionné';
    }
    return `${this.selectedTrip.departureCity} → ${this.selectedTrip.arrivalCity}`;
  }

  get boardedCount(): number {
    return this.passengers.filter((p) => p.status === 'BOARDED').length;
  }

  get boardingProgressPercentage(): number {
    const capacity =
      this.selectedManifest?.busInfo?.capacity ||
      this.selectedTrip?.bus?.capacity ||
      0;
    if (capacity === 0) {
      return 0;
    }
    return Math.round((this.boardedCount / capacity) * 100);
  }

  applyFilters(): void {
    let result = [...this.passengers];

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.ticketNumber.toLowerCase().includes(query),
      );
    }

    if (this.activeFilter === 'boarded') {
      result = result.filter((p) => p.status === 'BOARDED');
    } else if (this.activeFilter === 'pending') {
      result = result.filter((p) => p.status === 'PENDING');
    } else if (this.activeFilter === 'cancelled') {
      result = result.filter((p) => p.status === 'CANCELLED');
    }

    this.filteredPassengers = result;
  }

  changeFilter(filter: 'all' | 'boarded' | 'pending' | 'cancelled'): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  // Compteurs utilisés dans les chips de filtre (badges)
  get pendingCount(): number {
    return this.passengers.filter((p) => p.status === 'PENDING').length;
  }

  get cancelledCount(): number {
    return this.passengers.filter((p) => p.status === 'CANCELLED').length;
  }

  /**
   * Centralise style + libellé par statut (comme sur la page manifeste)
   * pour éviter que badge/libellé ne divergent au fil des évolutions.
   */
  getPassengerStatusMeta(status: PassengerManifest['status']): {
    badge: string;
    label: string;
  } {
    switch (status) {
      case 'BOARDED':
        return {
          badge: 'bg-teal-50 text-teal-800 border border-teal-200',
          label: 'Embarqué',
        };
      case 'PENDING':
        return {
          badge: 'bg-cyan-50 text-cyan-800 border border-cyan-200',
          label: 'En attente',
        };
      case 'NO_SHOW':
        return {
          badge: 'bg-amber-50 text-amber-800 border border-amber-200',
          label: 'Non présenté',
        };
      case 'CANCELLED':
        return {
          badge: 'bg-rose-50 text-rose-800 border border-rose-200',
          label: 'Annulé',
        };
      default:
        return {
          badge:
            'bg-surface-container text-on-surface border border-surface-variant',
          label: 'Inconnu',
        };
    }
  }

  // Couleur de la barre de progression : signale un embarquement presque complet
  getBoardingBarClass(): string {
    const rate = this.boardingProgressPercentage;
    if (rate >= 90) return 'bg-red-500';
    if (rate >= 70) return 'bg-amber-500';
    return 'bg-secondary';
  }

  trackTrip(index: number, trip: Trip): number {
    return trip.id;
  }

  simulateQRCodeScan(): void {
    this.router.navigate(['/partner-validate-ticket']);
  }

  goBack(): void {
    this.router.navigate(['/tabs/partner-dashboard']);
  }
}
