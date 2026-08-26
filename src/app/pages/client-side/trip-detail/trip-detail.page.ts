import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, NavController, AlertController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TripDetail, TripPoint } from '../../../models';
import { TripService } from '../../../services';
import { environment } from 'src/environments/environment.prod';

@Component({
  selector: 'app-trip-detail',
  templateUrl: './trip-detail.page.html',
  styleUrls: ['./trip-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader],
})
export class TripDetailPage implements OnInit, OnDestroy {
  readonly baseApiUrl = environment.baseApiUrl;

  trip: TripDetail | null = null;
  isLoading = true;
  loadError = false;

  // Points sélectionnés par le voyageur (par défaut : ceux renvoyés par l'API).
  selectedBoardingPoint: TripPoint | null = null;
  selectedDeboardingPoint: TripPoint | null = null;

  private tripId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private tripService: TripService,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit(): void {
    this.tripId = this.route.snapshot.paramMap.get('id');
    if (!this.tripId) {
      this.isLoading = false;
      this.loadError = true;
      return;
    }
    this.loadTripDetails(this.tripId);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTripDetails(id: string): void {
    this.isLoading = true;
    this.loadError = false;

    this.tripService
      .getTripDetails(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (trip) => {
          this.trip = trip;
          this.selectedBoardingPoint = trip.departurePoint;
          this.selectedDeboardingPoint = trip.arrivalPoint;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur lors du chargement du détail du voyage:', err);
          this.isLoading = false;
          this.loadError = true;
        },
      });
  }

  selectBoardingPoint(point: TripPoint): void {
    this.selectedBoardingPoint = point;
  }

  selectDeboardingPoint(point: TripPoint): void {
    this.selectedDeboardingPoint = point;
  }

  async proceedToBooking(): Promise<void> {
    if (!this.trip) return;

    if (!this.trip.availableSeats || this.trip.availableSeats <= 0) {
      await this.showAlert(
        'Complet',
        'Ce voyage ne dispose plus de places disponibles.',
      );
      return;
    }

    if (!this.selectedBoardingPoint || !this.selectedDeboardingPoint) {
      await this.showAlert(
        'Sélection requise',
        "Veuillez choisir un point d'embarquement et de débarquement.",
      );
      return;
    }

    this.navCtrl.navigateForward(`/booking-form/${this.trip.id}`, {
      state: {
        trip: this.trip,
        boardingPointId: this.selectedBoardingPoint.id,
        deboardingPointId: this.selectedDeboardingPoint.id,
      },
    });
  }

  goBack(): void {
    this.navCtrl.back();
  }

  retry(): void {
    if (this.tripId) this.loadTripDetails(this.tripId);
  }

  /** Réutilise la même logique de calcul de durée que home/search-results. */
  formatDuration(departure: string, arrival: string): string {
    if (!departure || !arrival) return 'N/A';
    try {
      const [depH, depM] = departure.split(':').map(Number);
      const [arrH, arrM] = arrival.split(':').map(Number);

      let diffMinutes = arrH * 60 + arrM - (depH * 60 + depM);
      if (diffMinutes < 0) diffMinutes += 24 * 60;

      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    } catch (e) {
      return 'N/A';
    }
  }

  formatDisplayDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    } catch {
      return dateStr;
    }
  }

  private async showAlert(header: string, message: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
      cssClass: 'custom-alert-class',
    });
    await alert.present();
  }
}
