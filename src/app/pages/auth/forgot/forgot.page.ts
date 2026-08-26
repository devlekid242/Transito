import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonSpinner, NavController } from '@ionic/angular';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-forgot',
  templateUrl: './forgot.page.html',
  styleUrls: ['./forgot.page.scss'],
  standalone: true,
  imports: [IonContent, IonSpinner, CommonModule, FormsModule],
})
export class ForgotPage {
  phoneNumber = '';
  loading = false;
  message = '';

  constructor(
    private authService: AuthService,
    private navCtrl: NavController,
  ) {}

  async requestReset() {
    this.message = '';
    // 1. Nettoyage de la saisie (suppression des espaces vides)
    let formattedPhone = this.phoneNumber.trim();

    // Sécurité au cas où l'utilisateur colle un numéro contenant déjà l'indicatif
    if (formattedPhone.startsWith('+242')) {
      formattedPhone = formattedPhone.substring(4);
    } else if (formattedPhone.startsWith('242')) {
      formattedPhone = formattedPhone.substring(3);
    }
    
    if (!this.phoneNumber) {
      this.message = 'Veuillez saisir votre numéro de téléphone.';
      return;
    }

    const fullPhoneNumber = '+242' + formattedPhone;

    // Optionnel : Vous pouvez ajouter une validation de format de numéro ici si nécessaire (ex: regex)

    this.loading = true;
    const success = await this.authService.requestReset(fullPhoneNumber);
    this.loading = false;

    if (success) {
      // Redirection vers la page de vérification avec le numéro en paramètre de requête
      this.navCtrl.navigateForward(`/auth/verify?phone=${encodeURIComponent(fullPhoneNumber)}`);
    } else {
      this.message = "Impossible d'envoyer le code pour le moment. Veuillez réessayer.";
    }
  }

  goToLogin() {
    this.navCtrl.navigateBack('/auth/login');
  }
}