import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, NavController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';


@Component({
  selector: 'app-partner-header',
  templateUrl: './partner-header.component.html',
  styleUrls: ['./partner-header.component.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader]
})
export class PartnerHeaderComponent implements OnInit, OnDestroy  {
  @Input() title: string = '';
  
  userName: string = '';
  hasUnreadNotifications: boolean = false;

  private unreadSub?: Subscription;

  constructor(
    private auth: AuthService,
    private navCtrl: NavController,
    private router: Router,
    private pushService: NotificationService,

  ) {}

  ngOnInit() {
    const user = this.auth.getUser();
    this.userName = user?.fullName || 'Utilisateur';

    // 👈 CORRIGÉ : c'était commenté avant, donc le badge ne s'allumait
    // jamais. On s'abonne à unreadCount$ (mis à jour par connectRealtime,
    // markAsRead, markAllAsRead, deleteNotification, et les évènements
    // Pusher temps réel côté NotificationService).
    this.unreadSub = this.pushService.unreadCount$.subscribe((count) => {
      this.hasUnreadNotifications = count > 0;
    });
  }

  ngOnDestroy() {
    this.unreadSub?.unsubscribe();
  }

  goBack(): void {
    this.navCtrl.pop();
  }

  openNotifications() {
    // Réinitialiser le compteur lors de l'ouverture
    // this.pushService.unreadCount.next(0);
    
    this.navCtrl.navigateForward('/notifications');
  }
}