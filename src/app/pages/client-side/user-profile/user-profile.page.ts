import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  NavController,
  LoadingController,
  AlertController,
  ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { User } from '../../../models';
import { environment } from 'src/environments/environment.prod';
import { SharedHeaderComponent } from 'src/app/components/shared-header/shared-header.component';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.page.html',
  styleUrls: ['./user-profile.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, SharedHeaderComponent],
})
export class UserProfilePage implements OnInit, ViewWillEnter, ViewWillLeave {
  user: any = {
    fullName: '',
    email: '',
    phone: '',
    identityCard: '',
    avatar: '',
    status: '',
  };

  preferences = {
    seat: 'Côté fenêtre',
    smsNotifications: true,
    language: 'Français',
  };

  isLoading = false;

  constructor(
    private navCtrl: NavController,
    private authService: AuthService,
    private userService: UserService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit() {
    this.loadUserProfile();
  }

  ionViewWillEnter() {
    this.loadUserProfile();
  }

  ionViewWillLeave() {
    this.isLoading = false;
  }

  private async loadUserProfile() {
    this.isLoading = true;

    this.userService.getCurrentUser().subscribe({
      next: (profile) => {
        this.user = {
          fullName: profile.fullName,
          email: profile.email,
          phone: profile.phoneNumber,
          quartier: (profile as any).quartier || 'Non renseigné',
          villeResidence: (profile as any).villeResidence || 'Non renseigné',
          identityCard: (profile as any).identityNumber || 'Non renseigné',
          avatar: profile.profilePhotoUrl
            ? environment.baseApiUrl + profile.profilePhotoUrl
            : this.user.avatar,
          status: profile.role || 'Utilisateur',
        };
        this.isLoading = false;
      },
      error: async (err) => {
        this.isLoading = false;
        console.error('Erreur chargement profil:', err);
        await this.showAlert('Erreur', 'Impossible de charger votre profil');
      },
    });
  }

  openSettings() {
    this.navCtrl.navigateForward('/settings');
  }

  viewPaymentHistory() {
    this.navCtrl.navigateForward('/payment-history');
  }

  openSupport() {
    this.navCtrl.navigateForward('/support');
  }

  editPersonalInfo() {
    this.navCtrl.navigateForward('/edit-user-info');
  }

  openNotifications() {
    this.navCtrl.navigateForward('/notifications');
  }

  managePassword() {
    this.navCtrl.navigateForward('/change-password');
  }

  editProfilePhoto() {
    this.navCtrl.navigateForward('/edit-profile-photo');
  }

  navigateTo(destination: string) {
    this.navCtrl.navigateForward(destination);
  }

  async logout() {
    const alert = await this.alertCtrl.create({
      header: 'Déconnexion',
      message: 'Êtes-vous sûr de vouloir vous déconnecter?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
        },
        {
          text: 'Déconnexion',
          role: 'destructive',
          handler: () => {
            this.authService.logout();
            this.navCtrl.navigateRoot('/auth/login');
          },
        },
      ],
    });
    await alert.present();
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
