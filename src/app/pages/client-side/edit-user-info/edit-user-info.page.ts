import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  IonicModule,
  NavController,
  LoadingController,
  AlertController,
  ToastController,
} from '@ionic/angular';
import { UserService } from '../../../services/user.service';
import { User } from '../../../models';

@Component({
  selector: 'app-edit-user-info',
  templateUrl: './edit-user-info.page.html',
  styleUrls: ['./edit-user-info.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule],
})
export class EditUserInfoPage implements OnInit {
  userForm!: FormGroup;
  currentUser: User | null = null;
  isLoading = false;
  isSaving = false;

  isAgent = false;

  constructor(
    private navCtrl: NavController,
    private userService: UserService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private fb: FormBuilder,
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.loadUserData();
  }

  /**
   * Champs strictement alignés sur App\Entity\User (voir Groups(['user:write']))
   */
  private initializeForm() {
    this.userForm = this.fb.group({
      // Informations de base
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.minLength(10)]],

      // Localisation (villeResidence / quartier - NotBlank côté entité)
      villeResidence: ['', [Validators.required]],
      quartier: ['', [Validators.required]],

      // Contact d'urgence (NotBlank côté entité)
      emergencyContactName: ['', [Validators.required]],
      emergencyContactPhone: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  private async loadUserData() {
    this.isLoading = true;
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.userForm.patchValue({
          fullName: user.fullName,
          email: user.email || '',
          phoneNumber: user.phoneNumber,
          villeResidence: user.villeResidence || '',
          quartier: user.quartier || '',
          emergencyContactName: user.emergencyContactName || '',
          emergencyContactPhone: user.emergencyContactPhone || '',
        });

        this.isAgent = user?.agent?.length > 0;
        
        this.isLoading = false;
      },
      error: async (err) => {
        
        this.isLoading = false;
        console.error('Erreur lors du chargement des données:', err);
        await this.showAlert(
          'Erreur',
          'Impossible de charger vos informations',
        );
      },
    });
  }



  async saveChanges() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      await this.showAlert(
        'Erreur',
        'Veuillez remplir tous les champs obligatoires correctement',
      );
      return;
    }

    this.isSaving = true;

    const formData = this.userForm.value;
    const updateData = {
      fullName: formData.fullName,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      villeResidence: formData.villeResidence,
      quartier: formData.quartier,
      emergencyContactName: formData.emergencyContactName,
      emergencyContactPhone: formData.emergencyContactPhone,
    };

    this.userService.updateProfile(updateData).subscribe({
      next: async () => {
        
        this.isSaving = false;
        await this.showToast('Informations mises à jour avec succès');
        setTimeout(() => {
          this.navCtrl.back();
        }, 1500);
      },
      error: async (err) => {
        
        this.isSaving = false;
        console.error('Erreur lors de la mise à jour:', err);
        const errorMessage =
          err.error?.message || 'Impossible de mettre à jour vos informations';
        await this.showAlert('Erreur', errorMessage);
      },
    });
  }

  goBack() {
    if (this.userForm.dirty) {
      this.showConfirmCancel();
    } else {
      this.navCtrl.back();
    }
  }

  private async showConfirmCancel() {
    const alert = await this.alertCtrl.create({
      header: 'Abandonner les modifications?',
      message: 'Les modifications que vous avez apportées seront perdues.',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
        },
        {
          text: 'Quitter',
          role: 'destructive',
          handler: () => {
            this.navCtrl.back();
          },
        },
      ],
    });
    await alert.present();
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'success',
    });
    await toast.present();
  }
}