import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, LoadingController, AlertController, ToastController } from '@ionic/angular';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-edit-profile-photo',
  templateUrl: './edit-profile-photo.page.html',
  styleUrls: ['./edit-profile-photo.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class EditProfilePhotoPage implements OnInit {
  currentPhoto: string = '';
  previewPhoto: string = '';
  selectedFile: File | null = null;
  isUploading = false;

  constructor(
    private navCtrl: NavController,
    private userService: UserService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit() {
    this.loadCurrentPhoto();
  }

  private loadCurrentPhoto() {
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentPhoto = user.profileImage || '/assets/images/default-avatar.png';
        this.previewPhoto = this.currentPhoto;
      },
      error: (err) => {
        console.error('Erreur lors du chargement de la photo:', err);
      },
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        this.showAlert('Erreur', 'Veuillez sélectionner une image valide');
        return;
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.showAlert('Erreur', 'La taille de l\'image ne doit pas dépasser 5MB');
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
      this.showAlert('Erreur', 'Veuillez sélectionner une photo');
      return;
    }

    this.isUploading = true;
    const loader = await this.loadingCtrl.create({
      message: 'Téléchargement en cours...',
    });
    await loader.present();

    this.userService.updateProfilePhoto(this.selectedFile).subscribe({
      next: async (response) => {
        await loader.dismiss();
        this.isUploading = false;
        await this.showToast('Photo de profil mise à jour avec succès');
        this.currentPhoto = this.previewPhoto;
        this.selectedFile = null;
        setTimeout(() => {
          this.navCtrl.back();
        }, 1500);
      },
      error: async (err) => {
        await loader.dismiss();
        this.isUploading = false;
        console.error('Erreur lors du téléchargement:', err);
        await this.showAlert('Erreur', 'Impossible de télécharger la photo. Veuillez réessayer.');
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
