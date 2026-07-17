import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonicModule,
  NavController,
  LoadingController,
  AlertController,
} from '@ionic/angular';
import { NotificationService } from '../../../services/notification.service';
import { Notification } from '../../../models';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})


export class NotificationsPage implements OnInit {
  notifications: Notification[] = [];
  isLoading = false;

  isMarkingAllRead: boolean = false;

  constructor(
    private navCtrl: NavController,
    private notificationService: NotificationService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  private async loadNotifications() {
    this.isLoading = true;
    const loader = await this.loadingCtrl.create({
      message: 'Chargement des notifications...',
    });
    await loader.present();

    this.notificationService.getNotifications().subscribe({
      next: (notifications) => {
        this.notifications = notifications.map((notification) => ({
          ...notification,
          isRead: !!notification.isRead,
        }));
        loader.dismiss();
        this.isLoading = false;
      },
      error: async (err) => {
        console.error('Erreur chargement notifications :', err);
        loader.dismiss();
        this.isLoading = false;
        await this.showAlert('Erreur', 'Impossible de charger les notifications.');
      },
    });
  }

  // Marquer toutes les notifications comme lues
  markAllAsRead() {
    this.isMarkingAllRead = true;

    this.notifications = this.notifications.map((notification) => ({
      ...notification,
      isRead: true,
    }));
    this.notificationService.markAllAsRead().subscribe({
      error: (err) => console.error('Erreur marquer tout lu :', err),
      complete: () => {
        this.isMarkingAllRead = false;
      }
    });
  }

  markAsRead(notification: Notification) {
    if (notification.isRead) {
      return;
    }

    this.isMarkingAllRead = true;

    notification.isRead = true;
    this.notificationService.markAsRead(notification.id).subscribe({
      error: (err) => {
        console.error(`Erreur marquer notification ${notification.id} lue :`, err);
      },
      complete: () => {
        this.isMarkingAllRead = false;
      }
    });
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
