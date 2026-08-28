import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  NavController,
  ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular';
import { PartnerPermissionService } from '../../../services/partner-permission.service';
import { PartnerApiService } from '../../../services/partner-api.service';
import { PartnerHeaderComponent } from '../../../components/partner-header/partner-header.component';
import { SkeletonLoaderComponent } from '../../../components/skeleton-loader/skeleton-loader.component';
import { AuthService } from '../../../services/auth.service';

interface Booking {
  id: number;
  passengerInitials: string;
  passengerName: string;
  origin: string;
  destination: string;
  timeLabel: string;
  price: number;
  status: 'Payé' | 'En attente' | 'Annulé';
  paymentMethod: string;
  avatarBg: string;
}

interface DetailedStats {
  agent?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  tickets?: {
    validated: number;
    pending: number;
    total: number;
    validationRate: string;
    boarded: number;
    noShow: number;
  };
  trips?: {
    inProgress: number;
    completed: number;
    cancelled: number;
    total: number;
  };
  revenue?: {
    amount: number;
    currency: string;
    change: string;
  };
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
    PartnerHeaderComponent,
    SkeletonLoaderComponent,
  ],
})
export class DashboardPage implements ViewWillEnter, ViewWillLeave {
  // Permissions
  canViewDashboard = false;
  isWharfAgent = false;
  // Feature flags derived from permissions
  canValidateTickets = false;
  canViewTrips = false;
  canViewManifest = false;
  canViewNotifications = false;
  canViewProfile = false;
  canBoardingControl = false;
  partnerRole: string | null = null;
  loading: boolean = true;

  // Métriques clés de l'agence (KPIs - chargées depuis API)
  kpis = {
    ticketsValidated: 0,
    ticketsChange: '0%',
    tripsInProgress: 0,
    tripsCompleted: 0,
    revenueChange: '0%',
    revenue: 0,
  };

  // Statistiques détaillées
  detailedStats: DetailedStats | null = null;

  // Liste dynamique des réservations récentes (chargée depuis API)
  recentBookings: Booking[] = [];

  userName: any;

  constructor(
    private permissionService: PartnerPermissionService,
    private navCtrl: NavController,
    private apiService: PartnerApiService,
    private AuthService: AuthService,
  ) {
    this.userName = this.AuthService.getUser()?.fullName || 'Agent';
  }

  ionViewWillEnter(): void {
    this.loadPermissions();
    this.filterPeriod = 'month';
    this.loadDashboardData();
  }

  ionViewWillLeave(): void {
    this.loading = false;
  }

  // Période de filtrage: 'day' | 'week' | '6months' | 'year' | 'month'
  filterPeriod: 'day' | 'week' | '6months' | 'year' | 'month' = 'month';

  onPeriodChange(period: any) {
    this.filterPeriod = period;
    this.loadDashboardData();
  }

  private loadPermissions(): void {
    this.isWharfAgent = this.permissionService.isWharfAgent();
    this.partnerRole = this.permissionService.getPartnerRole();
    const permissions = this.permissionService.getPermissions();
    this.canViewDashboard = permissions?.canViewDashboard || false;

    // Map permissions to feature flags to drive UI visibility
    this.canValidateTickets = permissions?.canValidateTickets || false;
    this.canViewTrips = permissions?.canViewTrips || false;
    this.canViewManifest = permissions?.canViewManifest || false;
    this.canViewNotifications = permissions?.canViewNotifications || false;
    this.canViewProfile = permissions?.canViewProfile || false;
    this.canBoardingControl = permissions?.canBoardingControl || false;
  }

  /**
   * Charger les données du dashboard depuis l'API
   */
  private loadDashboardData(): void {
    this.loading = true;
    // Calculer la plage de dates selon la période sélectionnée
    const { start, end } = this.computeDateRange(this.filterPeriod);

    // Charger les statistiques spécifiques à l'agent
    this.apiService.getAgentStats(start, end).subscribe(
      (stats: any) => {
        // Mapper les KPIs
        this.kpis = {
          ticketsValidated:
            stats.kpis?.ticketsValidated || stats.tickets?.validated || 0,
          ticketsChange:
            stats.kpis?.ticketsChange || stats.tickets?.change || '0%',
          tripsInProgress:
            stats.kpis?.tripsInProgress || stats.trips?.inProgress || 0,
          tripsCompleted:
            stats.kpis?.tripsCompleted || stats.trips?.completed || 0,
          revenueChange:
            stats.kpis?.revenueChange || stats.revenue?.change || '0%',
          revenue: stats.kpis?.revenue || stats.revenue?.amount || 0,
        };

        // Stocker les statistiques détaillées
        this.detailedStats = {
          agent: stats.agent,
          tickets: stats.tickets,
          trips: stats.trips,
          revenue: stats.revenue,
        };

        console.log('Statistiques agent chargées:', this.kpis);
        console.log('Statistiques détaillées:', this.detailedStats);
        this.loading = false;
      },
      (error: any) => {
        console.error('Erreur chargement statistiques agent:', error);
        // Utiliser des valeurs par défaut
        this.detailedStats = {
          tickets: {
            validated: 0,
            pending: 0,
            total: 0,
            validationRate: '0%',
            boarded: 0,
            noShow: 0,
          },
          trips: {
            inProgress: 0,
            completed: 0,
            cancelled: 0,
            total: 0,
          },
        };
        this.loading = false;
      },
    );

    // Charger les réservations récentes depuis l'API
    this.apiService.getRecentBookings().subscribe(
      (bookings: any[]) => {
        this.recentBookings = bookings.map((booking: any, index: number) => {
          // Formater le time label à partir de departureTime
          let timeLabel = '';
          if (booking.departureTime) {
            const departureDate = new Date(booking.departureTime);
            timeLabel = departureDate.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            });
          }

          // Convertir paymentStatus en status lisible
          const statusMap: { [key: string]: 'Payé' | 'En attente' | 'Annulé' } =
            {
              paye: 'Payé',
              paid: 'Payé',
              en_attente: 'En attente',
              pending: 'En attente',
              annule: 'Annulé',
              cancelled: 'Annulé',
              rembourse: 'Annulé',
            };
          const displayStatus =
            statusMap[booking.paymentStatus?.toLowerCase()] || 'En attente';

          return {
            id: booking.id || index,
            passengerInitials: this.getInitials(booking.passengerName || ''),
            passengerName: booking.passengerName || '',
            origin: booking.departureCity || '',
            destination: booking.arrivalCity || '',
            timeLabel: timeLabel,
            price: booking.price || 0,
            status: displayStatus,
            paymentMethod: booking.paymentMethod || 'Mobile Money',
            avatarBg: this.getRandomAvatarColor(),
          };
        });
        console.log('Réservations chargées:', this.recentBookings);
      },
      (error: any) => {
        console.error('Erreur chargement réservations:', error);
        this.recentBookings = [];
      },
    );
  }

  goBack() {
    this.navCtrl.navigateRoot('/tabs/partner-dashboard');
  }

  // Action pour planifier un nouveau voyage
  createNewTrip() {
    // création de voyage désactivée dans la version allégée
    console.warn('Création de voyage désactivée pour les agents');
  }

  private computeDateRange(
    period: 'day' | 'week' | '6months' | 'year' | 'month',
  ) {
    const end = new Date();
    let start = new Date();
    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(end.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case '6months':
        start.setMonth(end.getMonth() - 6);
        start.setHours(0, 0, 0, 0);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
      default:
        start.setMonth(end.getMonth());
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
    }
    return { start: start.toISOString(), end: end.toISOString() };
  }

  // Option d'action pour chaque réservation
  openBookingOptions(booking: Booking) {
    console.log('Options pour la réservation de :', booking.passengerName);
  }

  viewAllBookings() {
    console.log('Affichage de toutes les réservations...');
  }

  viewTicketDetails(bookingId: number) {
    const booking = this.recentBookings.find((b) => b.id === bookingId);
    if (booking) {
      this.navCtrl.navigateForward(`/ticket/${bookingId}`, {
        state: { booking },
      });
    }
  }
  /**
   * Génère les initiales d'un nom
   */
  private getInitials(name: string): string {
    return (
      name
        .split(' ')
        .map((n) => n.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?'
    );
  }

  /**
   * Génère une couleur d'avatar aléatoire
   */
  private getRandomAvatarColor(): string {
    const colors = [
      'bg-primary-fixed text-on-primary-fixed',
      'bg-secondary-fixed text-on-secondary-fixed',
      'bg-tertiary-fixed text-on-tertiary-fixed',
      'bg-blue-500 text-white',
      'bg-green-500 text-white',
      'bg-orange-500 text-white',
      'bg-purple-500 text-white',
      'bg-pink-500 text-white',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
