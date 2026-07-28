import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonicModule,
  NavController,
  AlertController,
  ModalController,
} from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Reservation } from '../../../models';
import { BookingService } from '../../../services';
import { QrTicketModalComponent } from '../../../components/qr-ticket-modal/qr-ticket-modal.component';
import { SharedHeaderComponent } from 'src/app/components/shared-header/shared-header.component';


export type BookingFilterType = 'all' | 'active' | 'past' | 'cancelled';

@Component({
  selector: 'app-my-bookings',
  templateUrl: './my-bookings.page.html',
  styleUrls: ['./my-bookings.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, SharedHeaderComponent],
})
export class MyBookingsPage implements OnInit, OnDestroy {
  // Données
  bookings: Reservation[] = [];
  activeBookings: Reservation[] = [];
  pastBookings: Reservation[] = [];
  cancelledBookings: Reservation[] = [];

  // Billet actif (pour affichage détail)
  activeTicket: any[] = [];

  // Historique des réservations
  bookingHistory: Reservation[] = [];

  // Filtrage par segment (onglets)
  filterType: BookingFilterType = 'all';
  displayedBookings: Reservation[] = [];

  readonly tabs: { value: BookingFilterType; label: string; icon: string }[] = [
    { value: 'all', label: 'Tous', icon: 'fa-layer-group' },
    { value: 'active', label: 'En cours', icon: 'fa-bus' },
    { value: 'past', label: 'Passés', icon: 'fa-clock-rotate-left' },
    { value: 'cancelled', label: 'Annulés', icon: 'fa-ban' },
  ];

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
        next: (bookings : Reservation[]) => {
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
   * Séparer les réservations par segment : en cours, passées, annulées.
   * Le statut renvoyé par l'API (`Confirmé` | `En attente` | `Annulé` | `Expiré`)
   * fait foi — une réservation annulée reste dans le segment "Annulés" même si
   * sa date de voyage est encore à venir ou déjà passée.
   */
  private separateBookings() {
    const now = new Date();

    this.cancelledBookings = this.bookings.filter(
      (b) => b.status === 'Annulé',
    );

    this.activeBookings = this.bookings.filter(
      (b) => b.status !== 'Annulé' && new Date(b.bookingDate) > now,
    );

    this.pastBookings = this.bookings.filter(
      (b) => b.status !== 'Annulé' && new Date(b.bookingDate) <= now,
    );

    this.applyFilter(this.filterType);
  }

  /**
   * Appliquer le filtre de segment (onglet actif)
   */
  applyFilter(type: BookingFilterType) {
    this.filterType = type;

    switch (type) {
      case 'active':
        this.displayedBookings = this.activeBookings;
        break;
      case 'past':
        this.displayedBookings = this.pastBookings;
        break;
      case 'cancelled':
        this.displayedBookings = this.cancelledBookings;
        break;
      default:
        this.displayedBookings = this.bookings;
    }
  }

  // Compteurs utilisés dans les badges des onglets
  get allCount(): number {
    return this.bookings.length;
  }

  get activeCount(): number {
    return this.activeBookings.length;
  }

  get pastCount(): number {
    return this.pastBookings.length;
  }

  get cancelledCount(): number {
    return this.cancelledBookings.length;
  }

  getTabCount(type: BookingFilterType): number {
    switch (type) {
      case 'active':
        return this.activeCount;
      case 'past':
        return this.pastCount;
      case 'cancelled':
        return this.cancelledCount;
      default:
        return this.allCount;
    }
  }

  /** Un billet annulé n'a plus ni détail, ni QR, ni possibilité d'être scanné. */
  isCancelled(booking: Reservation): boolean {
    return booking?.status === 'Annulé';
  }

  /** Le voyage n'a pas encore eu lieu — utilisé pour choisir la carte "billet actif" vs carte compacte. */
  isUpcoming(booking: Reservation): boolean {
    return !!booking?.bookingDate && new Date(booking.bookingDate) > new Date();
  }

  /**
   * Voir les détails d'une réservation.
   * Verrouillé pour les réservations annulées : aucune page de détail n'est
   * exposée pour un billet devenu invalide.
   */
  viewDetails(booking: Reservation) {
    if (this.isCancelled(booking)) {
      return;
    }
    this.navCtrl.navigateForward(`/ticket/${booking.id}`, {
      state: { booking },
    });
  }

  /**
   * Annuler une réservation
   */
  async cancelBooking(booking: Reservation) {
    if (this.isCancelled(booking)) {
      await this.showAlert('Information', 'Cette réservation a déjà été annulée.');
      return;
    }

    // Défense en profondeur : `canCancel` (calculé côté serveur) est false
    // aussi bien quand le voyage est trop proche (< 24h) que lorsqu'un billet
    // de cette réservation a déjà été validé à l'embarquement. Dans les deux
    // cas, on ne doit pas laisser l'utilisateur déclencher l'annulation.
    if (booking?.canCancel === false) {
      await this.showAlert(
        'Information',
        "Cette réservation ne peut plus être annulée (billet déjà embarqué ou délai dépassé).",
      );
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Annuler la réservation',
      message:
        'Êtes-vous sûr de vouloir annuler cette réservation ? Le remboursement sera traité par notre équipe.',
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
          await this.showAlert(
            'Succès',
            'Réservation annulée. Le remboursement est en cours de traitement.',
          );
          this.loadBookings();
        },
        error: async (err) => {
          console.error('Erreur annulation:', err);
          const message =
            err?.error?.error ||
            err?.error?.message ||
            "Erreur lors de l'annulation";
          await this.showAlert('Erreur', message);
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
   * Ouvrir la modale QR code avec les données déjà disponibles.
   * Verrouillé pour les réservations annulées : un billet annulé n'est plus
   * scannable, la modale QR ne doit donc jamais s'ouvrir pour lui.
   */
  async openQrModal(bookingId: number | string) {
    const booking = this.bookings.find((item) => item.id === Number(bookingId));

    if (booking && this.isCancelled(booking)) {
      await this.showAlert(
        'Billet annulé',
        'Ce billet a été annulé et ne peut plus être scanné.',
      );
      return;
    }

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
   * Voir les détails d'un billet.
   * Verrouillé pour les réservations annulées (cf. viewDetails()).
   */
  viewTicketDetails(bookingId: number) {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (booking) {
      this.viewDetails(booking);
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