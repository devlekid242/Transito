import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonSpinner, NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UiNotificationService } from '../../../services/ui-notification.service';

@Component({
  selector: 'app-complete-profile',
  templateUrl: './complete-profile.page.html',
  styleUrls: ['./complete-profile.page.scss'],
  standalone: true,
  imports: [IonContent, IonSpinner, CommonModule, FormsModule],
})
export class CompleteProfilePage {
  phoneNumber = '';
  registrationToken = '';
  fullName = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private nav: NavController,
    private notificationService: UiNotificationService,
  ) {
    this.phoneNumber = this.route.snapshot.queryParamMap.get('phone') || '';
    this.registrationToken = this.route.snapshot.queryParamMap.get('registrationToken') || '';
  }

  async submit(): Promise<void> {
    const name = this.fullName.trim();

    if (name.length < 2) {
      await this.notificationService.showErrorAlert('Veuillez renseigner votre nom complet.');
      return;
    }

    if (!this.registrationToken) {
      await this.notificationService.showErrorAlert('La session de création du compte a expiré. Veuillez recommencer.');
      return;
    }

    this.loading = true;
    const success = await this.auth.completeClientProfile(this.registrationToken, name);
    this.loading = false;

    if (!success) {
      await this.notificationService.showErrorAlert('Impossible de finaliser votre compte. Veuillez recommencer.');
      return;
    }

    this.nav.navigateRoot('/tabs/home');
  }
}
