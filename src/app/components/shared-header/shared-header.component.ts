import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-shared-header',
  templateUrl: './shared-header.component.html',
  styleUrls: ['./shared-header.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class SharedHeaderComponent implements OnInit, OnDestroy {
  @Input() title: string = '';
  @Input() showLogo: boolean = true;
  @Input() showNotifications: boolean = true;
  @Input() showProfile: boolean = true;

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

  openNotifications() {
    this.navCtrl.navigateForward('/notifications');
  }

  openProfile() {
    const role = this.auth.getRole();
    if (role === 'partner') {
      this.router.navigate(['/partner-profil']);
    } else {
      this.router.navigate(['/tab/profil']);
    }
  }
}