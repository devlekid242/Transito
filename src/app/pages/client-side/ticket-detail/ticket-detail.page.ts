import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonicModule,
  NavController,
  LoadingController,
  AlertController,
  ModalController,
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
  seatNumber: string;
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
export class TicketDetailPage implements OnInit {
  ticket: TicketInfo = {
    id: 'TKT-0000',
    ticketNumber: 'TKT-0000',
    agencyName: 'Agence Transito',
    origin: 'N/A',
    destination: 'N/A',
    departureDate: '',
    departureTime: '',
    arrivalTime: '',
    seatNumber: 'N/A',
    ticketClass: 'Standard',
    price: 0,
    status: 'En attente',
    canCancel: false,
  };
  isLoading = true;

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

    if (itemId) {
      this.loadTicket(itemId);
    } else {
      this.isLoading = false;
    }
  }

  private async loadTicket(itemId: number) {
    this.isLoading = true;
    this.ticketService.getTicket(itemId).subscribe({
      next: (ticket) => {
        this.mapTicket(ticket);
        this.isLoading = false;
      },
      error: async () => {
        this.bookingService.getBookingDetail(itemId).subscribe({
          next: (booking) => {
            this.mapBookingAsTicket(booking);
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
    this.ticket = {
      id: ticket.ticketNumber,
      ticketNumber: ticket.ticketNumber,
      agencyName: ticket.agenceName || 'Agence',
      origin: ticket.departureCity,
      destination: ticket.arrivalCity,
      departureDate: ticket.departureDate,
      departureTime: new Date(ticket.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      arrivalTime: new Date(ticket.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      seatNumber: ticket.seatNumber,
      ticketClass: ticket.status,
      price: ticket.price || 0,
      status: ticket.status,
      canCancel: this.checkCancellationEligibility(
        ticket.departureDate,
        ticket.departureTime,
      ),
    };
  }

  private mapBookingAsTicket(booking: any) {
    this.ticket = {
      id: `TKT-${booking.id}`,
      ticketNumber: `TKT-${booking.id}`,
      agencyName: booking.trip?.agencyName || 'Agence',
      origin: booking.trip?.departureCity || 'N/A',
      destination: booking.trip?.arrivalCity || 'N/A',
      departureDate: booking.trip?.departureDate || booking.bookingDate,
      departureTime: booking.trip?.departureTime || '',
      arrivalTime: booking.trip?.arrivalTime || '',
      seatNumber: booking.seatNumber || 'N/A',
      ticketClass: booking.trip?.pricePerSeat ? 'Standard' : 'Standard',
      price: booking.totalPrice || 0,
      status: booking.status || 'Confirmé',
      canCancel: this.checkCancellationEligibility(
        booking.trip?.departureDate || booking.bookingDate,
        booking.trip?.departureTime || '',
      ),
    };
  }

  private checkCancellationEligibility(
    departureDate: string,
    departureTime: string,
  ) {
    if (!departureDate || !departureTime) {
      return false;
    }
    const departure = new Date(`${departureDate}T${departureTime}:00`);
    const now = new Date();
    return departure.getTime() - now.getTime() > 24 * 60 * 60 * 1000;
  }

  async cancelReservation() {
    if (!this.ticket.canCancel) {
      await this.showAlert(
        'Information',
        'L’annulation doit être effectuée au moins 24h avant l’embarquement.',
      );
      return;
    }
    await this.showAlert(
      'Succès',
      `La réservation ${this.ticket.ticketNumber} a été annulée.`,
    );
    this.navCtrl.navigateRoot('/tabs/reservation');
  }

  async showQr() {
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

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }
}
