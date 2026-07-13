import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
  hasNotifications: boolean = true;
  notificationCount: number = 3;

  constructor(
    private auth: AuthService,
    private navCtrl: NavController,
    private router: Router,
  ) {}

  ngOnInit() {
    const user = this.auth.getUser();
    this.userName = user?.fullName || 'Utilisateur';
  }

  openNotifications() {
    const role = this.auth.getRole();
    if (role === 'partner') {
      this.router.navigate(['/partner-notifications']);
    } else {
      this.router.navigate(['/notifications']);
    }
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
