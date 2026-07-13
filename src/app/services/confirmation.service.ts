import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ConfirmModalComponent, ConfirmModalData } from '../components/modals/confirm-modal/confirm-modal.component';

@Injectable({
  providedIn: 'root',
})
export class ConfirmationService {
  constructor(private modalController: ModalController) {}

  /**
   * Affiche une modale de confirmation
   */
  async confirm(data: ConfirmModalData): Promise<boolean> {
    const modal = await this.modalController.create({
      component: ConfirmModalComponent,
      componentProps: { data },
      backdropDismiss: false,
    });

    await modal.present();

    const { data: result } = await modal.onDidDismiss();

    return result?.confirmed ?? false;
  }

  /**
   * Demande une confirmation de suppression
   */
  async confirmDelete(itemName: string = 'cet élément'): Promise<boolean> {
    return this.confirm({
      title: 'Supprimer?',
      message: `Êtes-vous sûr de vouloir supprimer ${itemName}?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDangerous: true,
      extraInfo: 'Cette action ne peut pas être annulée.',
    });
  }

  /**
   * Demande une confirmation simple
   */
  async confirmAction(message: string, actionName: string = 'Continuer'): Promise<boolean> {
    return this.confirm({
      title: 'Confirmer',
      message,
      confirmText: actionName,
      cancelText: 'Annuler',
      isDangerous: false,
    });
  }

  /**
   * Demande une confirmation d'annulation
   */
  async confirmCancel(itemName: string = 'ce trajet'): Promise<boolean> {
    return this.confirm({
      title: 'Annuler?',
      message: `Êtes-vous sûr de vouloir annuler ${itemName}?`,
      confirmText: 'Annuler le trajet',
      cancelText: 'Garder',
      isDangerous: true,
      extraInfo: 'Les passagers seront notifiés de l\'annulation.',
    });
  }

  /**
   * Demande une confirmation avec options personnalisées
   */
  async customConfirm(
    title: string,
    message: string,
    confirmText: string = 'Confirmer',
    cancelText: string = 'Annuler',
    isDangerous: boolean = false,
    extraInfo?: string
  ): Promise<boolean> {
    return this.confirm({
      title,
      message,
      confirmText,
      cancelText,
      isDangerous,
      extraInfo,
    });
  }
}
