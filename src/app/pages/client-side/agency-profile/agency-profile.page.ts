import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonInfiniteScroll, IonInfiniteScrollContent, IonHeader,
  NavController,
  ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AgencyService } from '../../../services/agency.service';
import { TripService } from '../../../services/trip.service';
import { UiNotificationService } from '../../../services/ui-notification.service';
import { Agency, AgencyPoint } from '../../../models/agency.model';
import { Trip as ApiTrip } from '../../../models/trip.model';
import { environment } from 'src/environments/environment.prod';

interface DisplayTrip {
  id: number;
  type: 'VIP' | 'Classique' | 'Standard';
  dateLabel: string;
  departureTime: string;
  arrivalTime: string;
  durationLabel: string;
  origin: string;
  destination: string;
  price: number;
  remainingSeats: number;
  features: string[];
}

@Component({
  selector: 'app-agency-profile',
  templateUrl: './agency-profile.page.html',
  styleUrls: ['./agency-profile.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonInfiniteScroll, IonInfiniteScrollContent, IonHeader],
})
export class AgencyProfilePage implements OnInit, ViewWillEnter, ViewWillLeave {
  activeTab: 'trips' | 'points' = 'trips';
  agency: Agency | null = null;
  allTrips: DisplayTrip[] = [];
  displayedTrips: DisplayTrip[] = [];
  points: AgencyPoint[] = [];

  readonly baseApiUrl = environment.baseApiUrl;

  // Pilote le skeleton loader dans le template
  isLoading = true;

  // Bottom sheet de contact (déclenché par le bouton "..." du header)
  isContactMenuOpen = false;

  // Modal de localisation d'un point d'embarquement
  isMapModalOpen = false;
  selectedPoint: AgencyPoint | null = null;
  mapUrl: SafeResourceUrl | null = null;

  private itemsPerPage = 3;
  private currentOffset = 0;

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private agencyService: AgencyService,
    private tripService: TripService,
    private notificationService: UiNotificationService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    this.loadAgencyProfile();
  }

  ionViewWillEnter() {
    this.loadAgencyProfile();
  }

  ionViewWillLeave() {
    this.isLoading = false;
  }

  async loadAgencyProfile() {
    const agencyId = Number(this.route.snapshot.paramMap.get('id'));

    if (!agencyId || agencyId <= 0) {
      this.isLoading = false;
      await this.notificationService.showErrorAlert('Identifiant d\'agence invalide.');
      return;
    }

    this.isLoading = true;

    this.agencyService.getAgencyDetail(agencyId).subscribe({
      next: (agency) => {
        this.agency = agency;
        this.isLoading = false;
        this.loadAgencyTrips(agencyId);
        this.loadAgencyPoints(agencyId);
      },
      error: async () => {
        this.isLoading = false;
        await this.notificationService.showErrorAlert('Impossible de charger le profil de l agence.');
      },
    });
  }

  private loadAgencyTrips(agencyId: number) {
    this.tripService.getTripsByAgency(agencyId).subscribe({
      next: (trips) => {
        this.allTrips = trips.map((trip) => this.mapTrip(trip));
        this.displayedTrips = this.allTrips.slice(0, this.itemsPerPage);
        this.currentOffset = this.displayedTrips.length;
      },
      error: () => {
        this.notificationService.showErrorAlert('Impossible de charger les trajets de cette agence.');
      },
    });
  }

  private loadAgencyPoints(agencyId: number) {
    this.agencyService.getAgencyPoints(agencyId).subscribe({
      next: (points) => {
        this.points = points;
      },
      error: () => {
        this.points = [];
      },
    });
  }

  selectTab(tab: 'trips' | 'points') {
    this.activeTab = tab;
  }

  loadMoreTrips(event?: any) {
    const nextChunk = this.allTrips.slice(
      this.currentOffset,
      this.currentOffset + this.itemsPerPage,
    );
    this.displayedTrips = [...this.displayedTrips, ...nextChunk];
    this.currentOffset += nextChunk.length;

    if (event) {
      event.target.complete();
      if (this.currentOffset >= this.allTrips.length) {
        event.target.disabled = true;
      }
    }
  }

  bookTrip(trip: DisplayTrip) {
    if (!trip?.id) {
      return;
    }
    this.navCtrl.navigateForward(`/booking-form/${trip.id}`);
  }

  goBack() {
    this.navCtrl.pop();
  }

  /** Ouvre le menu contextuel (bottom sheet de contact) depuis le header */
  openMenu() {
    this.toggleContactMenu(true);
  }

  toggleContactMenu(state?: boolean) {
    this.isContactMenuOpen = state ?? !this.isContactMenuOpen;
  }

  callAgency() {
    const phone = (this.agency as any)?.phoneNumber;
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    }
  }

  emailAgency() {
    const email = (this.agency as any)?.email;
    if (email) {
      window.open(`mailto:${email}`, '_self');
    }
  }

  /** Ouvre le modal de localisation pour un point d'embarquement donné */
  showLocation(point: AgencyPoint) {
    this.selectedPoint = point;

    const lat = (point as any)?.latitude;
    const lng = (point as any)?.longitude;

    if (lat != null && lng != null) {
      const url = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
      this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    } else {
      this.mapUrl = null;
    }

    this.isMapModalOpen = true;
  }

  closeMapModal() {
    this.isMapModalOpen = false;
    this.selectedPoint = null;
    this.mapUrl = null;
  }

  openInMaps() {
    const lat = (this.selectedPoint as any)?.latitude;
    const lng = (this.selectedPoint as any)?.longitude;
    if (lat != null && lng != null) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        '_blank',
      );
    }
  }

  private mapTrip(trip: ApiTrip): DisplayTrip {
    return {
      id: trip.id,
      type: trip.category ?? 'Classique',
      dateLabel: this.formatTripDate(trip.departureDate || trip.departureTime),
      departureTime: this.formatHour(trip.departureTime),
      arrivalTime: this.formatHour(trip.arrivalTime),
      durationLabel: this.computeDuration(trip.departureTime, trip.arrivalTime),
      origin: trip.departureCity || 'Départ',
      destination: trip.arrivalCity || 'Arrivée',
      price: trip.pricePerSeat ?? 0,
      remainingSeats: trip.availableSeats ?? 0,
      features: this.buildFeatures(trip),
    };
  }

  private buildFeatures(trip: ApiTrip): string[] {
    const features: string[] = [];

    if (trip.category === 'VIP') {
      features.push('wifi', 'ac_unit');
    }

    if (trip.availableSeats !== undefined && trip.availableSeats <= 10) {
      features.push('hourglass_top');
    }

    if (features.length === 0) {
      features.push('luggage');
    }

    return features;
  }

  private formatHour(value?: string): string {
    if (!value) {
      return '--:--';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private computeDuration(start?: string, end?: string): string {
    if (!start || !end) {
      return '';
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return '';
    }

    let diffMinutes = (endDate.getTime() - startDate.getTime()) / 60000;
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
    }

    const hours = Math.floor(diffMinutes / 60);
    const minutes = Math.round(diffMinutes % 60);

    if (hours > 0) {
      return minutes > 0 ? `${hours}h${minutes}` : `${hours}h`;
    }
    return `${minutes}min`;
  }

  private formatTripDate(value?: string): string {
    if (!value) {
      return 'Date inconnue';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    }

    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Demain';
    }

    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }


}
