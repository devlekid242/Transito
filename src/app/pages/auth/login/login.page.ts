import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class LoginPage {
  phoneNumber = '';
  error = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private navCtrl: NavController,
  ) {}

  private normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('242')) return `+${digits}`;
    return `+242${digits}`;
  }

  async requestOtp(): Promise<void> {
    this.error = '';
    const phone = this.normalizePhone(this.phoneNumber);
    if (!/^\+242\d{9}$/.test(phone)) {
      this.error = 'Veuillez saisir un numéro congolais valide.';
      return;
    }

    this.loading = true;
    const success = await this.authService.requestLoginOtp(phone);
    this.loading = false;

    if (success) {
      this.navCtrl.navigateForward('/auth/verify-login', {
        queryParams: { phone },
      });
    } else {
      this.error = 'Impossible d’envoyer le code OTP. Veuillez réessayer.';
    }
  }

  goToProfessionalLogin(): void {
    this.navCtrl.navigateForward('/auth/pro-login');
  }
}
