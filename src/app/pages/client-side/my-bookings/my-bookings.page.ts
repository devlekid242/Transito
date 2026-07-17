import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonicModule,
  NavController,
  LoadingController,
  AlertController,
  ModalController,
} from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Reservation } from '../../../models';
import { BookingService } from '../../../services';
import { QrTicketModalComponent } from '../../../components/qr-ticket-modal/qr-ticket-modal.component';

@Component({
  selector: 'app-my-bookings',
  templateUrl: './my-bookings.page.html',
  styleUrls: ['./my-bookings.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class MyBookingsPage implements OnInit, OnDestroy {
  // Données
  bookings: Reservation[] = [];
  activeBookings: Reservation[] = [];
  pastBookings: Reservation[] = [];

  // Billet actif (pour affichage détail)
  activeTicket: any[] = [];

  // Historique des réservations
  bookingHistory: Reservation[] = [];

  // Filtrage
  filterType: 'all' | 'active' | 'past' = 'all';
  displayedBookings: Reservation[] = [];

  // État modales
  isQrModalOpen = false;

  // État
  isLoading = true;
  noBookings = false;

  // Subject
  private destroy$ = new Subject<void>();

  constructor(
    private navCtrl: NavController,
    private bookingService: BookingService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
  ) {}

  ngOnInit() {
    this.loadBookings();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charger les réservations
   */
  private async loadBookings() {
    this.isLoading = true;
    this.bookingService
      .getUserBookings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bookings) => {
          this.bookings = bookings;
          this.separateBookings();
          this.bookingHistory = this.pastBookings;
          this.activeTicket = this.activeBookings;
          this.isLoading = false;
          this.noBookings = this.bookings.length === 0;
        },
        error: async (err) => {
          console.error('Erreur chargement réservations:', err);
          this.isLoading = false;
          await this.showAlert(
            'Erreur',
            'Erreur lors du chargement des réservations',
          );
        },
      });
  }

  /**
   * Séparer les réservations actives et passées
   */
  private separateBookings() {
    const now = new Date();
    this.activeBookings = this.bookings.filter(
      (b) => new Date(b.bookingDate) > now,
    );
    this.pastBookings = this.bookings.filter(
      (b) => new Date(b.bookingDate) <= now,
    );
    this.applyFilter(this.filterType);
  }

  /**
   * Appliquer le filtre
   */
  applyFilter(type: 'all' | 'active' | 'past') {
    this.filterType = type;

    switch (type) {
      case 'active':
        this.displayedBookings = this.activeBookings;
        break;
      case 'past':
        this.displayedBookings = this.pastBookings;
        break;
      default:
        this.displayedBookings = this.bookings;
    }
  }

  /**
   * Voir les détails d'une réservation
   */
  viewDetails(booking: Reservation) {
    this.navCtrl.navigateForward(`/ticket/${booking.id}`, {
      state: { booking },
    });
  }

  /**
   * Annuler une réservation
   */
  async cancelBooking(booking: Reservation) {
    const alert = await this.alertCtrl.create({
      header: 'Annuler la réservation',
      message: 'Êtes-vous sûr de vouloir annuler cette réservation ?',
      buttons: [
        {
          text: 'Non',
          role: 'cancel',
        },
        {
          text: 'Oui, annuler',
          handler: () => {
            this.performCancelBooking(booking);
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Effectuer l'annulation
   */
  private performCancelBooking(booking: Reservation) {
    this.bookingService
      .cancelBooking(booking.id, "Annulation par l'utilisateur")
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          await this.showAlert('Succès', 'Réservation annulée');
          this.loadBookings();
        },
        error: async (err) => {
          console.error('Erreur annulation:', err);
          await this.showAlert('Erreur', "Erreur lors de l'annulation");
        },
      });
  }

  /**
   * Afficher une alerte
   */
  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  /**
   * Formater le prix
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-CM', {
      style: 'currency',
      currency: 'XAF',
    }).format(price);
  }

  /**
   * Retour
   */
  goBack() {
    this.navCtrl.back();
  }

  /**
   * Ouvrir les notifications
   */
  openNotifications() {
    this.navCtrl.navigateForward('/notifications');
  }

  /**
   * Ouvrir la modale QR code avec les données déjà disponibles
   */
  async openQrModal(bookingId: number | string) {
    const booking = this.bookings.find((item) => item.id === Number(bookingId));
    const qrValue = booking?.id ? `booking-${booking.id}` : String(bookingId);
    const modal = await this.modalCtrl.create({
      component: QrTicketModalComponent,
      componentProps: {
        bookingId: String(bookingId),
        qrCodeData: qrValue,
        qrCodeUrl: this.buildQrCodeUrl(qrValue),
        ticketDetails: {
          departureCity: booking?.trip?.departureCity || '',
          departureTime: booking?.trip?.departureTime || '',
          duration: '',
          arrivalCity: booking?.trip?.arrivalCity || '',
          arrivalTime: booking?.trip?.arrivalTime || '',
          passengerName: '',
          seatNumber: booking?.seatNumber || '',
          travelDate: booking?.trip?.departureDate || '',
        },
      },
    });

    this.isQrModalOpen = true;
    modal.onDidDismiss().then(() => {
      this.isQrModalOpen = false;
    });

    await modal.present();
  }

  private buildQrCodeUrl(value: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(value)}`;
  }

  /**
   * Voir les détails d'un billet
   */
  viewTicketDetails(bookingId: number) {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (booking) {
      this.navCtrl.navigateForward(`/ticket/${bookingId}`, {
        state: { booking },
      });
    }
  }

  /**
   * Re-réserver un trajet
   */
  rebookTrip(history: Reservation) {
    // Naviguer vers la page de recherche avec les mêmes paramètres
    this.navCtrl.navigateForward(['/search-results'], {
      queryParams: {
        departure: history.trip?.departureCity,
        arrival: history.trip?.arrivalCity,
      },
    });
  }

  /**
   * Handler pour infinite scroll
   */
  onIonInfinite(event: any) {
    // Charger plus de réservations si nécessaire
    const customEvent = event;
    customEvent.target.complete();
  }
}
