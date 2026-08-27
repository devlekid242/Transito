import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonSpinner, NavController } from '@ionic/angular';
import { AuthService } from '../../../services/auth.service';
import { UiNotificationService } from '../../../services/ui-notification.service';
@Component({
  selector: 'app-pro-login',
  templateUrl: './pro-login.page.html',
  styleUrls: ['./pro-login.page.scss'],
  standalone: true,
  imports: [IonContent, IonSpinner, CommonModule, FormsModule],
})
export class ProLoginPage {
  phoneNumber = '';
  password = '';
  loading = false;
  constructor(
    private authService: AuthService,
    private navCtrl: NavController,
    private notificationService: UiNotificationService,
  ) {}
  async login() {
    const d = this.phoneNumber.replace(/\D/g, '');
    const p = d.startsWith('242') ? `+${d}` : `+242${d}`;
    if (!/^\+242\d{9}$/.test(p) || !this.password) {
      await this.notificationService.showErrorAlert('Veuillez saisir votre numéro et votre mot de passe.');
      return;
    }
    this.loading = true;
    const ok = await this.authService.login(p, this.password);
    this.loading = false;
    if (!ok) {
      await this.notificationService.showErrorAlert('Échec de la connexion. Vérifiez vos identifiants.');
      return;
    }
    this.navCtrl.navigateRoot(
      this.authService.getRole() === 'partner'
        ? '/tabs/partner-dashboard'
        : '/tabs/home',
    );
  }
  back() {
    this.navCtrl.navigateBack('/auth/login');
  }
}
