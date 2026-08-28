import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  NavController,
  ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular';
import { SupportService, SupportTicket } from '../../../services/support.service';
import { UiNotificationService } from '../../../services/ui-notification.service';

@Component({
  selector: 'app-support-tickets',
  templateUrl: './support-tickets.page.html',
  styleUrls: ['./support-tickets.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, CommonModule],
})
export class SupportTicketsPage
  implements OnInit, ViewWillEnter, ViewWillLeave
{
  tickets: SupportTicket[] = [];
  filteredTickets: SupportTicket[] = [];
  isLoading = false;
  selectedFilter: 'all' | 'open' | 'answered' | 'pending' | 'closed' = 'all';

  // Utilisés uniquement pour générer les placeholders du skeleton (*ngFor).
  // Les valeurs n'ont pas de signification, seule la longueur du tableau compte.
  readonly skeletonSummaryItems = [1, 2, 3, 4];
  readonly skeletonTicketItems = [1, 2, 3, 4];
  // Largeurs (px) variées pour que les pastilles de filtres ne soient pas alignées.
  readonly skeletonFilterItems = [70, 90, 110, 100];

  constructor(
    private navCtrl: NavController,
    private supportService: SupportService,
    private notificationService: UiNotificationService,
  ) {}

  ngOnInit() {
    this.loadTickets();
  }

  ionViewWillEnter() {
    this.loadTickets();
  }

  ionViewWillLeave() {
    this.isLoading = false;
  }

  private loadTickets() {
    this.isLoading = true;

    this.supportService.getMyTickets().subscribe({
      next: (tickets) => {
        this.tickets = tickets.sort((a, b) => {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement tickets:', err);
        this.isLoading = false;
        this.notificationService.showErrorAlert('Impossible de charger les tickets', 'Erreur');
      },
    });
  }

  applyFilter() {
    switch (this.selectedFilter) {
      case 'open':
        this.filteredTickets = this.tickets.filter((t) => t.status === 'open');
        break;
      case 'answered':
        this.filteredTickets = this.tickets.filter(
          (t) => t.status === 'answered',
        );
        break;
      case 'pending':
        this.filteredTickets = this.tickets.filter(
          (t) => t.status === 'pending',
        );
        break;
      case 'closed':
        this.filteredTickets = this.tickets.filter(
          (t) => t.status === 'closed',
        );
        break;
      default:
        this.filteredTickets = this.tickets;
    }
  }

  setFilter(filter: 'all' | 'open' | 'answered' | 'pending' | 'closed') {
    this.selectedFilter = filter;
    this.applyFilter();
  }

  countByStatus(status: SupportTicket['status']): number {
    return this.tickets.filter((t) => t.status === status).length;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      open: 'Ouvert',
      answered: 'Répondu',
      pending: 'En attente',
      closed: 'Fermé',
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'open':
        return 'primary';
      case 'pending':
        return 'warning';
      case 'answered':
        return 'success';
      case 'closed':
        return 'medium';
      default:
        return 'secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'open':
        return 'fa-solid fa-envelope';
      case 'pending':
        return 'fa-solid fa-clock';
      case 'answered':
        return 'fa-solid fa-circle-check';
      case 'closed':
        return 'fa-solid fa-check-double';
      default:
        return 'fa-solid fa-circle-info';
    }
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      low: 'Basse',
      medium: 'Normale',
      high: 'Haute',
      critical: 'Critique',
    };
    return labels[priority] || priority;
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'primary';
      case 'low':
        return 'medium';
      default:
        return 'secondary';
    }
  }

  viewTicketDetails(ticket: SupportTicket) {
    this.navCtrl.navigateForward(`/support-ticket-detail/${ticket.id}`);
  }

  createNewTicket() {
    this.navCtrl.navigateForward('/support-new');
  }

  goBack() {
    this.navCtrl.navigateBack('/tabs/profil');
  }
}
