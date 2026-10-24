import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  NavController,
  LoadingController,
} from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { QRCodeComponent } from 'angularx-qrcode';
import { takeUntil } from 'rxjs/operators';
import {
  Trip,
  Passenger,
  Baggage,
  BookingRequest,
  PaymentRequest,
  PaymentConfirmationStatus,
  User,
} from '../../../models';
import { TicketPdfService } from '../../../services/ticket-pdf.service';
import {
  TripService,
  BookingService,
  UserService,
  PaymentService,
} from '../../../services';
import { UiNotificationService } from '../../../services/ui-notification.service';
import {
  PaymentConfigService,
  PaymentConfig,
} from '../../../services/payment-config.service';

@Component({
  selector: 'app-booking-form',
  templateUrl: './booking-form.page.html',
  styleUrls: ['./booking-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    QRCodeComponent,
  ],
})
export class BookingFormPage implements OnInit, OnDestroy {
  trip: Trip | null = null;
  tripId = 0;
  currentUser: User | null = null;
  stepNumber = 1;

  passengers: Passenger[] = [];
  baggages: Baggage[] = [];
  phoneNumber = '';

  // Alignement Backend : Enumération des méthodes de paiement.
  // NB : l'identifiant "AIRTEL_MOMO" (et non "AIRTEL_MONEY") doit être
  // strictement identique à celui utilisé par PaymentController/PayoutService
  // et par la config momoOperators des paramètres système côté back.
  selectedOperator: string | null = null;

  // Frais de service + taux mobile money, chargés depuis l'API publique
  // (voir PublicPaymentConfigController). Ne jamais coder ces valeurs en
  // dur : un admin peut les modifier à tout moment depuis le back-office.
  paymentConfig: PaymentConfig | null = null;
  momoFeeAmount = 0;

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

  // Gestion des sièges : le client peut choisir précisément ses places ou laisser
  // le backend attribuer automatiquement les premières places disponibles.
  seatCapacity = 0;
  takenSeats: number[] = [];
  selectedSeatNumbers: number[] = [];
  seatSelectionMode: 'auto' | 'manual' = 'auto';
  isSeatLoading = false;

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
    qr: string | null;
    passengerName: string;
    passengerPhone: string;
    status: string;
  }> = [];
  bookingStatus = '';

  isLoading = false;
  isPaymentLoading = false;
  paymentStep:
    | 'initiate'
    | 'confirming'
    | 'confirmed'
    | 'failure'
    | 'expired'
    | 'refund_pending' = 'initiate';
  paymentResultStatus: PaymentConfirmationStatus | null = null;
  paymentSecondsRemaining = 0;
  paymentConnectionLost = false;
  private paymentPollTimeout: ReturnType<typeof setTimeout> | null = null;
  private paymentCountdownInterval: ReturnType<typeof setInterval> | null = null;
  private paymentPollAttempt = 0;
  private paymentCheckInProgress = false;
  private expirationFinalCheckStarted = false;
  private bookingPageActive = true;
  retryUnavailable = false;
  private readonly visibilityChangeHandler = () => this.handleVisibilityChange();
  private destroy$ = new Subject<void>();

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private tripService: TripService,
    private bookingService: BookingService,
    private userService: UserService,
    private paymentService: PaymentService,
    private notificationService: UiNotificationService,
    private loadingCtrl: LoadingController,
    private ticketPdfService: TicketPdfService,
    private paymentConfigService: PaymentConfigService,
  ) {}

  ngOnInit() {
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    this.loadData();
  }

  ngOnDestroy() {
    document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    this.clearPaymentTimers();
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter() {
    this.bookingPageActive = true;
    if (this.paymentStep === 'confirming') {
      this.confirmPaymentTransaction();
    }
  }

  ionViewWillLeave() {
    this.bookingPageActive = false;
    this.clearPaymentTimers();
  }

  private loadData() {
    this.isLoading = true;

    this.paymentConfigService
      .getConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe((config) => {
        this.paymentConfig = config;
        // Le frais de service affiché avant même le chargement du trajet
        // vient désormais de l'API, plus d'une valeur figée à 500.
        this.tripDetails.serviceFee = config.platformFee;
        this.updateTotals();
      });

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
            departureDate: new Date(trip.departureDate).toLocaleDateString(
              'fr-FR',
              { day: '2-digit', month: '2-digit', year: 'numeric' },
            ),
            departureTime: new Date(trip.departureTime).toLocaleTimeString(
              'fr-FR',
              { hour: '2-digit', minute: '2-digit' },
            ),
            arrivalTime: new Date(trip.estimatedArrivalTime).toLocaleTimeString(
              'fr-FR',
              { hour: '2-digit', minute: '2-digit' },
            ),
            serviceFee: this.paymentConfig?.platformFee ?? this.tripDetails.serviceFee,
            // Champs optionnels selon ce que renvoie l'API trajet ; utilisés pour
            // enrichir le reçu (nom d'agence, immatriculation du bus).
            agencyName:
              (trip as any).agency?.name || (trip as any).agencyName || '',
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

          this.initializeSeatSelection(trip);
          this.updateTotals();
          this.isLoading = false;
        },
        error: async (err) => {
          this.isLoading = false;
          await this.notificationService.showErrorAlert(
            'Impossible de charger les détails du trajet.',
            'Erreur',
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
      this.phoneNumber = this.currentUser.phoneNumber.replace('+242', '') || ''; // Pré-remplir le numéro de paiement
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
    if (
      this.seatSelectionMode === 'manual' &&
      this.selectedSeatNumbers.length > this.passengers.length
    ) {
      this.selectedSeatNumbers = this.selectedSeatNumbers.slice(
        0,
        this.passengers.length,
      );
    }
    this.updateTotals();
  }

  private initializeSeatSelection(trip: Trip) {
    const rawCapacity =
      (trip as any).bus?.capacity ??
      (trip as any).busCapacity ??
      (trip as any).capacity ??
      0;

    this.seatCapacity = Number(rawCapacity) || 0;
    this.takenSeats = [];
    this.selectedSeatNumbers = [];
    this.seatSelectionMode = 'auto';

    if (this.seatCapacity > 0) {
      this.loadSeatAvailability();
    }
  }

  loadSeatAvailability() {
    if (!this.tripId || this.seatCapacity < 1) return;

    this.isSeatLoading = true;
    const allSeats = Array.from({ length: this.seatCapacity }, (_, index) =>
      String(index + 1),
    );

    this.bookingService
      .validateSeats(this.tripId, allSeats)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.takenSeats = Array.isArray(response?.takenSeats)
            ? response.takenSeats
                .map((seat: any) => Number(seat))
                .filter((seat: number) => Number.isFinite(seat))
            : [];
          this.isSeatLoading = false;
        },
        error: () => {
          // L'écran reste utilisable en attribution automatique. Le contrôle
          // définitif des places appartient au backend lors de la création.
          this.takenSeats = [];
          this.isSeatLoading = false;
        },
      });
  }

  isSeatTaken(seat: number): boolean {
    return this.takenSeats.includes(seat);
  }

  isSeatSelected(seat: number): boolean {
    return this.selectedSeatNumbers.includes(seat);
  }

  toggleSeat(seat: number) {
    if (
      this.seatSelectionMode !== 'manual' ||
      this.isSeatTaken(seat) ||
      this.isPaymentLoading
    )
      return;

    if (this.isSeatSelected(seat)) {
      this.selectedSeatNumbers = this.selectedSeatNumbers.filter(
        (value) => value !== seat,
      );
      return;
    }

    if (this.selectedSeatNumbers.length >= this.passengers.length) {
      return;
    }

    this.selectedSeatNumbers = [...this.selectedSeatNumbers, seat].sort(
      (a, b) => a - b,
    );
  }

  setSeatSelectionMode(mode: 'auto' | 'manual') {
    this.seatSelectionMode = mode;
    if (mode === 'auto') {
      this.selectedSeatNumbers = [];
    }
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

    const baseAmount = this.ticketSubtotal + this.tripDetails.serviceFee;

    this.momoFeeAmount = this.paymentConfig
      ? this.paymentConfigService.computeMomoFee(
          this.paymentConfig,
          this.selectedOperator,
          baseAmount,
        )
      : 0;

    this.totalAmountToPay = baseAmount + this.momoFeeAmount;
  }

  /** Taux (%) de l'opérateur momo actuellement sélectionné, pour affichage. */
  get selectedOperatorRate(): number | null {
    if (!this.paymentConfig || !this.selectedOperator) {
      return null;
    }
    const operator = this.paymentConfig.momoOperators.find(
      (op) => op.id === this.selectedOperator,
    );
    return operator ? operator.collectionFeeRate : null;
  }

  selectOperator(operatorId: string) {
    this.selectedOperator = operatorId;
    this.updateTotals();
  }

  async processPayment() {
    // Validations strictes
    const invalidPassenger = this.passengers.find(
      (p) => !p.fullName || !p.phoneNumber,
    );
    if (invalidPassenger) {
      await this.notificationService.showErrorAlert(
        "Veuillez remplir le nom, numéro de téléphone et N° de pièce d'identité pour tous les passagers.",
        'Champs requis',
      );
      return;
    }
    if (!this.selectedOperator) {
      await this.notificationService.showErrorAlert(
        'Veuillez sélectionner MTN MoMo ou Airtel Money.',
        'Opérateur',
      );
      return;
    }
    if (!this.phoneNumber) {
      await this.notificationService.showErrorAlert(
        'Veuillez saisir le numéro de facturation mobile money.',
        'Téléphone',
      );
      return;
    }

    if (this.isPaymentLoading) return;

    if (this.seatSelectionMode === 'manual') {
      if (this.selectedSeatNumbers.length !== this.passengers.length) {
        await this.notificationService.showErrorAlert(
          `Veuillez sélectionner exactement ${this.passengers.length} place(s), soit une place par passager.`,
          'Places',
        );
        return;
      }

      if (this.selectedSeatNumbers.some((seat) => this.isSeatTaken(seat))) {
        await this.notificationService.showErrorAlert(
          'Une des places sélectionnées vient d’être prise. Actualisez les disponibilités puis réessayez.',
          'Place indisponible',
        );
        this.loadSeatAvailability();
        return;
      }
    }

    this.isPaymentLoading = true;
    this.paymentStep = 'initiate';

    const bookingRequest: BookingRequest & { seatNumbers?: number[] } = {
      tripId: this.trip!.id,
      passengers: this.passengers,
      baggages: this.baggages,
      totalPrice: this.totalAmountToPay,
      paymentPhone: '+242' + this.phoneNumber.replace(/^\+242/, ''),
      paymentMethod: this.selectedOperator,
      boardingPoint: this.selectedBoardingPoint,
      deboardingPoint: this.selectedDeboardingPoint,
      ...(this.seatSelectionMode === 'manual'
        ? { seatNumbers: this.selectedSeatNumbers }
        : {}),
    };

    const createBooking = () =>
      this.bookingService
        .createBooking(bookingRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (bookingResponse) => {
            this.bookingId =
              bookingResponse.reservationId || bookingResponse.id;
            // Étape 2 : Initier le paiement
            const paymentRequest: PaymentRequest = {
              reservationId: Number(this.bookingId),
              amount: this.totalAmountToPay,
              // NB : le type strict de PaymentRequest.paymentMethod (models.ts)
              // référence encore 'AIRTEL_MONEY' au lieu de 'AIRTEL_MOMO' — à
              // corriger dans models.ts pour retirer ce cast.
              paymentMethod: this.selectedOperator as PaymentRequest['paymentMethod'],
            };

            this.paymentService
              .initiatePayment(paymentRequest)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (paymentResponse) => {
                  this.transactionId = paymentResponse.transactionId;
                  this.paymentLogId = Number(paymentResponse.paymentLogId);
                  this.paymentStep = 'confirming';
                  this.paymentPollAttempt = 0;
                  this.startPaymentConfirmation();
                },
                error: async (err) => {
                  this.isPaymentLoading = false;
                  await this.notificationService.showErrorAlert(
                    "Impossible d'initier le paiement. Veuillez réessayer.",
                    'Erreur de paiement',
                  );
                },
              });
          },
          error: async (err) => {
            this.isPaymentLoading = false;
            await this.notificationService.showErrorAlert(
              err?.error?.message || 'Impossible de créer la réservation.',
              'Erreur de réservation',
            );
          },
        });

    // Revalider juste avant la création pour éviter d'envoyer un siège déjà pris.
    // Ce contrôle est informatif : le backend reste l'autorité finale et protège
    // la réservation contre les courses concurrentes.
    if (this.seatSelectionMode === 'manual') {
      this.bookingService
        .validateSeats(this.trip!.id, this.selectedSeatNumbers.map(String))
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response?.allAvailable !== true) {
              this.isPaymentLoading = false;
              this.loadSeatAvailability();
              this.notificationService.showErrorAlert(
                'Une place sélectionnée n’est plus disponible. Veuillez en choisir une autre.',
                'Place indisponible',
              );
              return;
            }
            createBooking();
          },
          error: async (err) => {
            this.isPaymentLoading = false;
            await this.notificationService.showErrorAlert(
              err?.error?.error ||
                'Impossible de vérifier les places. Veuillez réessayer.',
              'Disponibilité',
            );
          },
        });
    } else {
      createBooking();
    }
  }

  private startPaymentConfirmation() {
    this.paymentStep = 'confirming';
    this.paymentResultStatus = 'pending';
    this.paymentConnectionLost = false;
    this.isPaymentLoading = true;
    this.confirmPaymentTransaction();
  }

  private confirmPaymentTransaction() {
    if (
      !this.transactionId ||
      this.paymentCheckInProgress ||
      document.hidden ||
      !this.bookingPageActive
    ) {
      return;
    }

    this.paymentCheckInProgress = true;
    this.paymentService
      .confirmPayment(this.transactionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (confirmResponse) => {
          this.paymentCheckInProgress = false;
          this.paymentConnectionLost = false;
          this.paymentSecondsRemaining = Math.max(0, confirmResponse.secondsUntilExpiration);
          this.startPaymentCountdown();
          this.paymentResultStatus = confirmResponse.status;

          switch (confirmResponse.status) {
            case 'confirmed':
              this.paymentStep = 'confirmed';
              this.loadConfirmedTickets();
              return;
            case 'failure':
            case 'expired':
            case 'refund_pending':
              this.paymentStep = confirmResponse.status;
              this.isPaymentLoading = false;
              this.stepNumber = 3;
              this.clearPaymentTimers();
              return;
            default:
              this.paymentStep = 'confirming';
              this.schedulePaymentConfirmation(
                Math.max(
                  confirmResponse.nextCheckInSeconds,
                  this.nextPaymentPollDelay(),
                ),
              );
          }
        },
        error: () => {
          this.paymentCheckInProgress = false;
          this.paymentConnectionLost = !navigator.onLine;
          this.paymentStep = 'confirming';
          this.schedulePaymentConfirmation(this.nextPaymentPollDelay());
        },
      });
  }

  private loadConfirmedTickets() {
    this.generatedTicket = {
      ticketNumber: `TKT-${this.bookingId}`,
      ticketClass: this.trip?.category,
      transactionId: this.transactionId,
      paymentStatus: 'SUCCESS',
    };
    this.tickets = [];
    if (!this.bookingId) {
      this.isPaymentLoading = false;
      this.stepNumber = 3;
      return;
    }

    this.bookingService
      .getBookingDetail(Number(this.bookingId))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (booking) => {
          this.bookingStatus = booking.status;
          this.tickets = (booking.tickets || []).map((ticket) => ({
            ticketNumber: ticket.ticketNumber,
            seat: ticket.seatNumber,
            qr: ticket.qrCodeToken?.trim() ? ticket.qrCodeToken : null,
            passengerName: ticket.passengerName,
            passengerPhone: ticket.passengerPhone,
            status: ticket.status,
          }));
          this.isPaymentLoading = false;
          this.stepNumber = 3;
        },
        error: () => {
          this.isPaymentLoading = false;
          this.stepNumber = 3;
          this.notificationService.showErrorAlert(
            'Paiement confirmé, mais les billets ne sont pas encore disponibles. Retrouvez-les dans Mes réservations.',
            'Paiement confirmé',
          );
        },
      });
  }

  private nextPaymentPollDelay(): number {
    const delays = [4, 5, 8, 12, 15];
    const delay = delays[Math.min(this.paymentPollAttempt, delays.length - 1)];
    this.paymentPollAttempt++;
    return delay;
  }

  private schedulePaymentConfirmation(seconds: number) {
    if (this.paymentPollTimeout !== null || document.hidden || !this.bookingPageActive) {
      return;
    }
    this.paymentPollTimeout = setTimeout(() => {
      this.paymentPollTimeout = null;
      this.confirmPaymentTransaction();
    }, Math.max(1, seconds) * 1000);
  }

  private startPaymentCountdown() {
    if (this.paymentCountdownInterval !== null) {
      clearInterval(this.paymentCountdownInterval);
    }
    this.paymentCountdownInterval = setInterval(() => {
      if (this.paymentSecondsRemaining > 0) {
        this.paymentSecondsRemaining--;
      }
      if (this.paymentSecondsRemaining === 0 && !this.expirationFinalCheckStarted) {
        this.expirationFinalCheckStarted = true;
        if (this.paymentPollTimeout !== null) {
          clearTimeout(this.paymentPollTimeout);
          this.paymentPollTimeout = null;
        }
        this.confirmPaymentTransaction();
      }
    }, 1000);
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      this.clearPaymentTimers();
    } else if (this.bookingPageActive && this.paymentStep === 'confirming') {
      this.confirmPaymentTransaction();
    }
  }

  private clearPaymentTimers() {
    if (this.paymentPollTimeout !== null) {
      clearTimeout(this.paymentPollTimeout);
      this.paymentPollTimeout = null;
    }
    if (this.paymentCountdownInterval !== null) {
      clearInterval(this.paymentCountdownInterval);
      this.paymentCountdownInterval = null;
    }
  }

  async retryPayment() {
    if (!this.bookingId || this.paymentSecondsRemaining <= 0) {
      this.paymentStep = 'expired';
      this.paymentResultStatus = 'expired';
      return;
    }

    this.isPaymentLoading = true;
    this.retryUnavailable = false;
    this.paymentService
      .initiatePayment({
        reservationId: this.bookingId,
        amount: this.totalAmountToPay,
        paymentMethod: this.selectedOperator as PaymentRequest['paymentMethod'],
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.transactionId = response.transactionId;
          this.paymentLogId = Number(response.paymentLogId);
          this.paymentPollAttempt = 0;
          this.expirationFinalCheckStarted = false;
          this.startPaymentConfirmation();
        },
        error: (error) => {
          this.isPaymentLoading = false;
          if (error?.status === 409) {
            this.retryUnavailable = true;
          } else {
            this.paymentConnectionLost = !navigator.onLine;
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

  async printTicket() {

    const loading = await this.loadingCtrl.create({
      message: 'Génération du PDF...',
    });
    await loading.present();

    try {
      // Nom de fichier basé sur la référence de transaction/réservation
      // quand elle existe (couvre le cas où il y a plusieurs passagers),
      // sinon on retombe sur le numéro du premier billet.
      const fileBaseName =
        this.transactionId || this.tickets?.[0]?.ticketNumber || 'reservation';

      await this.ticketPdfService.exportToPdf({
        containerId: 'printArea',
        fileName: `billets-${fileBaseName}`,
        shareTitle:
          this.tickets.length > 1
            ? `${this.tickets.length} billets`
            : 'Billet ' + (this.tickets?.[0]?.ticketNumber ?? ''),
      });
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      await this.notificationService.showErrorAlert(
        'Impossible de générer le PDF du billet.',
        'Erreur',
      );
    } finally {
      await loading.dismiss();
    }
  }
}