import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { CapacitorBarcodeScanner } from '@capacitor/barcode-scanner';
import { Subscription } from 'rxjs';
import { PartnerPermissionService } from '../../../services/partner-permission.service';
import {
  PartnerApiService,
  TicketValidationResponse,
} from '../../../services/partner-api.service';
import { PartnerHeaderComponent } from '../../../components/partner-header/partner-header.component';
import { SkeletonLoaderComponent } from '../../../components/skeleton-loader/skeleton-loader.component';

interface TicketData {
  passengerName: string;
  ticketNumber: string;
  boardingStatusLabel: string;
  boardingTime?: string;
  message?: string;
  origin?: string;
  destination?: string;
  agencyName?: string;
}

@Component({
  selector: 'app-ticket-validation',
  templateUrl: './ticket-validation.page.html',
  styleUrls: ['./ticket-validation.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    PartnerHeaderComponent,
    SkeletonLoaderComponent,
  ],
})
export class TicketValidationPage implements OnInit, OnDestroy {
  scanState: 'idle' | 'scanning' | 'success' | 'error' = 'idle';
  qrCodeInput = '';
  errorMessage = '';
  private validationSub?: Subscription;
  loading: boolean = true;

  validatedTicket: TicketData = {
    passengerName: '',
    ticketNumber: '',
    boardingStatusLabel: '',
    boardingTime: '',
    message: '',
    origin: '',
    destination: '',
    agencyName: '',
  };

  canValidateTickets = false;
  isWharfAgent = false;

  constructor(
    private navCtrl: NavController,
    private permissionService: PartnerPermissionService,
    private apiService: PartnerApiService,
  ) {}

  ngOnInit() {
    this.loadPermissions();
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

  async startScan(): Promise<void> {
    if (!this.canValidateTickets) {
      this.scanState = 'error';
      this.errorMessage =
        "Vous n'avez pas la permission de valider des billets.";
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

    const code = qrCode?.trim() || this.qrCodeInput?.trim();
    if (!code) {
      this.scanState = 'error';
      this.errorMessage =
        'Veuillez scanner un QR code ou saisir le numéro du billet.';
      return;
    }

    console.log('Validating ticket with code:', code);
    this.scanState = 'scanning';
    this.validationSub?.unsubscribe();
    this.validationSub = this.apiService.validateTicket(code).subscribe({
      next: (response: TicketValidationResponse) => {
        if (!response.success) {
          this.scanState = 'error';
          this.errorMessage = response.message || 'Billet non valide.';
          return;
        }

        this.validatedTicket = {
          passengerName: response.passengerName || 'N/A',
          ticketNumber: response.ticketNumber || code,
          boardingStatusLabel: this.getBoardingStatusLabel(
            response.boardingStatus,
          ),
          boardingTime: response.boardingTime || '',
          message: response.message || '',
          origin: (response as any).origin || '',
          destination: (response as any).destination || '',
          agencyName: (response as any).agencyName || '',
        };
        this.scanState = 'success';
      },
      error: (error: any) => {
        this.scanState = 'error';
        this.errorMessage =
          error?.error?.message ||
          'Billet invalide ou déjà utilisé. Veuillez vérifier le code.';
      },
    });
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
    this.validatedTicket = {
      passengerName: '',
      ticketNumber: '',
      boardingStatusLabel: '',
      boardingTime: '',
      message: '',
      origin: '',
      destination: '',
      agencyName: '',
    };
    this.qrCodeInput = '';
  }

  goBack(): void {
    this.navCtrl.pop();
  }
}
