import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  NavController,
  AlertController,
  ViewWillEnter,   // 👈 nouveau
  ViewWillLeave,   // 👈 nouveau (optionnel, pour le nettoyage)
} from '@ionic/angular';
import { NotificationService } from '../../../services/notification.service';
import { Notification } from '../../../models';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule]
})


export class NotificationsPage implements OnInit, ViewWillEnter, ViewWillLeave {
  notifications: Notification[] = [];
  isLoading = false;

  isMarkingAllRead: boolean = false;
  // Suivi individuel : permet d'afficher un mini-loader sur l'élément en
  // cours de marquage sans bloquer le reste de la liste.
  markingReadIds = new Set<Notification['id']>();

  constructor(
    private navCtrl: NavController,
    private notificationService: NotificationService,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  ionViewWillEnter() {
    this.loadNotifications();
  }

  ionViewWillLeave() {
    this.isLoading = false;
  }

  private loadNotifications() {
    this.isLoading = true;

    this.notificationService.getNotifications().subscribe({
      next: (notifications) => {
        this.notifications = notifications.map((notification) => ({
          ...notification,
          isRead: !!notification.isRead,
        }));
        this.isLoading = false;
      },
      error: async (err) => {
        console.error('Erreur chargement notifications :', err);
        this.isLoading = false;
        await this.showAlert('Erreur', 'Impossible de charger les notifications.');
      },
    });
  }

  // Demande confirmation avant de marquer tout comme lu.
  async markAllAsRead() {
    const unreadCount = this.notifications.filter((n) => !n.isRead).length;
    if (unreadCount === 0 || this.isMarkingAllRead) {
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Tout marquer comme lu',
      message: `Voulez-vous marquer ${unreadCount} notification${unreadCount > 1 ? 's' : ''} comme lue${unreadCount > 1 ? 's' : ''} ?`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        { text: 'Confirmer', handler: () => this.confirmMarkAllAsRead() },
      ],
    });
    await alert.present();
  }

  private confirmMarkAllAsRead() {
    this.isMarkingAllRead = true;
    // Snapshot pour pouvoir revenir en arrière si l'appel échoue.
    const previousState = this.notifications.map((n) => ({ ...n }));

    this.notifications = this.notifications.map((notification) => ({
      ...notification,
      isRead: true,
    }));

    this.notificationService.markAllAsRead().subscribe({
      error: async (err) => {
        console.error('Erreur marquer tout lu :', err);
        this.notifications = previousState;
        this.isMarkingAllRead = false;
        await this.showAlert('Erreur', 'Impossible de marquer les notifications comme lues.');
      },
      complete: () => {
        this.isMarkingAllRead = false;
      },
    });
  }

  markAsRead(notification: Notification) {
    if (notification.isRead || this.markingReadIds.has(notification.id)) {
      return;
    }

    this.markingReadIds.add(notification.id);
    notification.isRead = true;

    this.notificationService.markAsRead(notification.id).subscribe({
      error: (err) => {
        console.error(`Erreur marquer notification ${notification.id} lue :`, err);
        notification.isRead = false;
      },
      complete: () => {
        this.markingReadIds.delete(notification.id);
      },
    });
  }

  isMarking(notification: Notification): boolean {
    return this.markingReadIds.has(notification.id);
  }

  viewDetails(notification: Notification) {
    // Navigation basée sur le type de notification
    switch (notification.type) {
      case 'Réservation':
        this.navCtrl.navigateForward('/my-bookings');
        break;
      case 'Paiement':
        this.navCtrl.navigateForward('/payment-history');
        break;
      case 'Voyage':
        this.navCtrl.navigateForward('/tabs/home');
        break;
      case 'Promotion':
        this.navCtrl.navigateForward('/search-results');
        break;
      default:
        console.log('Notification sans destination définie:', notification);
    }
  }

  getNotificationIcon(notification: Notification): string {
    switch (notification.type) {
      case 'Paiement':
        return 'receipt_long';
      case 'Voyage':
        return 'directions_bus';
      case 'Promotion':
        return 'local_offer';
      case 'Réservation':
        return 'confirmation_number';
      default:
        return 'notifications';
    }
  }

  formatTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
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