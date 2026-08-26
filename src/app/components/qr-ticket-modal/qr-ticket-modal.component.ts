import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonContent, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-qr-ticket-modal',
  templateUrl: './qr-ticket-modal.component.html',
  styleUrls: ['./qr-ticket-modal.component.scss'],
  standalone: true,
  imports: [IonHeader, IonContent, CommonModule],
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
      this.qrCodeUrl = this.generateQrCode(this.qrCodeData || this.bookingId);
    }
  }

  private generateQrCode(data: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
  }

  downloadQr() {
    const link = document.createElement('a');
    link.href = this.qrCodeUrl;
    link.download = `ticket-${this.bookingId}.png`;
    link.click();
  }

  printQr() {
    const printWindow = window.open('', '', 'width=600,height=700');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Billet - ${this.bookingId}</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
              .ticket { border: 2px solid #333; padding: 20px; display: inline-block; }
              h2 { margin-bottom: 20px; }
              img { max-width: 100%; }
            </style>
          </head>
          <body>
            <div class="ticket">
              <h2>Votre Billet</h2>
              <img src="${this.qrCodeUrl}" alt="QR Code">
              <p><strong>Référence:</strong> ${this.bookingId}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
