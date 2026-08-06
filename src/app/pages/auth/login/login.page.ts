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
  password = '';
  error = '';
  loading = false;
  showPassword = false;

  constructor(
    private authService: AuthService,
    private navCtrl: NavController,
  ) {}

  async login() {
    this.error = '';
    
    // 1. Nettoyage de la saisie (suppression des espaces vides)
    let formattedPhone = this.phoneNumber.trim();

    // Sécurité au cas où l'utilisateur colle un numéro contenant déjà l'indicatif
    if (formattedPhone.startsWith('+242')) {
      formattedPhone = formattedPhone.substring(4);
    } else if (formattedPhone.startsWith('242')) {
      formattedPhone = formattedPhone.substring(3);
    }

    // 2. Vérification des champs requis
    if (!formattedPhone || !this.password) {
      this.error = 'Veuillez saisir votre numéro et mot de passe.';
      return;
    }

    this.loading = true;

    // 3. Reconstitution automatique avec le préfixe figé pour la BDD / l'API
    const fullPhoneNumber = '+242' + formattedPhone;

    const success = await this.authService.login(fullPhoneNumber, this.password);
    this.loading = false;
    console.log(success);
    if (success) {
      const role =
        this.authService.getRole() ||
        this.authService.getUser()?.role ||
        'client';
      if (role === 'partner') {
        this.navCtrl.navigateRoot('/tabs/partner-dashboard');
      } else {
        this.navCtrl.navigateRoot('/tabs/home');
      }
    } else {
      this.error = 'Échec de la connexion. Réessayez plus tard.';
    }
  }

  goToRegister() {
    this.navCtrl.navigateForward('/auth/register');
  }

  goToForgot() {
    this.navCtrl.navigateForward('/auth/forgot');
  }
}