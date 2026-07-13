import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class RegisterPage {
  currentStep = 1;

  // Étape 1
  name = '';
  email = '';

  // Étape 2
  phoneNumber = '';
  villeResidence = '';
  quartier = '';
  emergencyContactName = '';
  emergencyContactPhone = '';

  // Étape 3
  password = '';
  confirmPassword = '';

  error = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private navCtrl: NavController,
  ) {}

  nextStep() {
    this.error = '';

    if (this.currentStep === 1) {
      if (!this.name.trim() || !this.email.trim()) {
        this.error = 'Veuillez renseigner votre nom complet et votre email.';
        return;
      }
      // Simple regex de base pour l'email
      if (!this.email.includes('@') || !this.email.includes('.')) {
        this.error = 'Veuillez saisir une adresse email valide.';
        return;
      }
      this.currentStep = 2;
    } else if (this.currentStep === 2) {
      if (
        !this.phoneNumber.trim() ||
        !this.villeResidence.trim() ||
        !this.quartier.trim() ||
        !this.emergencyContactName.trim() ||
        !this.emergencyContactPhone.trim()
      ) {
        this.error = 'Tous les champs de localisation et d\'urgence sont obligatoires.';
        return;
      }
      this.currentStep = 3;
    }
  }

  prevStep() {
    this.error = '';
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  async register() {
    this.error = '';

    if (!this.password || !this.confirmPassword) {
      this.error = 'Veuillez renseigner et confirmer votre mot de passe.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.loading = true;

    // Formatage sécurisé des numéros de téléphone (+242)
    const cleanUserPhone = '+242' + this.cleanPhonePrefix(this.phoneNumber);
    const cleanEmergencyPhone = '+242' + this.cleanPhonePrefix(this.emergencyContactPhone);

    // Envoi de l'ensemble des données requises à l'AuthService
    const success = await this.authService.register(
      this.name.trim(),
      this.email.trim(),
      cleanUserPhone,
      this.villeResidence.trim(),
      this.quartier.trim(),
      this.emergencyContactName.trim(),
      cleanEmergencyPhone,
      this.password
    );

    this.loading = false;

    if (success) {
      this.navCtrl.navigateRoot('/tabs/home');
    } else {
      this.error = 'Impossible de créer le compte. Ce numéro ou cet email est peut-être déjà utilisé.';
    }
  }

  private cleanPhonePrefix(phone: string): string {
    let cleaned = phone.trim();
    if (cleaned.startsWith('+242')) {
      cleaned = cleaned.substring(4);
    } else if (cleaned.startsWith('242')) {
      cleaned = cleaned.substring(3);
    }
    return cleaned;
  }

  goToLogin() {
    this.navCtrl.navigateBack('/auth/login');
  }
}