import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonSpinner,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { mapOutline, cardOutline, ticketOutline } from 'ionicons/icons';
import { OnboardingService } from 'src/app/services/onboarding.service';
// import { PrivacyPolicyModalComponent } from '../privacy-policy-modal/privacy-policy-modal.component';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonSpinner,
  ],
  templateUrl: './onboarding.page.html',
})
export class OnboardingPage {
  privacyAccepted = false;
  loading = signal(false);

  constructor(
    private onboardingService: OnboardingService,
    private router: Router,
    private modalCtrl: ModalController,
  ) {
    addIcons({ mapOutline, cardOutline, ticketOutline });
  }

  async openPrivacyPolicy() {
    // const modal = await this.modalCtrl.create({
    //   component: PrivacyPolicyModalComponent,
    // });
    // await modal.present();
  }

  async finishOnboarding() {
    if (this.loading()) return;

    this.loading.set(true);
    try {
      await this.onboardingService.markOnboardingAsSeen();
      await this.router.navigateByUrl('/auth/login', { replaceUrl: true });
    } finally {
      this.loading.set(false);
    }
  }
}
