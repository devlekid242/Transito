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
  IonContent,
  IonHeader,
  NavController,
  IonSpinner,
  ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular';
import { UserService } from '../../../services/user.service';
import { UiNotificationService } from '../../../services/ui-notification.service';
import { User } from '../../../models';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-edit-user-info',
  templateUrl: './edit-user-info.page.html',
  styleUrls: ['./edit-user-info.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonSpinner
  ],
})
export class EditUserInfoPage implements OnInit, ViewWillEnter, ViewWillLeave {
  userForm!: FormGroup;
  currentUser: User | null = null;
  isLoading = false;
  isSaving = false;

  isAgent = false;

  constructor(
    private authService: AuthService,
    private navCtrl: NavController,
    private userService: UserService,
    private notificationService: UiNotificationService,
    private fb: FormBuilder,
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.loadUserData();
  }

  ionViewWillEnter() {
    this.initializeForm();
    this.loadUserData();
  }

  ionViewWillLeave() {
    this.isLoading = false;
    this.isSaving = false;
  }

  /**
   * Champs strictement alignés sur App\Entity\User (voir Groups(['user:write']))
   */
  private initializeForm() {
    this.userForm = this.fb.group({
      // Informations de base
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      // phoneNumber: ['', [Validators.required, Validators.minLength(10)]],

      // Localisation (villeResidence / quartier - NotBlank côté entité)
      villeResidence: ['', [Validators.required]],
      quartier: ['', [Validators.required]],

      // Contact d'urgence (NotBlank côté entité)
      emergencyContactName: [''],
      emergencyContactPhone: ['', [Validators.minLength(10)]],
    });
  }

  private async loadUserData() {
    this.isLoading = true;
    this.userService.getCurrentUser().subscribe({
      next: (user: any) => {
        this.currentUser = user;
        this.userForm.patchValue({
          fullName: user.fullName,
          email: user.email || '',
          // phoneNumber: user.phoneNumber,
          villeResidence: user.villeResidence || '',
          quartier: user.quartier || '',
          emergencyContactName: user.emergencyContactName || '',
          emergencyContactPhone: user.emergencyContactPhone || '',
        });

        this.isLoading = false;

        this.isAgent = user?.agent == undefined;
        // console.log(user?.agent == undefined);
      },
      error: async (err) => {
        this.isLoading = false;
        console.error('Erreur lors du chargement des données:', err);
        await this.notificationService.showErrorAlert(
          'Impossible de charger vos informations',
          'Erreur'
        );
      },
    });
  }

  async saveChanges() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      await this.notificationService.showErrorAlert(
        'Veuillez remplir tous les champs obligatoires correctement',
        'Erreur'
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
        await this.notificationService.showSuccess('Informations mises à jour avec succès');
        
        const role = this.authService.getRole(); // Optionnel : rafraîchir les informations de l'utilisateur si nécessaire

        if(role === 'partner') {
          setTimeout(() => {
            this.navCtrl.navigateBack('/tabs/partner-dashboard');
          }, 1500);
        }else {
          setTimeout(() => {
            this.navCtrl.navigateBack('/tabs/home');
          }, 1500);
        }
      },
      error: async (err) => {
        this.isSaving = false;
        console.error('Erreur lors de la mise à jour:', err);
        const errorMessage =
          err.error?.message || 'Impossible de mettre à jour vos informations';
        await this.notificationService.showErrorAlert(errorMessage, 'Erreur');
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
    await this.notificationService.showConfirmAlert(
      'Abandonner les modifications?',
      'Les modifications que vous avez apportées seront perdues.',
      () => this.navCtrl.back(),
      undefined,
      'Quitter',
      'Annuler'
    );
  }
}
