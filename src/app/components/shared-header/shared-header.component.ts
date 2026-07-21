import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PushNotificationService } from '../../services/PushNotificationService.service';

@Component({
  selector: 'app-shared-header',
  templateUrl: './shared-header.component.html',
  styleUrls: ['./shared-header.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class SharedHeaderComponent implements OnInit {
  @Input() title: string = '';
  @Input() showLogo: boolean = true;
  @Input() showNotifications: boolean = true;
  @Input() showProfile: boolean = true;

  userName: string = '';
  hasUnreadNotifications: boolean = false;
  notificationCount: number = 3;

  constructor(
    private auth: AuthService,
    private navCtrl: NavController,
    private router: Router,
    private pushService: PushNotificationService
  ) {}

  ngOnInit() {
    const user = this.auth.getUser();
    this.userName = user?.fullName || 'Utilisateur';

        // Écouter les nouvelles notifications pour l'affichage en temps réel
    this.pushService.unreadCount.subscribe(count => {
      this.hasUnreadNotifications = count > 0;
    });
  }
  openNotifications() {
    // Réinitialiser le compteur lors de l'ouverture
    this.pushService.unreadCount.next(0);
    
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
