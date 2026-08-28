import { Component, OnInit, OnDestroy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-shared-header',
  templateUrl: './shared-header.component.html',
  styleUrls: ['./shared-header.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class SharedHeaderComponent implements OnInit, OnDestroy {
  @Input() title: string = '';
  @Input() showLogo: boolean = true;
  @Input() showNotifications: boolean = true;
  @Input() showProfile: boolean = true;

  private auth = inject(AuthService);
  private navCtrl = inject(NavController);
  private router = inject(Router);
  private pushService = inject(NotificationService);

  userName: string = '';
  hasUnreadNotifications: boolean = false;

  private unreadSub?: Subscription;

  constructor(  ) {}

  ngOnInit() {
    const user = this.auth.getUser();
    this.userName = user?.fullName || 'Utilisateur';

    // 👈 CORRIGÉ : c'était commenté avant, donc le badge ne s'allumait
    // jamais. On s'abonne à unreadCount$ (mis à jour par connectRealtime,
    // markAsRead, markAllAsRead, deleteNotification, et les évènements
    // Pusher temps réel côté NotificationService).
    this.unreadSub = this.pushService.unreadCount$.subscribe((count: any) => {
      this.hasUnreadNotifications = count > 0;
    });
  }

  ngOnDestroy() {
    this.unreadSub?.unsubscribe();
  }

  openNotifications() {
    this.router.navigate(['/notifications']);
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
