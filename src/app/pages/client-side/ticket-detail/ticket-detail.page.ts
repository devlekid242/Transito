import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader,
  NavController,
  LoadingController,
  AlertController,
  ModalController,
  ViewWillEnter,   // 👈 nouveau
  ViewWillLeave,   // 👈 nouveau (optionnel, pour le nettoyage)
} from '@ionic/angular';
import { TicketService } from '../../../services/ticket.service';
import { BookingService } from '../../../services/booking.service';
import { Ticket } from '../../../models';
import { QrTicketModalComponent } from '../../../components/qr-ticket-modal/qr-ticket-modal.component';

interface TicketInfo {
  id: string;
  ticketNumber: string;
  agencyName: string;
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  passengerName?: string;
  passengerPhone?: string;
  seatNumber: string;
  /** Point d'embarquement choisi par le client à la réservation (Reservation::boardingPoint). */
  boardingPoint?: string | null;
  /** Point de débarquement choisi par le client à la réservation (Reservation::deboardingPoint). */
  deboardingPoint?: string | null;
  qrCode?: string;
  createdAt?: string;
  ticketClass: string;
  price: number;
  /** Statut du BILLET (tickets[].status côté API) : En attente, Utilisé, Annulé... */
  status: string;
  /** Statut du PAIEMENT/RÉSERVATION (status côté racine de l'API) : En attente, Payé, Expiré, Remboursé... */
  paymentStatus: string;
  /** Date limite de paiement (ISO), fournie tant que le paiement n'est pas confirmé. */
  paymentExpiresAt?: string | null;
  /** Non-null UNIQUEMENT si un paiement avait réellement été effectué avant l'annulation. */
  refund?: { status: string; amount: number | string } | null;
  canCancel: boolean;
}

@Component({
  selector: 'app-ticket-detail',
  templateUrl: './ticket-detail.page.html',
  styleUrls: ['./ticket-detail.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, CommonModule],
})
export class TicketDetailPage implements OnInit, ViewWillEnter, ViewWillLeave {
  ticket: TicketInfo = {
    id: 'TKT-0000',
    ticketNumber: 'TKT-0000',
    agencyName: 'Agence Transito',
    origin: 'N/A',
    destination: 'N/A',
    departureDate: '',
    departureTime: '',
    arrivalTime: '',
    passengerName: '',
    passengerPhone: '',
    qrCode: '',
    createdAt: '',
    seatNumber: 'N/A',
    boardingPoint: null,
    deboardingPoint: null,
    ticketClass: 'Standard',
    price: 0,
    status: 'En attente',
    paymentStatus: 'En attente',
    paymentExpiresAt: null,
    refund: null,
    canCancel: false,
  };
  isLoading = true;
  qrCodeUrl: string = '';
  isCancelling = false;
  
  ticketId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private ticketService: TicketService,
    private bookingService: BookingService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
  ) {}

  ngOnInit() {
    const ticketIdParam = this.route.snapshot.paramMap.get('id');
    const itemId = ticketIdParam ? Number(ticketIdParam) : null;

    ticketIdParam && !isNaN(Number(itemId)) ? (this.ticketId = itemId) : null;

    if (itemId) {
      this.loadTicket(itemId);
    } else {
      this.isLoading = false;
    }
  }

  ionViewWillEnter() {
    const ticketIdParam = this.route.snapshot.paramMap.get('id');
    const itemId = ticketIdParam ? Number(ticketIdParam) : null;

    ticketIdParam && !isNaN(Number(itemId)) ? (this.ticketId = itemId) : null;

    if (itemId) {
      this.loadTicket(itemId);
    } else {
      this.isLoading = false;
    }
  }

  ionViewWillLeave() {
    this.isLoading = false;
  }

  /**
   * Un billet annulé ou remboursé devient définitivement inutilisable :
   * pas de QR code, pas d'impression, pas de nouvelle annulation possible.
   * On se base sur le statut renvoyé par l'API (source de vérité), pas sur une
   * simple absence de données.
   */
  get isCancelled(): boolean {
    return (
      this.ticket.status === 'Annulé' ||
      this.ticket.status === 'Remboursé' ||
      this.ticket.paymentStatus === 'Remboursé'
    );
  }

  /**
   * Le paiement n'est pas encore confirmé par l'opérateur mobile money
   * (webhook/polling pas encore reçu). Le billet existe déjà côté back
   * mais ne doit pas encore servir à l'embarquement.
   */
  get isPaymentPending(): boolean {
    return (
      !this.isCancelled &&
      (this.ticket.paymentStatus === 'En attente' ||
        this.ticket.paymentStatus === 'En cours' ||
        this.ticket.paymentStatus === 'Échoué')
    );
  }

  /** QR code et impression indisponibles tant que le paiement n'est pas confirmé. */
  get isLocked(): boolean {
    return this.isCancelled || this.isPaymentPending;
  }

  /**
   * Un remboursement n'est dû QUE si un paiement avait réellement été
   * effectué avant l'annulation (voir BookingController::cancel(), champ
   * `refund` non-null uniquement dans ce cas). Sans ça : annulation système
   * pour paiement jamais abouti (échec/expiration), ou annulation avant tout
   * paiement — dans les deux cas, rien n'a été débité, donc rien à rembourser.
   */
  get hasRefund(): boolean {
    return !!this.ticket.refund;
  }

  get isRefundCompleted(): boolean {
    return this.ticket.paymentStatus === 'Remboursé' || this.ticket.refund?.status === 'REFUNDED';
  }

  private async loadTicket(itemId: number) {
    this.isLoading = true;
    this.ticketService.getTicket(itemId).subscribe({
      next: (ticket) => {
        this.mapTicket(ticket);
        this.qrCodeUrl = this.ticket.qrCode
          ? this.buildQrCodeUrl(String(this.ticket.qrCode))
          : '';
        this.isLoading = false;
      },
      error: async () => {
        this.bookingService.getBookingDetail(itemId).subscribe({
          next: (booking) => {
            this.mapBookingAsTicket(booking);
            this.qrCodeUrl = this.ticket.qrCode
              ? this.buildQrCodeUrl(String(this.ticket.qrCode))
              : '';
            this.isLoading = false;
          },
          error: async (err) => {
            this.isLoading = false;
            console.error(
              'Impossible de charger le ticket ou la réservation',
              err,
            );
            await this.showAlert('Erreur', 'Impossible de charger le ticket.');
            this.goBack();
          },
        });
      },
    });
  }

  private mapTicket(ticket: Ticket) {
    const status = ticket.status;
    const isCancelled = status === 'Annulé' || status === 'Remboursé';
    // ⚠️ Cette route (TicketService.getTicket) ne renvoie peut-être pas
    // encore de paymentStatus dédié. On l'utilise s'il existe, sinon on
    // retombe sur ticket.status pour ne rien casser — mais idéalement le
    // back devrait exposer le même couple (status billet / paymentStatus)
    // que /bookings/{id}, à vérifier.
    const paymentStatus = (ticket as any).paymentStatus || ticket.status;

    this.ticket = {
      id: ticket.ticketNumber,
      ticketNumber: ticket.ticketNumber,
      agencyName: ticket.agenceName || 'Agence',
      origin: ticket.departureCity,
      destination: ticket.arrivalCity,
      departureDate: ticket.departureDate,
      departureTime: new Date(ticket.departureTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      arrivalTime: new Date(ticket.arrivalTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      seatNumber: ticket.seatNumber,
      boardingPoint: (ticket as any).boardingPoint ?? null,
      deboardingPoint: (ticket as any).deboardingPoint ?? null,
      ticketClass: ticket.status,
      // L'API ne renvoie déjà plus de QR code pour un billet annulé, mais on
      // verrouille aussi côté client par sécurité.
      qrCode: isCancelled ? '' : ticket.qrCode,
      passengerName: ticket.passengerName || '',
      passengerPhone: ticket.passengerPhone || '',
      price: ticket.price || 0,
      createdAt: new Date(ticket.createdAt).toLocaleDateString('fr-FR'),
      status: ticket.status,
      paymentStatus,
      paymentExpiresAt: (ticket as any).paymentExpiresAt ?? null,
      refund: (ticket as any).refund ?? null,
      // Important : on calcule l'éligibilité à partir de l'heure de départ brute
      // (ISO), AVANT tout formatage local, et jamais pour un billet déjà annulé
      // ou déjà utilisé.
      canCancel:
        !isCancelled &&
        status !== 'Utilisé' &&
        this.isCancellableFromRawDeparture(ticket.departureTime),
    };
  }

  private mapBookingAsTicket(booking: any) {
    // ⚠️ booking.status est le statut du PAIEMENT/de la réservation
    // ("En attente", "Payé", "Expiré", "Remboursé"...), PAS celui du billet.
    // Le statut du billet lui-même vit dans booking.tickets[].status
    // ("En attente", "Utilisé", "Annulé"...). Les deux se recoupent souvent
    // en valeur ("En attente" existe des deux côtés) mais représentent des
    // choses différentes — d'où la confusion à l'origine du bug.
    const paymentStatus: string = booking.status || 'En attente';
    const ticketStatus: string = booking.tickets?.[0]?.status || paymentStatus;
    const isCancelled = ticketStatus === 'Annulé' || ticketStatus === 'Remboursé' || paymentStatus === 'Remboursé';
    const rawDepartureTime = booking.trip?.departureTime;
    // Le statut de la réservation (Confirmé/Expiré/Annulé) ne reflète pas
    // qu'un billet individuel a déjà été scanné à l'embarquement : il faut
    // vérifier explicitement le statut de chaque billet lié, sinon un billet
    // déjà utilisé reste "annulable" côté front tant que le voyage n'est pas
    // encore expiré.
    const hasBoardedTicket = (booking.tickets || []).some(
      (t: any) => t.status === 'Utilisé',
    );

    this.ticket = {
      id: `TKT-${booking.id}`,
      ticketNumber: `TKT-${booking.id}`,
      agencyName: booking.trip?.agencyName || 'Agence',
      origin: booking.trip?.departureCity || 'N/A',
      destination: booking.trip?.arrivalCity || 'N/A',
      departureDate: new Date(booking.trip?.departureDate).toLocaleDateString(
        'fr-FR',
        { day: '2-digit', month: '2-digit', year: 'numeric' },
      ),
      departureTime:
        new Date(booking.trip?.departureTime).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }) || '',
      arrivalTime:
        new Date(booking.trip?.arrivalTime).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }) || '',
      seatNumber: booking.seatNumber || 'N/A',
      boardingPoint: booking.boardingPoint ?? null,
      deboardingPoint: booking.deboardingPoint ?? null,
      passengerName: booking.passengerName || '',
      passengerPhone: booking.passengerPhone || '',
      // Une réservation annulée n'a plus de QR exploitable, quelle que soit la
      // valeur renvoyée par le backend. Le QR reste aussi verrouillé tant que
      // le paiement n'est pas confirmé (voir isPaymentPending / isLocked).
      qrCode: isCancelled ? '' : booking.tickets?.[0]?.qrCodeToken || '',
      ticketClass: booking.trip?.pricePerSeat ? 'Standard' : 'Standard',
      price: booking.totalPrice || 0,
      status: ticketStatus,
      paymentStatus,
      paymentExpiresAt: booking.paymentExpiresAt ?? null,
      refund: booking.refund ?? null,
      createdAt: new Date(booking.createdAt).toLocaleDateString('FR-fr', {
        weekday: 'long',
        day: 'numeric',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      canCancel:
        !isCancelled &&
        paymentStatus !== 'Expiré' &&
        !hasBoardedTicket &&
        (booking.canCancel ?? this.isCancellableFromRawDeparture(rawDepartureTime)),
    };
  }

  /**
   * Calcule l'éligibilité à l'annulation à partir d'une date de départ ISO brute
   * (avant tout formatage local). Remplace l'ancien calcul qui re-parsait une
   * heure déjà formatée ("14:30") via `new Date(...)`, ce qui produisait une
   * date invalide et faussait le résultat.
   */
  private isCancellableFromRawDeparture(rawDepartureIso?: string | null): boolean {
    if (!rawDepartureIso) return false;
    const departure = new Date(rawDepartureIso);
    if (isNaN(departure.getTime())) return false;

    const now = new Date();
    const diffHours = (departure.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours > 24;
  }

  async cancelReservation() {
    if (this.isCancelled) {
      await this.showAlert('Information', 'Cette réservation a déjà été annulée.');
      return;
    }
    if (!this.ticket.canCancel) {
      const message =
        this.ticket.status === 'Utilisé'
          ? 'Ce billet a déjà été validé à l’embarquement, il ne peut plus être annulé.'
          : 'L’annulation doit être effectuée au moins 24h avant l’embarquement.';
      await this.showAlert('Information', message);
      return;
    }
    this.isCancelling = true;
    try{
      const alert = await this.alertCtrl.create({
        header: 'Confirmer l’annulation',
        message: 'Êtes-vous sûr de vouloir annuler cette réservation ? Le remboursement sera traité par notre équipe.',
        
        buttons: [
          {
            text: 'Annuler',
            role: 'cancel',
            handler: () => {
              this.isCancelling = false;
            }
          },
          {
            text: 'Confirmer',
            handler: async () => {
              try {
                await this.bookingService.cancelBooking(Number(this.ticketId)).toPromise();
                // Reload ticket data from backend to get the actual status (could be 'Annulé' or 'Remboursé')
                if (this.ticketId) {
                  await this.loadTicket(this.ticketId);
                }
                await this.showAlert(
                  'Annulation réussie',
                  'Votre réservation a été annulée. Le remboursement est en cours de traitement.',
                );
                
                this.navCtrl.navigateForward(['/tabs/reservation']);
              } catch (error: any) {
                console.error('Erreur lors de l’annulation:', error);
                const message =
                  error?.error?.error ||
                  error?.error?.message ||
                  'Une erreur est survenue lors de l’annulation de la réservation.';
                await this.showAlert('Erreur', message);
              } finally {
                this.isCancelling = false;
              }
            }
          }
        ]
      });
      await alert.present();
    }catch (error) {
      console.error('Erreur lors de l’annulation:', error);
      await this.showAlert(
        'Erreur',
        'Une erreur est survenue lors de l’annulation de la réservation.'
      );
    } finally {
      this.isCancelling = false;
    }
  }

  async showQr() {
    // Verrou défensif : un billet annulé, remboursé ou pas encore payé ne
    // doit jamais pouvoir afficher son QR (il ne peut pas encore servir à
    // l'embarquement).
    if (this.isLocked) return;

    const qrValue = this.ticket.ticketNumber || this.ticket.id;
    const modal = await this.modalCtrl.create({
      component: QrTicketModalComponent,
      componentProps: {
        bookingId: this.ticket.ticketNumber,
        qrCodeData: qrValue,
        qrCodeUrl: this.buildQrCodeUrl(qrValue),
        ticketDetails: {
          departureCity: this.ticket.origin,
          departureTime: this.ticket.departureTime,
          duration: '',
          arrivalCity: this.ticket.destination,
          arrivalTime: this.ticket.arrivalTime,
          passengerName: '',
          seatNumber: this.ticket.seatNumber,
          travelDate: this.ticket.departureDate,
        },
      },
    });

    await modal.present();
  }

  private buildQrCodeUrl(value: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(value)}`;
  }

  /** Libellé humain pour le bandeau/bloc de statut de paiement. */
  getPaymentStatusLabel(): string {
    switch (this.ticket.paymentStatus) {
      case 'Payé':
      case 'Confirmé':
        return 'Payé / Confirmé';
      case 'En attente':
        return 'En attente de confirmation';
      case 'En cours':
        return 'Paiement en cours de traitement';
      case 'Échoué':
        return 'Paiement échoué';
      case 'Expiré':
        return 'Paiement expiré';
      case 'Remboursé':
        return 'Remboursé';
      default:
        return this.ticket.paymentStatus;
    }
  }

  /** Classes Tailwind pour le bloc financier, selon le statut de paiement. */
  getPaymentStatusClasses(): string {
    switch (this.ticket.paymentStatus) {
      case 'Payé':
      case 'Confirmé':
        return 'bg-green-50 border-green-500 text-green-700 [&_.payment-value]:text-green-600';
      case 'En cours':
      case 'En attente':
        return 'bg-amber-50 border-amber-500 text-amber-700 [&_.payment-value]:text-amber-600';
      case 'Échoué':
      case 'Expiré':
        return 'bg-red-50 border-red-500 text-red-700 [&_.payment-value]:text-red-600';
      case 'Remboursé':
        return 'bg-slate-100 border-slate-400 text-slate-600 [&_.payment-value]:text-slate-600';
      default:
        return 'bg-amber-50 border-amber-500 text-amber-700 [&_.payment-value]:text-amber-600';
    }
  }

  /** Échéance de paiement formatée (heure locale), affichée dans le bandeau d'alerte. */
  get paymentExpiresAtLabel(): string | null {
    if (!this.ticket.paymentExpiresAt) return null;
    const date = new Date(this.ticket.paymentExpiresAt);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  goBack() {
    this.navCtrl.back();
  }

  // À insérer dans votre classe TicketDetailPage
  printTicket() {
    // Un billet annulé ou pas encore payé ne doit pas pouvoir être imprimé / exporté en PDF.
    if (this.isLocked) return;
    window.print();
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }
}