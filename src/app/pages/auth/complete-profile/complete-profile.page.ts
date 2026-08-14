import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-complete-profile',
  templateUrl: './complete-profile.page.html',
  styleUrls: ['./complete-profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class CompleteProfilePage {
  phoneNumber = '';
  registrationToken = '';
  fullName = '';
  loading = false;
  error = '';

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private nav: NavController,
  ) {
    this.phoneNumber = this.route.snapshot.queryParamMap.get('phone') || '';
    this.registrationToken = this.route.snapshot.queryParamMap.get('registrationToken') || '';
  }

  async submit(): Promise<void> {
    this.error = '';
    const name = this.fullName.trim();

    if (name.length < 2) {
      this.error = 'Veuillez renseigner votre nom complet.';
      return;
    }

    if (!this.registrationToken) {
      this.error = 'La session de création du compte a expiré. Veuillez recommencer.';
      return;
    }

    this.loading = true;
    const success = await this.auth.completeClientProfile(this.registrationToken, name);
    this.loading = false;

    if (!success) {
      this.error = 'Impossible de finaliser votre compte. Veuillez recommencer.';
      return;
    }

    this.nav.navigateRoot('/tabs/home');
  }
}
