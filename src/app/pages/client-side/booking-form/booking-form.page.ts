import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  IonicModule,
  NavController,
  LoadingController,
  AlertController,
} from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  Trip,
  Passenger,
  Baggage,
  BookingRequest,
  PaymentRequest,
  User,
} from '../../../models';
import {
  TripService,
  BookingService,
  UserService,
  PaymentService,
} from '../../../services';

@Component({
  selector: 'app-booking-form',
  templateUrl: './booking-form.page.html',
  styleUrls: ['./booking-form.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
})
export class BookingFormPage implements OnInit, OnDestroy {
  trip: Trip | null = null;
  tripId = 0;
  currentUser: User | null = null;
  stepNumber = 1;

  passengers: Passenger[] = [];
  baggages: Baggage[] = [];
  phoneNumber = '';

  // Alignement Backend : Enumération des méthodes de paiement
  selectedOperator: 'MTN_MOMO' | 'AIRTEL_MONEY' | null = null;

  tripDetails: any = {
    origin: '',
    destination: '',
    departureDate: '',
    departureTime: '',
    arrivalTime: '',
    agencyName: '',
    agencyLogo: '',
    serviceFee: 500,
    busLicensePlate: '',
  };

  boardingPoints: any[] = [];
  selectedBoardingPoint = '';
  deboardingPoints: any[] = [];
  selectedDeboardingPoint = '';

  ticketSubtotal = 0;
  totalAmountToPay = 0;
  bookingId: number | null = null;
  paymentLogId: number | null = null;
  transactionId: string | null = null;
  generatedTicket: any = null;

  // Un billet par passager (nom + téléphone imprimés sur chaque billet)
  tickets: Array<{
    ticketNumber: string;
    seat: number | string;
    qr: string;
    passengerName: string;
    passengerPhone: string;
  }> = [];
  private rawBookingTickets: any[] = [];

  isLoading = false;
  isPaymentLoading = false;
  paymentStep: 'initiate' | 'confirming' | 'confirmed' = 'initiate';
  private destroy$ = new Subject<void>();

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private route: ActivatedRoute,
    private tripService: TripService,
    private bookingService: BookingService,
    private userService: UserService,
    private paymentService: PaymentService,
  ) {}

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData() {
    this.isLoading = true;
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.tripId = Number(params['tripId']);
      if (this.tripId) {
        this.loadTrip();
      } else {
        this.isLoading = false;
      }
    });

    this.userService
      .getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          this.prepareDefaultPassenger();
        },
        error: () => this.prepareDefaultPassenger(),
      });
  }

  private loadTrip() {
    this.tripService
      .getTripDetail(this.tripId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (trip) => {
          this.trip = trip;
          this.tripDetails = {
            origin: trip.departureCity,
            destination: trip.arrivalCity,
            departureDate: new Date(trip.departureDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            departureTime: new Date(trip.departureTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            arrivalTime: new Date(trip.estimatedArrivalTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            serviceFee: 500, // Frais de plateforme standardisés
            // Champs optionnels selon ce que renvoie l'API trajet ; utilisés pour
            // enrichir le reçu (nom d'agence, immatriculation du bus).
            agencyName: (trip as any).agency?.name || (trip as any).agencyName || '',
            busLicensePlate:
              (trip as any).bus?.registrationNumber ||
              (trip as any).busLicensePlate ||
              '',
          };

          // Extraction JSON des points d'arrêt
          this.boardingPoints = trip.boardingPoints?.length
            ? trip.boardingPoints
            : [trip.departureCity + ' - Gare Centrale'];
          this.selectedBoardingPoint =
            this.boardingPoints[0].name || this.boardingPoints[0];

          this.deboardingPoints = trip.deboardingPoints?.length
            ? trip.deboardingPoints
            : [trip.arrivalCity + ' - Gare Centrale'];
          this.selectedDeboardingPoint =
            this.deboardingPoints[0].name || this.deboardingPoints[0];

          this.updateTotals();
          this.isLoading = false;
        },
        error: async (err) => {
          this.isLoading = false;
          await this.showAlert(
            'Erreur',
            'Impossible de charger les détails du trajet.',
          );
          this.goBack();
        },
      });
  }

  private prepareDefaultPassenger() {
    if (this.currentUser && this.passengers.length === 0) {
      this.passengers = [
        {
          fullName: this.currentUser.fullName || '',
          phoneNumber: this.currentUser.phoneNumber || '',
          // identityNumber: (this.currentUser as any).identityNumber || '', // CNI mapping
          isMainPassenger: true,
          email: this.currentUser.email || '',
        },
      ];
      this.phoneNumber = this.currentUser.phoneNumber.replace("+242", "") || ''; // Pré-remplir le numéro de paiement
      this.updateTotals();
    }
  }

  addPassenger() {
    this.passengers.push({
      fullName: '',
      phoneNumber: '',
      // identityNumber: '',
      isMainPassenger: false,
      email: '',
    });
    this.updateTotals();
  }

  removePassenger(index: number) {
    this.passengers.splice(index, 1);
    this.updateTotals();
  }

  // --- Gestion des bagages (Aligné avec l'entité Baggage) ---
  addBaggage() {
    this.baggages.push({
      weight: 0,
      baggageType: 'Bagage en soute',
      description: '',
    });
  }

  removeBaggage(index: number) {
    this.baggages.splice(index, 1);
  }

  updateTotals() {
    this.ticketSubtotal = this.trip
      ? this.passengers.length * this.trip.pricePerSeat
      : 0;
    this.totalAmountToPay = this.ticketSubtotal + this.tripDetails.serviceFee;
  }

  async processPayment() {
    // Validations strictes
    const invalidPassenger = this.passengers.find(
      (p) => !p.fullName || !p.phoneNumber,
    );
    if (invalidPassenger) {
      await this.showAlert(
        'Champs requis',
        "Veuillez remplir le nom, numéro de téléphone et N° de pièce d'identité pour tous les passagers.",
      );
      return;
    }
    if (!this.selectedOperator) {
      await this.showAlert(
        'Opérateur',
        'Veuillez sélectionner MTN MoMo ou Airtel Money.',
      );
      return;
    }
    if (!this.phoneNumber) {
      await this.showAlert(
        'Téléphone',
        'Veuillez saisir le numéro de facturation mobile money.',
      );
      return;
    }

    this.isPaymentLoading = true;
    this.paymentStep = 'initiate';

    // Construction du payload aligné sur la méthode API create_booking
    const bookingRequest: BookingRequest = {
      tripId: this.trip!.id,
      passengers: this.passengers,
      baggages: this.baggages,
      totalPrice: this.totalAmountToPay,
      paymentPhone: '+242'+this.phoneNumber,
      paymentMethod: this.selectedOperator,
      boardingPoint: this.selectedBoardingPoint,
      deboardingPoint: this.selectedDeboardingPoint,
    };

    // Étape 1 : Créer la réservation d'abord
    this.bookingService
      .createBooking(bookingRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bookingResponse) => {
          this.bookingId = bookingResponse.reservationId || bookingResponse.id;
          // Le backend renvoie un ticket par passager (nom, téléphone, siège, QR, n° billet)
          this.rawBookingTickets = bookingResponse.tickets || [];

          // Étape 2 : Initier le paiement
          const paymentRequest: PaymentRequest = {
            reservationId: Number(this.bookingId),
            amount: this.totalAmountToPay,
            paymentMethod: this.selectedOperator as 'MTN_MOMO' | 'AIRTEL_MONEY',
          };

          this.paymentService
            .initiatePayment(paymentRequest)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (paymentResponse) => {
                this.transactionId = paymentResponse.transactionId;
                this.paymentLogId = Number(paymentResponse.paymentLogId);
                this.paymentStep = 'confirming';

                // Étape 3 : Confirmer le paiement
                // En production, cela viendrait d'un webhooks de l'opérateur GSM
                // Pour la démo, on le confirme après un délai
                setTimeout(() => {
                  this.confirmPaymentTransaction();
                }, 2000);
              },
              error: async (err) => {
                this.isPaymentLoading = false;
                await this.showAlert(
                  'Erreur de paiement',
                  "Impossible d'initier le paiement. Veuillez réessayer.",
                );
              },
            });
        },
        error: async (err) => {
          this.isPaymentLoading = false;
          await this.showAlert(
            'Erreur de réservation',
            err?.error?.message || 'Impossible de créer la réservation.',
          );
        },
      });
  }

  private confirmPaymentTransaction() {
    if (!this.transactionId) {
      this.showAlert('Erreur', 'ID de transaction manquant');
      return;
    }

    this.paymentService
      .confirmPayment(this.transactionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (confirmResponse) => {
          this.paymentStep = 'confirmed';

          // Paiement confirmé, afficher le(s) ticket(s)
          setTimeout(() => {
            this.isPaymentLoading = false;
            this.generatedTicket = {
              ticketNumber: `TKT-${this.bookingId}`,
              ticketClass: this.trip?.category,
              transactionId: this.transactionId,
              paymentStatus: 'Confirmé',
            };

            // Un billet par passager : on associe la donnée backend (siège, QR, n° billet)
            // à la donnée locale (nom, téléphone) via le n° CNI en priorité, sinon par ordre.
            this.tickets = this.passengers.map((passenger, index) => {
              const backendTicket =
                this.rawBookingTickets.find(
                  (t) => t.passengerCni && t.passengerCni === passenger.identityNumber,
                ) || this.rawBookingTickets[index];

              return {
                ticketNumber:
                  backendTicket?.ticketNumber || `TKT-${this.bookingId}-${index + 1}`,
                seat: backendTicket?.seat ?? index + 1,
                qr: this.generateQrCode(backendTicket?.qr) || backendTicket?.qr || '',
                passengerName: passenger.fullName,
                passengerPhone: passenger.phoneNumber,
              };
            });

            // Générer les codes QR pour chaque ticket

            this.stepNumber = 3; // Navigation vers le ticket
          }, 1000);
        },
        error: async (err) => {
          this.isPaymentLoading = false;
          // Si la confirmation échoue, l'utilisateur peut réessayer ou se rembourser
          const shouldRetry = await this.confirmAlert(
            'Confirmation de paiement',
            "Le paiement n'a pas pu être confirmé. Voulez-vous réessayer ?",
            'Réessayer',
            'Annuler',
          );

          if (shouldRetry) {
            this.confirmPaymentTransaction();
          } else {
            await this.showAlert(
              'Remboursement',
              'Votre paiement sera remboursé dans 24-48h.',
            );
          }
        },
      });
  }

  goBack() {
    if (this.stepNumber === 1) {
      this.navCtrl.back();
    } else {
      this.stepNumber--;
    }
  }

  finishBooking() {
    this.navCtrl.navigateRoot('/tabs/home');
  }

  /**
   * Déclenche l'impression du/des billet(s). La zone imprimable est isolée
   * via CSS (@media print, voir booking-form.page.scss) : un billet par page,
   * avec nom et téléphone du passager sur chacun.
   * Depuis la boîte de dialogue d'impression, l'utilisateur choisit
   * "Enregistrer au format PDF" pour obtenir un PDF.
   */
  printTicket() {
    window.print();
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
      cssClass: 'custom-alert',
    });
    await alert.present();
  }

  private generateQrCode(data: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
  }

  private async confirmAlert(
    header: string,
    message: string,
    confirmText: string = 'Confirmer',
    cancelText: string = 'Annuler',
  ): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          {
            text: cancelText,
            role: 'cancel',
            handler: () => resolve(false),
          },
          {
            text: confirmText,
            role: 'confirm',
            handler: () => resolve(true),
          },
        ],
        cssClass: 'custom-alert',
      });
      await alert.present();
    });
  }
}