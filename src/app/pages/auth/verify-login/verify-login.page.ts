import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonSpinner, NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UiNotificationService } from '../../../services/ui-notification.service';

@Component({
  selector: 'app-verify-login',
  templateUrl: './verify-login.page.html',
  styleUrls: ['./verify-login.page.scss'],
  standalone: true,
  imports: [IonContent, IonSpinner, CommonModule, FormsModule],
})
export class VerifyLoginPage implements OnInit, OnDestroy {
  phoneNumber = '';
  code = '';
  loading = false;
  countdown = 60;
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private nav: NavController,
    private notificationService: UiNotificationService,
  ) {}

  ngOnInit(): void {
    this.phoneNumber = this.route.snapshot.queryParamMap.get('phone') || '';
    this.startTimer();
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  startTimer(): void {
    this.countdown = 60;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.countdown > 0) this.countdown--;
      else if (this.timer) clearInterval(this.timer);
    }, 1000);
  }

  async verify(): Promise<void> {
    const code = this.code.trim();

    if (!/^\d{4,6}$/.test(code)) {
      await this.notificationService.showErrorAlert('Saisissez le code reçu par SMS.');
      return;
    }

    this.loading = true;
    const result = await this.auth.verifyLoginOtp(this.phoneNumber, code);
    this.loading = false;

    if (!result.success) {
      await this.notificationService.showErrorAlert('Code incorrect ou expiré.');
      return;
    }

    if (result.requiresProfile) {
      this.nav.navigateForward('/auth/complete-profile', {
        queryParams: {
          phone: this.phoneNumber,
          registrationToken: result.registrationToken || '',
        },
      });
      return;
    }

    this.nav.navigateRoot('/tabs/home');
  }

  async resend(): Promise<void> {
    if (this.countdown > 0 || this.loading) return;

    this.loading = true;
    const ok = await this.auth.requestLoginOtp(this.phoneNumber);
    this.loading = false;

    if (ok) this.startTimer();
    else await this.notificationService.showErrorAlert('Impossible de renvoyer le code.');
  }
}
