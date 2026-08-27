import { Component, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavController, IonContent, IonSpinner } from '@ionic/angular';
import { AuthService } from '../../../services/auth.service';
import { UiNotificationService } from '../../../services/ui-notification.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonSpinner, CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class LoginPage {
  phoneNumber = signal('');
  loading = signal(false);

  constructor(
    private authService: AuthService,
    private navCtrl: NavController,
    private notificationService: UiNotificationService,
  ) {}

  private normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('242')) return `+${digits}`;
    return `+242${digits}`;
  }

  async requestOtp(): Promise<void> {

    const phone = this.normalizePhone(this.phoneNumber());
    if (!/^\+242\d{9}$/.test(phone)) {
      await this.notificationService.showErrorAlert('Veuillez saisir un numéro congolais valide.');
      return;
    }

    this.loading.set(true);
    const success = await this.authService.requestLoginOtp(phone);
    this.loading.set(false);

    if (success) {
      this.navCtrl.navigateForward('/auth/verify-login', {
        queryParams: { phone },
      });
    } else {
      await this.notificationService.showErrorAlert('Impossible d’envoyer le code OTP. Veuillez réessayer.');
    }
  }

  goToProfessionalLogin(): void {
    this.navCtrl.navigateForward('/auth/pro-login');
  }
}