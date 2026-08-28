import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonContent, ModalController } from '@ionic/angular';
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  selector: 'app-qr-ticket-modal',
  templateUrl: './qr-ticket-modal.component.html',
  styleUrls: ['./qr-ticket-modal.component.scss'],
  standalone: true,
  imports: [IonHeader, IonContent, QRCodeComponent, CommonModule],
})
export class QrTicketModalComponent implements OnInit {
  @Input() bookingId!: string;
  @Input() qrCodeUrl: string = '';
  @Input() qrCodeData: string = '';
  @Input() ticketDetails: any = null;
  isLoading = false;

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    if (!this.ticketDetails) {
      this.ticketDetails = {
        departureCity: '',
        departureTime: '',
        duration: '',
        arrivalCity: '',
        arrivalTime: '',
        passengerName: '',
        seatNumber: '',
        travelDate: '',
      };
    }

    if (!this.qrCodeUrl && (this.qrCodeData || this.bookingId)) {
      this.qrCodeUrl = this.qrCodeData || this.bookingId;
    }
  }



  close() {
    this.modalCtrl.dismiss();
  }
}
