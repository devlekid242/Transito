import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonContent,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonCardTitle,
  IonCardSubtitle,
  IonTitle
} from '@ionic/angular';
import { Trip } from '../../../services/partner-api.service';

@Component({
  selector: 'app-trips-table',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonContent,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonCardTitle,
    IonCardSubtitle,
  ],
  template: `
    <div class="trips-table-container">
      <ion-toolbar class="trips-toolbar">
        <ion-title class="text-lg font-semibold">{{
          title || 'Trajets'
        }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="onRefresh()">
            <ion-icon slot="icon-only" name="refresh"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <div class="trips-grid p-4">
        <ng-container *ngIf="trips && trips.length > 0; else noTrips">
          <ion-card *ngFor="let trip of trips" class="trip-card">
            <ion-card-header>
              <div class="flex justify-between items-start">
                <div>
                  <ion-card-title class="trip-route">
                    {{ trip.departurePoint }} → {{ trip.arrivalPoint }}
                  </ion-card-title>
                  <ion-card-subtitle class="trip-date">
                    {{ trip.departureTime | date: 'dd/MM/yyyy HH:mm' }}
                  </ion-card-subtitle>
                </div>
                <ion-badge [color]="getStatusColor(trip.status)">
                  {{ getStatusLabel(trip.status) }}
                </ion-badge>
              </div>
            </ion-card-header>

            <ion-card-content class="trip-details">
              <div class="detail-row">
                <span class="detail-label">Places disponibles:</span>
                <span class="detail-value"
                  >{{ trip.availableSeats }}/{{ getBusCapacity(trip) }}</span
                >
              </div>
              <div class="detail-row">
                <span class="detail-label">Prix:</span>
                <span class="detail-value">{{ trip.price }} XOF</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Arrivée:</span>
                <span class="detail-value">{{
                  trip.arrivalTime | date: 'HH:mm'
                }}</span>
              </div>

              <div class="action-buttons mt-4">
                <button class="btn-secondary" (click)="onViewDetails(trip)">
                  <ion-icon name="eye"></ion-icon>
                  Détails
                </button>
                <button class="btn-secondary" (click)="onViewManifest(trip)">
                  <ion-icon name="list"></ion-icon>
                  Manifeste
                </button>
                <button
                  class="btn-secondary"
                  *ngIf="canEdit"
                  (click)="onEdit(trip)"
                >
                  <ion-icon name="pencil"></ion-icon>
                  Éditer
                </button>
              </div>
            </ion-card-content>
          </ion-card>
        </ng-container>

        <ng-template #noTrips>
          <div class="no-trips-message text-center py-8">
            <ion-icon
              name="airplane-outline"
              class="text-6xl text-gray-400 mb-2"
            ></ion-icon>
            <p class="text-gray-500">
              {{ emptyMessage || 'Aucun trajet trouvé' }}
            </p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [
    `
      .trips-table-container {
        background: var(--ion-background-color);
        border-radius: 0.75rem;
        overflow: hidden;
      }

      .trips-toolbar {
        background: var(--ion-color-primary);
        --color: white;
        --padding-start: 1rem;
        --padding-end: 1rem;
      }

      .trips-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
      }

      .trip-card {
        background: var(--ion-card-background);
        box-shadow: var(--ion-card-box-shadow);
        border-radius: 0.75rem;
        overflow: hidden;
        transition:
          transform 0.2s,
          box-shadow 0.2s;
      }

      .trip-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      ion-card-header {
        padding: 1rem;
        border-bottom: 1px solid var(--ion-color-step-100);
      }

      .trip-route {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--ion-text-color);
      }

      .trip-date {
        font-size: 0.875rem;
        color: var(--ion-color-medium);
        margin-top: 0.25rem;
      }

      .trip-details {
        padding: 1rem;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--ion-color-step-50);
        font-size: 0.875rem;
      }

      .detail-row:last-child {
        border-bottom: none;
      }

      .detail-label {
        color: var(--ion-color-medium);
        font-weight: 500;
      }

      .detail-value {
        font-weight: 600;
        color: var(--ion-text-color);
      }

      .action-buttons {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      button {
        flex: 1;
        min-width: 80px;
        padding: 0.5rem;
        border: none;
        border-radius: 0.4rem;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        transition: all 0.2s ease;
      }

      .btn-secondary {
        background: var(--ion-color-primary-light, #f0f3ff);
        color: var(--ion-color-primary);
      }

      .btn-secondary:hover {
        background: var(--ion-color-primary);
        color: white;
      }

      .no-trips-message {
        padding: 2rem;
        color: var(--ion-color-medium);
      }

      ion-icon {
        font-size: 1.5rem;
      }
    `,
  ],
})
export class TripsTableComponent implements OnInit {
  @Input() trips: Trip[] = [];
  @Input() title: string = 'Trajets';
  @Input() emptyMessage: string = 'Aucun trajet trouvé';
  @Input() canEdit: boolean = false;

  @Output() viewDetails = new EventEmitter<Trip>();
  @Output() viewManifest = new EventEmitter<Trip>();
  @Output() editTrip = new EventEmitter<Trip>();
  @Output() refresh = new EventEmitter<void>();

  ngOnInit(): void {
    // Initialisation si nécessaire
  }

  onViewDetails(trip: Trip): void {
    this.viewDetails.emit(trip);
  }

  onViewManifest(trip: Trip): void {
    this.viewManifest.emit(trip);
  }

  onEdit(trip: Trip): void {
    this.editTrip.emit(trip);
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'SCHEDULED':
        return 'primary';
      case 'IN_PROGRESS':
        return 'warning';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'SCHEDULED':
        return 'Programmé';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'COMPLETED':
        return 'Terminé';
      case 'CANCELLED':
        return 'Annulé';
      default:
        return status;
    }
  }

  getBusCapacity(trip: Trip): number {
    // À remplacer par une vraie récupération de la capacité du bus
    return 50;
  }
}
