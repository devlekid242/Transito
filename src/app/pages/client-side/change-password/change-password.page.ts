import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormGroup, Validators } from '@angular/forms';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { UserService } from '../../../services/user.service'; // Adaptez le chemin de votre service
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.page.html',
  styleUrls: ['./change-password.page.scss'],
  imports: [ CommonModule, IonicModule, ReactiveFormsModule ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ChangePasswordPage implements OnInit {
  passwordForm!: FormGroup;
  isLoading: boolean = false;
  isSaving: boolean = false;

  // Variables pour basculer la visibilité des mots de passe
  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private navCtrl: NavController,
    private userService: UserService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.initForm();
    
    // Simulation d'un petit temps de chargement pour le Skeleton Loader comme sur votre autre page
    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
    }, 600);
  }

  initForm() {
    this.passwordForm = this.fb.group({
      oldPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  // Validateur personnalisé pour vérifier que les deux nouveaux mots de passe sont identiques
  passwordMatchValidator(g: FormGroup) {
    const newPwd = g.get('newPassword')?.value;
    const confirmPwd = g.get('confirmPassword')?.value;
    return newPwd === confirmPwd ? null : { mismatch: true };
  }

  async savePassword() {
    if (this.passwordForm.invalid) {
      return;
    }

    this.isSaving = true;

    this.userService.changePassword(this.passwordForm.value.oldPassword,  this.passwordForm.value.newPassword).subscribe({
      next: async (response:any) => {
        this.isSaving = false;
        const toast = await this.toastCtrl.create({
          message: response.message || 'Mot de passe mis à jour avec succès.',
          duration: 3000,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();
        this.passwordForm.reset();
        this.goBack();
      },
      error: async (err : any) => {
        this.isSaving = false;
        // Récupération du message d'erreur renvoyé par l'API Symfony (ex: "Ancien mot de passe incorrect.")
        const errorMsg = err.error?.message || 'Une erreur est survenue lors de la modification.';
        const toast = await this.toastCtrl.create({
          message: errorMsg,
          duration: 4000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      }
    });
  }

  goBack() {
    this.navCtrl.back();
  }
}