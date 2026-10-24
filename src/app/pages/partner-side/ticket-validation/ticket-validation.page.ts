import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  NavController,
  ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular';
import { CapacitorBarcodeScanner } from '@capacitor/barcode-scanner';
import { Subscription } from 'rxjs';
import { PartnerPermissionService } from '../../../services/partner-permission.service';
import {
  PartnerApiService,
  Trip,
  TicketValidationResponse,
} from '../../../services/partner-api.service';
import { SkeletonLoaderComponent } from '../../../components/skeleton-loader/skeleton-loader.component';

interface TicketData {
  passengerName: string;
  passengerPhone?: string;
  ticketNumber: string;
  boardingStatusLabel: string;
  boardingTime?: string;
  message?: string;
  origin?: string;
  destination?: string;
  agencyName?: string;
  tripNumber?: string;
  seatNumber?: string;
  busLicensePlate?: string;
  departureDate?: string;
  departureTime?: string;
  validatedByAgentName?: string;
}

const EMPTY_TICKET: TicketData = {
  passengerName: '',
  passengerPhone: '',
  ticketNumber: '',
  boardingStatusLabel: '',
  boardingTime: '',
  message: '',
  origin: '',
  destination: '',
  agencyName: '',
  tripNumber: '',
  seatNumber: '',
  busLicensePlate: '',
  departureDate: '',
  departureTime: '',
  validatedByAgentName: '',
};

@Component({
  selector: 'app-ticket-validation',
  templateUrl: './ticket-validation.page.html',
  styleUrls: ['./ticket-validation.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, CommonModule, FormsModule, SkeletonLoaderComponent],
})
export class TicketValidationPage
  implements ViewWillEnter, ViewWillLeave, OnDestroy
{
  scanState: 'idle' | 'scanning' | 'success' | 'error' = 'idle';
  qrCodeInput = '';
  errorMessage = '';
  trips: Trip[] = [];
  selectedTripId: number | null = null;
  tripsErrorMessage = '';
  private tripsSub?: Subscription;
  private validationSub?: Subscription;
  loading: boolean = true;

  validatedTicket: TicketData = { ...EMPTY_TICKET };

  // Ces flags ne servent qu'à l'affichage (masquer/afficher des boutons côté UI) :
  // le serveur revérifie systématiquement le droit de valider et l'appartenance
  // du billet à l'agence de l'agent lors de l'appel à /api/tickets/validate.
  canValidateTickets = false;
  isWharfAgent = false;

  constructor(
    private navCtrl: NavController,
    private permissionService: PartnerPermissionService,
    private apiService: PartnerApiService,
  ) {}

  ionViewWillEnter(): void {
    this.loadPermissions();
    this.loadTrips();
  }

  ionViewWillLeave(): void {
    this.validationSub?.unsubscribe();
    this.validationSub = undefined;
    this.tripsSub?.unsubscribe();
    this.tripsSub = undefined;
    this.resetScanner();
    this.loading = false;
  }

  ngOnDestroy(): void {
    this.validationSub?.unsubscribe();
  }

  private loadPermissions(): void {
    const permissions = this.permissionService.getPermissions();
    this.canValidateTickets = permissions?.canValidateTickets || false;
    this.isWharfAgent = this.permissionService.isWharfAgent();
  }

  private loadTrips(): void {
    this.loading = true;
    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    this.tripsSub?.unsubscribe();
    this.tripsSub = this.apiService.getTrips(today, 'all').subscribe({
      next: (trips) => {
        this.trips = trips;
        this.tripsErrorMessage = trips.length
          ? ''
          : "Aucun trajet disponible aujourd'hui pour votre agence.";
        this.loading = false;
      },
      error: () => {
        this.trips = [];
        this.tripsErrorMessage = 'Impossible de charger les trajets. Réessayez avant de scanner.';
        this.loading = false;
      },
    });
  }

  async startScan(): Promise<void> {
    if (!this.canValidateTickets) {
      this.scanState = 'error';
      this.errorMessage =
        "Vous n'avez pas la permission de valider des billets.";
      return;
    }
    if (!this.requireSelectedTrip()) {
      return;
    }

    this.errorMessage = '';
    this.scanState = 'scanning';

    try {
      // Le plugin gère lui-même la demande de permission et ouvre l'appareil photo
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: 17, // 17 correspond à 'ALL' (tous les types de codes : QR, 1D, etc.)
        scanInstructions: 'Placez le QR code dans le cadre',
        scanOrientation: 1, // ou 'landscape' selon vos besoins,
      });

      // Le résultat contient la chaîne de texte scannée dans la propriété "ScanResult"
      if (result && result.ScanResult) {
        this.qrCodeInput = result.ScanResult;
        this.validateTicket(this.qrCodeInput); // Validation automatique
      } else {
        this.scanState = 'error';
        this.errorMessage = 'Aucun code détecté.';
      }
    } catch (err: any) {
      this.scanState = 'error';
      this.errorMessage =
        err?.message || 'Erreur d’accès à la caméra ou de lecture du QR code.';
    }
  }

  validateTicket(qrCode?: string): void {
    if (!this.canValidateTickets) {
      this.scanState = 'error';
      this.errorMessage =
        "Vous n'avez pas la permission de valider des billets.";
      return;
    }

    if (!this.requireSelectedTrip()) {
      return;
    }
    const selectedTripId = this.selectedTripId;
    if (selectedTripId === null) {
      return;
    }

    const identifier = qrCode ?? this.qrCodeInput;
    if (!identifier.trim()) {
      this.scanState = 'error';
      this.errorMessage =
        'Veuillez scanner un QR code ou saisir le numéro du billet.';
      return;
    }
    const identifierFields = /^TKT-\d+$/i.test(identifier.trim())
      ? { ticketCode: identifier }
      : { qrCodeToken: identifier };

    this.scanState = 'scanning';
    this.validationSub?.unsubscribe();
    this.validationSub = this.apiService
      .validateTicket(identifierFields, selectedTripId)
      .subscribe({
        next: (response: TicketValidationResponse) => {
          if (!response.success) {
            this.scanState = 'error';
            this.errorMessage = this.getRefusalMessage(response.boardingStatus, response.message);
            return;
          }

          this.validatedTicket = {
            passengerName: response.passengerName || 'N/A',
            passengerPhone: response.passengerPhone || '',
            ticketNumber: response.ticketNumber || identifier,
            boardingStatusLabel: this.getBoardingStatusLabel(
              response.boardingStatus,
            ),
            boardingTime: response.boardingTime || '',
            message: response.message || '',
            origin: response.origin || '',
            destination: response.destination || '',
            agencyName: response.agencyName || '',
            tripNumber: response.tripNumber || '',
            seatNumber: response.seatNumber || '',
            busLicensePlate: response.busLicensePlate || '',
            departureDate: response.departureDate || '',
            departureTime: response.departureTime || '',
            validatedByAgentName: response.validatedByAgentName || '',
          };
          this.scanState = 'success';
        },
        error: (error: any) => {
          this.scanState = 'error';
          const refusal = error?.error?.boardingStatus;
          this.errorMessage = this.getRefusalMessage(refusal, error?.error?.message);
        },
      });
  }

  private requireSelectedTrip(): boolean {
    if (this.selectedTripId !== null) {
      return true;
    }
    this.scanState = 'error';
    this.errorMessage = 'Sélectionnez le trajet à contrôler avant de scanner un billet.';
    return false;
  }

  private getRefusalMessage(status?: string, fallback?: string): string {
    const messages: Record<string, string> = {
      PAYMENT_NOT_CONFIRMED: 'Paiement non confirmé : ce billet ne peut pas être embarqué.',
      ALREADY_BOARDED: 'Ce billet a déjà été validé à l’embarquement.',
      CANCELLED: 'Ce billet ou cette réservation a été annulé(e).',
      WRONG_TRIP: 'Ce billet appartient à un autre trajet que celui sélectionné.',
      WRONG_AGENCY: 'Ce billet n’appartient pas à votre agence.',
      TRIP_REQUIRED: 'Sélectionnez le trajet à contrôler avant de valider le billet.',
      FINANCIAL_ERROR: 'Erreur financière : le billet n’a pas été validé. Contactez le support.',
      EXPIRED: 'Ce billet ou le délai de paiement est expiré.',
      INVALID_TICKET_STATUS: 'Le statut de ce billet ne permet pas son embarquement.',
      NOT_FOUND: 'Aucun billet ne correspond au QR code ou au code saisi.',
    };
    return (status && messages[status]) || fallback || 'La validation du billet a échoué.';
  }

  getBoardingStatusLabel(
    status: TicketValidationResponse['boardingStatus'],
  ): string {
    switch (status) {
      case 'VALID':
        return 'Valide';
      case 'ALREADY_BOARDED':
        return 'Déjà embarqué';
      case 'NOT_FOUND':
        return 'Non trouvé';
      case 'CANCELLED':
        return 'Annulé';
      default:
        return 'Inconnu';
    }
  }

  resetScanner(): void {
    this.scanState = 'idle';
    this.errorMessage = '';
    this.validatedTicket = { ...EMPTY_TICKET };
    this.qrCodeInput = '';
  }

  goBack(): void {
    this.navCtrl.pop();
  }
}
