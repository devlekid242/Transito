import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonicModule,
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
  qrCode?: string;
  createdAt?: string;
  ticketClass: string;
  price: number;
  status: string;
  canCancel: boolean;
}

@Component({
  selector: 'app-ticket-detail',
  templateUrl: './ticket-detail.page.html',
  styleUrls: ['./ticket-detail.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
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
    ticketClass: 'Standard',
    price: 0,
    status: 'En attente',
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
    return this.ticket.status === 'Annulé' || this.ticket.status === 'Remboursé';
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
      ticketClass: ticket.status,
      // L'API ne renvoie déjà plus de QR code pour un billet annulé, mais on
      // verrouille aussi côté client par sécurité.
      qrCode: isCancelled ? '' : ticket.qrCode,
      passengerName: ticket.passengerName || '',
      passengerPhone: ticket.passengerPhone || '',
      price: ticket.price || 0,
      createdAt: new Date(ticket.createdAt).toLocaleDateString('fr-FR'),
      status: ticket.status,
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
    const status = booking.status || 'Confirmé';
    const isCancelled = status === 'Annulé' || status === 'Remboursé';
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
      passengerName: booking.passengerName || '',
      passengerPhone: booking.passengerPhone || '',
      // Une réservation annulée n'a plus de QR exploitable, quelle que soit la
      // valeur renvoyée par le backend.
      qrCode: isCancelled ? '' : booking.tickets?.[0]?.qrCodeToken || '',
      ticketClass: booking.trip?.pricePerSeat ? 'Standard' : 'Standard',
      price: booking.totalPrice || 0,
      status,
      canCancel:
        !isCancelled &&
        status !== 'Expiré' &&
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
    // Verrou défensif : un billet annulé ne doit jamais pouvoir afficher son QR.
    if (this.isCancelled) return;

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

  goBack() {
    this.navCtrl.back();
  }

  // À insérer dans votre classe TicketDetailPage
  printTicket() {
    // Un billet annulé ne doit plus pouvoir être imprimé / exporté en PDF.
    if (this.isCancelled) return;
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