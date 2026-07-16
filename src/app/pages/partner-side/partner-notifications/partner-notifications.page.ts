import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { PartnerPermissionService } from '../../../services/partner-permission.service';
import { PartnerApiService } from '../../../services/partner-api.service';
import { PartnerHeaderComponent } from '../../../components/partner-header/partner-header.component';
import { SkeletonLoaderComponent } from '../../../components/skeleton-loader/skeleton-loader.component';

interface NotificationItem {
  id: number;
  title: string;
  body: string;
  time: string;
  category: 'success' | 'alert' | 'info';
  isRead: boolean;
}

@Component({
  selector: 'app-partner-notifications',
  templateUrl: './partner-notifications.page.html',
  styleUrls: ['./partner-notifications.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    PartnerHeaderComponent,
    SkeletonLoaderComponent,
  ],
})
export class PartnerNotificationsPage implements OnInit {
  // Permissions
  canViewNotifications = false;

  // Notifications regroupées (chargées depuis API)
  todayNotifications: NotificationItem[] = [];
  yesterdayNotifications: NotificationItem[] = [];
  loading: boolean = true;

  constructor(
    private navCtrl: NavController,
    private permissionService: PartnerPermissionService,
    private apiService: PartnerApiService,
    private toastController: ToastController,
  ) {}

  ngOnInit() {
    this.loadPermissions();
    this.loadNotifications();
  }

  private loadPermissions(): void {
    const permissions = this.permissionService.getPermissions();
    this.canViewNotifications = permissions?.canViewNotifications || false;
  }

  /**
   * Charger les notifications depuis l'API
   */
  private loadNotifications(): void {
    this.loading = true;
    this.apiService.getNotifications().subscribe(
      (notifications: any[]) => {
        // Organiser les notifications par date (aujourd'hui/hier)
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        this.todayNotifications = notifications.filter((n) => {
          const notifDate = new Date(n.createdAt || new Date());
          return notifDate.toDateString() === today.toDateString();
        });

        this.yesterdayNotifications = notifications.filter((n) => {
          const notifDate = new Date(n.createdAt || new Date());
          return notifDate.toDateString() === yesterday.toDateString();
        });

        console.log('Notifications chargées:', notifications);
        this.loading = false;
      },
      (error: any) => {
        console.error('Erreur lors du chargement des notifications:', error);
        this.showToast('Erreur lors du chargement des notifications', 'danger');
        this.loading = false;
      },
    );
  }

  // Marquer toutes les notifications comme lues
  markAllAsRead() {
    this.apiService.markAllNotificationsAsRead().subscribe(
      (response: any) => {
        this.todayNotifications.forEach((n) => (n.isRead = true));
        this.yesterdayNotifications.forEach((n) => (n.isRead = true));
        this.showToast(
          'Toutes les notifications ont été marquées comme lues.',
          'success',
        );
        console.log('Notifications marquées comme lues');
      },
      (error: any) => {
        console.error('Erreur:', error);
        this.showToast('Erreur lors de la mise à jour', 'danger');
      },
    );
  }

  // Lecture d'une notification individuelle au clic
  readNotification(notification: NotificationItem) {
    if (!notification.isRead) {
      this.apiService.markNotificationAsRead(notification.id).subscribe(
        (response: any) => {
          notification.isRead = true;
          console.log("Lecture de l'alerte :", notification.title);
        },
        (error: any) => {
          console.error('Erreur:', error);
        },
      );
    }
  }

  /**
   * Afficher un toast de notification
   */
  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' | 'info',
  ) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color,
    });
    await toast.present();
  }

  goBack() {
    this.navCtrl.pop();
  }
}
