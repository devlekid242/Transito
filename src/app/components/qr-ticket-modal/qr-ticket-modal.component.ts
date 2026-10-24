import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonContent, ModalController } from '@ionic/angular';
import { QRCodeComponent } from 'angularx-qrcode';

interface QrTicket {
  ticketNumber: string;
  seatNumber: number | string;
  passengerName: string;
  qrCodeToken: string | null;
  status: string;
}

@Component({
  selector: 'app-qr-ticket-modal',
  templateUrl: './qr-ticket-modal.component.html',
  styleUrls: ['./qr-ticket-modal.component.scss'],
  standalone: true,
  imports: [IonHeader, IonContent, QRCodeComponent, CommonModule],
})
export class QrTicketModalComponent {
  @Input() tickets: QrTicket[] = [];
  @Input() reservationStatus = '';
  @Input() hasRefund = false;
  @Input() ticketDetails: any = null;
  selectedTicketIndex = 0;

  constructor(private modalCtrl: ModalController) {}

  get selectedTicket(): QrTicket | undefined {
    return this.tickets[this.selectedTicketIndex];
  }

  get canShowSelectedQr(): boolean {
    return this.reservationStatus === 'Confirmé'
      && !this.hasRefund
      && this.selectedTicket?.status === 'En attente'
      && !!this.selectedTicket.qrCodeToken?.trim();
  }

  get selectedTicketUnavailableMessage(): string {
    if (this.hasRefund) return 'Remboursement en cours ou effectué : aucun QR disponible.';
    if (this.reservationStatus !== 'Confirmé') {
      return `État de la réservation : ${this.reservationStatus || 'inconnu'}. Aucun QR disponible.`;
    }
    if (this.selectedTicket?.status !== 'En attente') {
      return `État du billet : ${this.selectedTicket?.status || 'inconnu'}. Aucun QR disponible.`;
    }
    return 'Billet indisponible, actualisez ou contactez le support.';
  }

  get emptyTicketsMessage(): string {
    if (this.hasRefund) return 'Remboursement en cours ou effectué : aucun QR disponible.';
    if (this.reservationStatus !== 'Confirmé') {
      return `État de la réservation : ${this.reservationStatus || 'inconnu'}. Aucun QR disponible.`;
    }
    return 'Billet indisponible, actualisez ou contactez le support.';
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
