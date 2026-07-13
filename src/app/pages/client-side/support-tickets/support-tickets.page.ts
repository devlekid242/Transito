import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonicModule,
  NavController,
  LoadingController,
  AlertController,
} from '@ionic/angular';
import {
  SupportService,
  SupportTicket,
} from '../../../services/support.service';

@Component({
  selector: 'app-support-tickets',
  templateUrl: './support-tickets.page.html',
  styleUrls: ['./support-tickets.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class SupportTicketsPage implements OnInit {
  tickets: SupportTicket[] = [];
  filteredTickets: SupportTicket[] = [];
  isLoading = false;
  selectedFilter: 'all' | 'open' | 'in-progress' | 'resolved' | 'closed' =
    'all';

  constructor(
    private navCtrl: NavController,
    private supportService: SupportService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit() {
    this.loadTickets();
  }

  private async loadTickets() {
    this.isLoading = true;
    const loader = await this.loadingCtrl.create({
      message: 'Chargement des tickets...',
    });
    await loader.present();

    this.supportService.getMyTickets().subscribe({
      next: (tickets) => {
        this.tickets = tickets.sort((a, b) => {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        this.applyFilter();
        this.isLoading = false;
        loader.dismiss();
      },
      error: (err) => {
        console.error('Erreur chargement tickets:', err);
        this.isLoading = false;
        loader.dismiss();
        this.showAlert('Erreur', 'Impossible de charger les tickets');
      },
    });
  }

  applyFilter() {
    switch (this.selectedFilter) {
      case 'open':
        this.filteredTickets = this.tickets.filter((t) => t.status === 'open');
        break;
      case 'in-progress':
        this.filteredTickets = this.tickets.filter(
          (t) => t.status === 'in_progress',
        );
        break;
      case 'resolved':
        this.filteredTickets = this.tickets.filter(
          (t) => t.status === 'resolved',
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

  setFilter(filter: 'all' | 'open' | 'in-progress' | 'resolved' | 'closed') {
    this.selectedFilter = filter;
    this.applyFilter();
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      open: 'Ouvert',
      'in-progress': 'En cours',
      resolved: 'Résolu',
      closed: 'Fermé',
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'open':
        return 'primary';
      case 'in-progress':
        return 'warning';
      case 'resolved':
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
        return 'mail';
      case 'in-progress':
        return 'schedule';
      case 'resolved':
        return 'check_circle';
      case 'closed':
        return 'done_all';
      default:
        return 'info';
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
    this.navCtrl.navigateForward('/support');
  }

  goBack() {
    this.navCtrl.back();
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }
}
