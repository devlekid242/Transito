import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  NavController,
  ActionSheetController,
  ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular';
import { PartnerPermissionService } from '../../../services/partner-permission.service';
import { PartnerApiService } from '../../../services/partner-api.service';
import { UiNotificationService } from '../../../services/ui-notification.service';
import { ActivatedRoute } from '@angular/router';
import { PartnerHeaderComponent } from '../../../components/partner-header/partner-header.component';
import { SkeletonLoaderComponent } from '../../../components/skeleton-loader/skeleton-loader.component';

interface Passenger {
  id: number;
  seatNumber: number;
  name: string;
  phone?: string;
  ticketNumber?: string;
  boardingStatus?: 'PENDING' | 'BOARDED' | 'NO_SHOW' | 'CANCELLED';
  price?: number;
  boardingPoint?: string;
  deboardingPoint?: string;
}

interface TripManifest {
  tripId: number;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  tripDate: string;
  busInfo: any;
  driver: any;
  hostess: any;
  notes: string;
  route: any;
  status: string;
  stops: any[];
  stats: {
    total: number;
    boarded: number;
    pending: number;
    noShow: number;
    cancelled: number;
    occupancyRate: number;
  };
}

@Component({
  selector: 'app-trip-manifest',
  templateUrl: './trip-manifest.page.html',
  styleUrls: ['./trip-manifest.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    CommonModule,
    FormsModule,
    SkeletonLoaderComponent,
  ],
})
export class TripManifestPage implements ViewWillEnter, ViewWillLeave {
  canViewManifest = false;
  loading: boolean = true;

  title: string = 'Manifeste de voyage';

  tripDetails: TripManifest = {
    tripId: 0,
    departure: '',
    arrival: '',
    tripDate: '',
    departureTime: '',
    arrivalTime: '',
    busInfo: null,
    driver: null,
    hostess: null,
    notes: '',
    route: null,
    status: '',
    stops: [],
    stats: {
      total: 0,
      boarded: 0,
      pending: 0,
      noShow: 0,
      cancelled: 0,
      occupancyRate: 0,
    },
  };

  tripStats = this.tripDetails.stats;

  allPassengers: Passenger[] = [];
  filteredPassengers: Passenger[] = [];
  searchQuery = '';

  constructor(
    private navCtrl: NavController,
    private permissionService: PartnerPermissionService,
    private apiService: PartnerApiService,
    private actionSheetCtrl: ActionSheetController,
    private notificationService: UiNotificationService,
    private route: ActivatedRoute,
  ) {}

  ionViewWillEnter(): void {
    this.loadPermissions();
    this.loadManifestData();
  }

  ionViewWillLeave(): void {
    this.loading = false;
  }

  private loadPermissions(): void {
    const permissions = this.permissionService.getPermissions();
    this.canViewManifest = permissions?.canViewManifest || false;
  }

  openNotifications() {
    this.navCtrl.navigateForward('/notifications');
  }

  private loadManifestData(): void {
    this.loading = true;
    const tripId = Number(this.route.snapshot.paramMap.get('tripId')) || 0;

    this.apiService.getTripManifest(tripId).subscribe(
      (data: any) => {
        console.log("Données du manifeste reçues de l'API:", data);

        this.tripDetails = {
          tripId: data.tripId || tripId,
          departure: data.departure || data.route?.departure || '',
          arrival: data.arrival || data.route?.arrival || '',
          departureTime: this.formatTime(data.departureTime),
          arrivalTime: this.formatTime(data.arrivalTime),
          busInfo: data.busInfo || null,
          driver: data.driver || null,
          hostess: data.hostess || null,
          notes: data.notes || '',
          route: data.route || null,
          status: data.status || '',
          tripDate: data.tripDate || data.route?.departureDateTime || '',
          stops: data.stops || [],
          stats: data.stats || {
            total: data.passengers?.length || 0,
            boarded: 0,
            pending: 0,
            noShow: 0,
            cancelled: 0,
            occupancyRate: 0,
          },
        };

        this.tripStats = this.tripDetails.stats;

        this.allPassengers = (data.passengers || []).map((p: any) => ({
          id: p.id,
          name: p.name || p.passengerName || '',
          seatNumber: Number(p.seatNumber) || 0,
          phone: p.phoneNumber || p.passengerPhone || p.phone || '',
          ticketNumber:
            p.ticketNumber || p.code || p.reference || `TKT-${p.id}`,
          boardingStatus: p.boardingStatus || p.status || 'PENDING',
          price: p.price !== undefined ? Number(p.price) : undefined,
          boardingPoint: p.boardingPoint || p.boardingLocation || undefined,
          deboardingPoint: p.deboardingPoint || p.destinationPoint || undefined,
        }));

        this.applySearchFilter();
        this.loading = false;
      },
      (error: any) => {
        console.error('Erreur chargement manifeste:', error);
        this.applySearchFilter();
        this.loading = false;
      },
    );
  }

  /**
   * Formate une heure de manière sûre (le champ affiche une heure de
   * passage, ex. "08:00" — l'ancien code appelait toLocaleDateString()
   * sur un champ "...Time", ce qui affichait une date complète au lieu
   * d'une heure, et le "|| fallback" ne se déclenchait jamais puisque
   * toLocaleDateString() retourne toujours une chaîne non vide).
   */
  private formatTime(dateStr?: string): string {
    if (!dateStr) return '--:--';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  get validBookingsCount(): number {
    return this.allPassengers.filter((p) => p.boardingStatus !== 'CANCELLED')
      .length;
  }

  get occupancyPercentage(): number {
    const capacity = this.tripDetails?.busInfo?.capacity || 0;
    if (capacity === 0) {
      return 0;
    }
    return Math.round((this.validBookingsCount / capacity) * 100);
  }

  /**
   * Centralise les styles + libellé par statut d'embarquement, pour éviter
   * de dupliquer la même chaîne de ternaires à plusieurs endroits du
   * template (risque de désynchronisation entre couleur et libellé).
   */
  getPassengerStatusMeta(status?: Passenger['boardingStatus']): {
    badge: string;
    chip: string;
    label: string;
  } {
    switch (status) {
      case 'BOARDED':
        return {
          badge: 'bg-teal-50 text-teal-800',
          chip: 'bg-teal-50 text-teal-800 border-teal-200',
          label: 'Embarqué',
        };
      case 'PENDING':
        return {
          badge: 'bg-cyan-50 text-cyan-800',
          chip: 'bg-cyan-50 text-cyan-800 border-cyan-200',
          label: 'En attente',
        };
      case 'NO_SHOW':
        return {
          badge: 'bg-amber-50 text-amber-800',
          chip: 'bg-amber-50 text-amber-800 border-amber-200',
          label: 'Non présenté',
        };
      case 'CANCELLED':
        return {
          badge: 'bg-red-50 text-red-800',
          chip: 'bg-red-50 text-red-800 border-red-200',
          label: 'Annulé',
        };
      default:
        return {
          badge: 'bg-gray-100 text-gray-600',
          chip: 'bg-gray-100 text-gray-600 border-gray-200',
          label: 'Inconnu',
        };
    }
  }

  /** Style du badge de statut global du voyage (en-tête). */
  getTripStatusClasses(status: string): string {
    return status === 'En cours'
      ? 'bg-emerald-50 text-teal-800 border-teal-200/50'
      : 'bg-surface-container text-on-surface-variant border-surface-variant';
  }

  applySearchFilter(): void {
    if (!this.searchQuery || this.searchQuery.trim() === '') {
      this.filteredPassengers = [...this.allPassengers];
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.filteredPassengers = this.allPassengers.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.ticketNumber || '').toLowerCase().includes(query),
    );
  }

  // viewTicketDetails(bookingId: number) {
  //   this.navCtrl.navigateForward(`/ticket/${bookingId}`);
  // }

  async openPassengerMenu(passenger: Passenger): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: `Actions - ${passenger.name}`,
      buttons: [
        {
          text: 'Voir détails',
          icon: 'eye-outline',
          handler: () => {
            // this.viewTicketDetails(passenger.bookingId);
          },
        },
        {
          text:
            passenger.boardingStatus === 'BOARDED'
              ? 'Marquer non embarqué'
              : 'Marquer embarqué',
          icon: 'checkmark-circle-outline',
          handler: () => {
            const newStatus =
              passenger.boardingStatus === 'BOARDED' ? 'PENDING' : 'BOARDED';
            this.updatePassengerStatus(passenger, newStatus);
          },
        },
        {
          text: 'Télécharger billet',
          icon: 'cloud-download-outline',
          handler: () => {
            console.log('Téléchargement du billet pour:', passenger.name);
            this.notificationService.showInfo(
              'Téléchargement du billet en cours...',
            );
          },
        },
        {
          text: 'Annuler',
          icon: 'close-outline',
          role: 'cancel',
          handler: () => {
            console.log('Annulation');
          },
        },
      ],
    });

    await actionSheet.present();
  }

  private updatePassengerStatus(
    passenger: Passenger,
    newStatus: Passenger['boardingStatus'],
  ): void {
    passenger.boardingStatus = newStatus;
    console.log(
      `Statut du passager ${passenger.name} mis à jour à ${newStatus}`,
    );
    this.notificationService.showSuccess(`Statut mis à jour: ${newStatus}`);
  }

  downloadManifestPDF(): void {
    console.log('Téléchargement du manifeste en PDF...');
    this.notificationService.showInfo('Génération du PDF en cours...');

    const pdfContent = `MANIFESTE DE VOYAGE\n\nTrajet: ${this.tripDetails.departure} → ${this.tripDetails.arrival}\nDate/Heure départ: ${this.tripDetails.departureTime}\nHeure arrivée prévue: ${this.tripDetails.arrivalTime}\nBus: ${this.tripDetails.busInfo?.licensePlate || ''} (capacité: ${this.tripDetails.busInfo?.capacity || 'N/A'})\nChauffeur: ${this.tripDetails.driver?.name || ''}\nHôtesse: ${this.tripDetails.hostess?.name || ''}\nNotes: ${this.tripDetails.notes || ''}\n\nPASSAGERS:\n${this.allPassengers
      .map(
        (p) =>
          `${p.seatNumber} - ${p.name} - ${p.ticketNumber || ''} - ${p.boardingStatus || ''} - ${p.phone || ''}`,
      )
      .join(
        '\n',
      )}\n\nSTATISTIQUES:\nTotal: ${this.tripStats?.total || 0} | Embarqués: ${this.tripStats?.boarded || 0} | En attente: ${this.tripStats?.pending || 0} | Finalisés: ${this.tripStats?.noShow || 0} | Annulés: ${this.tripStats?.cancelled || 0}`;

    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manifeste-${this.tripDetails.busInfo?.licensePlate || 'unknown'}-${this.tripDetails.departureTime}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.notificationService.showSuccess('PDF téléchargé avec succès!');
  }

  goBack(): void {
    this.navCtrl.back();
  }
}
