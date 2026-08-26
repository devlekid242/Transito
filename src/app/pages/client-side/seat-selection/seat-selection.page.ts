import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonSpinner, NavController, LoadingController, AlertController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { TripService } from '../../../services/trip.service';
import { BookingService } from '../../../services/booking.service';

interface Seat {
  number: string;
  row: number;
  column: string;
  status: 'available' | 'occupied' | 'selected';
  type: 'normal' | 'wheelchair' | 'premium';
}

@Component({
  selector: 'app-seat-selection',
  templateUrl: './seat-selection.page.html',
  styleUrls: ['./seat-selection.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonSpinner, CommonModule],
})
export class SeatSelectionPage implements OnInit {
  tripId!: string;
  busType: string = 'standard'; // standard, vip, minibus
  seats: Seat[] = [];
  selectedSeats: Seat[] = [];
  totalSeats: number = 0;
  bookedSeats: number = 0;
  availableSeats: number = 0;
  isLoading = false;

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private tripService: TripService,
    private bookingService: BookingService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit() {
    this.tripId = this.route.snapshot.paramMap.get('tripId') || '';
    this.loadSeatMap();
  }

  private async loadSeatMap() {
    this.isLoading = true;
    const loader = await this.loadingCtrl.create({
      message: 'Chargement des sièges...',
    });
    await loader.present();

    this.tripService.getTripDetail(parseInt(this.tripId)).subscribe({
      next: (trip: any) => {
        this.busType = trip.busType || 'standard';
        this.generateSeatMap(trip);
        this.isLoading = false;
        loader.dismiss();
      },
      error: (err) => {
        console.error('Erreur chargement trajets:', err);
        this.isLoading = false;
        loader.dismiss();
        this.showAlert('Erreur', 'Impossible de charger la carte des sièges');
      },
    });
  }

  private generateSeatMap(trip: any) {
    this.seats = [];
    const bookedSeatsNumbers = trip.bookedSeats || [];
    let seatCounter = 1;

    // Configurations par type de bus
    const busConfig = {
      standard: { rows: 12, columns: 2 }, // 24 sièges
      vip: { rows: 10, columns: 2 }, // 20 sièges
      minibus: { rows: 8, columns: 2 }, // 16 sièges
    };

    const config = busConfig[this.busType as keyof typeof busConfig] || busConfig.standard;

    for (let row = 1; row <= config.rows; row++) {
      for (let col = 0; col < config.columns; col++) {
        const column = col === 0 ? 'A' : 'B';
        const seatNumber = `${row}${column}`;

        const seat: Seat = {
          number: seatNumber,
          row,
          column,
          status: bookedSeatsNumbers.includes(seatNumber) ? 'occupied' : 'available',
          type: row === 1 ? 'premium' : 'normal',
        };

        this.seats.push(seat);
        seatCounter++;
      }
    }

    this.totalSeats = this.seats.length;
    this.bookedSeats = bookedSeatsNumbers.length;
    this.availableSeats = this.totalSeats - this.bookedSeats;
  }

  selectSeat(seat: Seat) {
    if (seat.status === 'occupied') {
      this.showAlert('Siège indisponible', 'Ce siège est déjà réservé');
      return;
    }

    const isSelected = this.selectedSeats.some((s) => s.number === seat.number);

    if (isSelected) {
      this.selectedSeats = this.selectedSeats.filter((s) => s.number !== seat.number);
      seat.status = 'available';
    } else {
      if (this.selectedSeats.length >= 6) {
        this.showAlert('Limite atteinte', 'Vous pouvez sélectionner maximum 6 sièges');
        return;
      }
      this.selectedSeats.push(seat);
      seat.status = 'selected';
    }
  }

  getSeatPrice(seat: Seat): number {
    // Prix différent selon le type
    if (seat.type === 'premium') return 15000; // FCFA
    if (seat.type === 'wheelchair') return 10000; // FCFA
    return 12000; // Siège normal - FCFA
  }

  getTotalPrice(): number {
    return this.selectedSeats.reduce((sum, seat) => sum + this.getSeatPrice(seat), 0);
  }

  confirmSeats() {
    if (this.selectedSeats.length === 0) {
      this.showAlert('Erreur', 'Veuillez sélectionner au moins un siège');
      return;
    }

    const seatNumbers = this.selectedSeats.map((s) => s.number);
    const totalPrice = this.getTotalPrice();

    this.navCtrl.navigateForward(`/booking-form/${this.tripId}`, {
      queryParams: {
        seats: seatNumbers.join(','),
        totalPrice,
      },
    });
  }

  goBack() {
    this.navCtrl.navigateBack('/search-results');
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  getRowSeats(row: number): Seat[] {
    return this.seats.filter((s) => s.row === row);
  }

  getSeatIcon(seat: Seat): string {
    if (seat.status === 'occupied') return 'close';
    if (seat.status === 'selected') return 'checkmark';
    if (seat.type === 'wheelchair') return 'accessibility';
    return 'event_seat';
  }

  getSeatColor(seat: Seat): string {
    if (seat.status === 'occupied') return 'medium';
    if (seat.status === 'selected') return 'success';
    if (seat.type === 'wheelchair') return 'warning';
    if (seat.type === 'premium') return 'primary';
    return 'secondary';
  }
}
