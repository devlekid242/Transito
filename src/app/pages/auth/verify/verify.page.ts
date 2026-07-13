import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { AuthService } from '../../../services/auth.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-verify',
  templateUrl: './verify.page.html',
  styleUrls: ['./verify.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class VerifyPage implements OnInit, OnDestroy {
  currentStep = 1;
  countdown = 60;
  timerInterval: any;

  phoneNumber = '';
  code = '';
  newPassword = '';
  confirmPassword = '';
  
  loading = false;
  message = '';

  constructor(
    private authService: AuthService,
    private navCtrl: NavController,
    private route: ActivatedRoute,
  ) {
    const phone = this.route.snapshot.queryParamMap.get('phone');
    if (phone) {
      this.phoneNumber = phone;
    }
  }

  ngOnInit() {
    this.startCountdown();
  }

  ngOnDestroy() {
    this.clearIntervalTimer();
  }

  startCountdown() {
    this.countdown = 60;
    this.clearIntervalTimer();
    this.timerInterval = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--;
      } else {
        this.clearIntervalTimer();
      }
    }, 1000);
  }

  clearIntervalTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  nextStep() {
    this.message = '';
    if (!this.code || this.code.trim().length < 4) {
      this.message = 'Veuillez saisir un code OTP valide.';
      return;
    }
    this.currentStep = 2;
  }

  prevStep() {
    this.message = '';
    if (this.currentStep > 1) {
      this.currentStep--;
    } else {
      this.goToForgot();
    }
  }

  async submit() {
    this.message = '';
    
    if (!this.newPassword || !this.confirmPassword) {
      this.message = 'Veuillez remplir tous les champs.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.message = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.loading = true;
    const success = await this.authService.verifyReset(this.phoneNumber, this.code.trim(), this.newPassword);
    this.loading = false;

    if (success) {
      this.message = '';
      // Redirection directe vers la page de connexion après le succès de la réinitialisation
      this.navCtrl.navigateRoot('/auth/login');
    } else {
      this.message = 'Le code saisi est incorrect ou a expiré. Veuillez réessayer.';
    }
  }

  /**
   * Retourne une version masquée sécurisée du numéro de téléphone (Ex: +242 •• ••• •• 89)
   */
  getMaskedPhone(): string {
    if (!this.phoneNumber) return 'votre numéro';
    const phone = this.phoneNumber.trim();
    if (phone.length > 4) {
      const lastDigits = phone.slice(-2);
      const prefix = phone.startsWith('+') ? phone.slice(0, 4) : phone.slice(0, 3);
      return `${prefix} ••• •• •• ${lastDigits}`;
    }
    return phone;
  }

  goToForgot() {
    this.navCtrl.navigateBack('/auth/forgot');
  }
}