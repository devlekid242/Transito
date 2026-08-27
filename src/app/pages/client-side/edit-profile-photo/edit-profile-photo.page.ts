import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonSpinner,
  NavController,
  LoadingController,
  ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular';
import { UserService } from '../../../services/user.service';
import { UiNotificationService } from '../../../services/ui-notification.service';
import { environment } from 'src/environments/environment.prod';

@Component({
  selector: 'app-edit-profile-photo',
  templateUrl: './edit-profile-photo.page.html',
  styleUrls: ['./edit-profile-photo.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonSpinner, CommonModule, FormsModule],
})
export class EditProfilePhotoPage
  implements OnInit, ViewWillEnter, ViewWillLeave
{
  currentPhoto: string = '';
  previewPhoto: string = '';
  selectedFile: File | null = null;
  isUploading = false;

  constructor(
    private navCtrl: NavController,
    private userService: UserService,
    private notificationService: UiNotificationService,
  ) {}

  ngOnInit() {
    this.loadCurrentPhoto();
  }

  ionViewWillEnter() {
    this.loadCurrentPhoto();
  }

  ionViewWillLeave() {
    this.isUploading = false;
  }

  private loadCurrentPhoto() {
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentPhoto = user.profilePhotoUrl
          ? environment.baseApiUrl + user.profilePhotoUrl
          : '/assets/images/default-avatar.png';
        this.previewPhoto = this.currentPhoto;
      },
      error: (err) => {
        console.error('Erreur lors du chargement de la photo:', err);
      },
    });
  }

  async onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        await this.notificationService.showErrorAlert(
          'Veuillez sélectionner une image valide',
          'Erreur'
        );
        return;
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        await this.notificationService.showErrorAlert(
          'La taille de l\'image ne doit pas dépasser 5MB',
          'Erreur'
        );
        return;
      }

      this.selectedFile = file;

      // Créer un aperçu
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewPhoto = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async uploadPhoto() {
    if (!this.selectedFile) {
      await this.notificationService.showErrorAlert(
        'Veuillez sélectionner une photo',
        'Erreur'
      );
      return;
    }

    this.isUploading = true;

    this.userService.updateProfilePhoto(this.selectedFile).subscribe({
      next: async (response) => {
        this.isUploading = false;
        await this.notificationService.showSuccess('Photo de profil mise à jour avec succès');
        this.currentPhoto = this.previewPhoto;
        this.selectedFile = null;
        setTimeout(() => {
          this.navCtrl.back();
        }, 1500);
      },
      error: async (err) => {
        this.isUploading = false;
        console.error('Erreur lors du téléchargement:', err);
        await this.notificationService.showErrorAlert(
          'Impossible de télécharger la photo. Veuillez réessayer.',
          'Erreur'
        );
      },
    });
  }

  removePhoto() {
    this.selectedFile = null;
    this.previewPhoto = this.currentPhoto;
  }

  openFileInput() {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput?.click();
  }

  goBack() {
    this.navCtrl.back();
  }
}
