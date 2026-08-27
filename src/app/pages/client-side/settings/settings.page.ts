import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonToggle,
  NavController,
  LoadingController,
  ViewWillEnter,
  ViewWillLeave,  
} from '@ionic/angular';
import { UserService } from '../../../services/user.service';
import { UiNotificationService } from '../../../services/ui-notification.service';
import { User } from '../../../models';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonToggle, CommonModule, FormsModule],
})
export class SettingsPage implements OnInit, ViewWillEnter, ViewWillLeave {
  notificationsEnabled = true;
  language = 'Français';
  currency = 'FCFA';
  darkMode = false;
  user: User | null = null;
  isLoading = false;

  constructor(
    private navCtrl: NavController,
    private userService: UserService,
    private loadingCtrl: LoadingController,
    private notificationService: UiNotificationService,
  ) {}

  ngOnInit() {
    this.loadSettings();
  }

  ionViewWillEnter() {
    this.loadSettings();
  }

  ionViewWillLeave() {
    this.isLoading = false;
  }

  private async loadSettings() {
    this.isLoading = true;
    const loader = await this.loadingCtrl.create({
      message: 'Chargement des paramètres...',
    });
    await loader.present();

    this.userService.getCurrentUser().subscribe({
      next: (profile) => {
        this.user = profile;
        this.notificationsEnabled = profile.prefNotifications !== 0;
        this.language = profile.prefLanguage === 'en' ? 'Anglais' : 'Français';
        this.darkMode = profile.prefDarkMode === 1;
        loader.dismiss();
        this.isLoading = false;
      },
      error: async (err) => {
        console.error('Erreur chargement paramètres :', err);
        loader.dismiss();
        this.isLoading = false;
        await this.notificationService.showErrorAlert('Impossible de charger vos paramètres.', 'Erreur');
      },
    });
  }

  toggleNotifications(event: any) {
    this.notificationsEnabled = event.detail.checked;
  }

  saveSettings() {
    const profileUpdate: Partial<User> = {
      prefNotifications: this.notificationsEnabled ? 1 : 0,
      prefLanguage: this.language === 'Anglais' ? 'en' : 'fr',
      prefDarkMode: this.darkMode ? 1 : 0,
    };

    this.userService.updateProfile(profileUpdate).subscribe({
      next: async () => {
        await this.notificationService.showSuccessAlert('Vos préférences ont été mises à jour.', 'Succès');
        this.navCtrl.back();
      },
      error: async (err) => {
        console.error('Erreur sauvegarde paramètres :', err);
        await this.notificationService.showErrorAlert('Impossible d\'enregistrer vos préférences.', 'Erreur');
      },
    });
  }

  goBack() {
    this.navCtrl.back();
  }
}
