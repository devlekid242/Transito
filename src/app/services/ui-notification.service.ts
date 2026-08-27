import { inject, Injectable } from '@angular/core';
import { AlertController, AlertOptions, AlertButton, ToastController, ToastOptions } from '@ionic/angular';

/**
 * Type de notification
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Options pour afficher une alerte stylisée
 */
export interface CustomAlertOptions extends Omit<AlertOptions, 'buttons'> {
  title?: string;
  message: string;
  type?: NotificationType;
  buttons?: (AlertButton | { text: string; role?: string; cssClass?: string; handler?: () => void })[];
  cssClass?: string;
  backdropDismiss?: boolean;
}

/**
 * Service centralisé pour gérer toutes les notifications UI de l'application
 * - Toasts pour les messages rapides et non bloquantes
 * - Alertes stylisées pour les erreurs critiques ou confirmations
 * 
 * Ce service remplace l'utilisation directe de ToastController et AlertController
 * dans les composants/pages.
 */
@Injectable({
  providedIn: 'root',
})
export class UiNotificationService {
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);

  constructor() {}

  // ============================================================================
  // TOASTS - Pour les notifications rapides et non bloquantes
  // ============================================================================

  /**
   * Affiche un toast de succès
   */
  async showSuccess(message: string, duration: number = 2000): Promise<void> {
    await this.showToast(message, 'success', duration);
  }

  /**
   * Affiche un toast d'erreur
   */
  async showError(message: string, duration: number = 3000): Promise<void> {
    await this.showToast(message, 'danger', duration);
  }

  /**
   * Affiche un toast de warning
   */
  async showWarning(message: string, duration: number = 2500): Promise<void> {
    await this.showToast(message, 'warning', duration);
  }

  /**
   * Affiche un toast informatif
   */
  async showInfo(message: string, duration: number = 2000): Promise<void> {
    await this.showToast(message, 'primary', duration);
  }

  /**
   * Affiche un toast personnalisé
   */
  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' | 'primary' | string,
    duration: number = 3000,
    position: 'top' | 'middle' | 'bottom' = 'bottom',
    buttons?: ToastOptions['buttons']
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration,
      position,
      color,
      buttons: buttons || [
        {
          icon: this.getToastIcon(color),
          text: color === 'danger' ? 'Fermer' : 'OK',
          handler: () => toast.dismiss(),
        },
      ],
      cssClass: 'custom-toast',
    });
    await toast.present();
  }

  /**
   * Retourne l'icône appropriée selon le type de toast
   */
  private getToastIcon(color: string): string {
    switch (color) {
      case 'success':
        return 'checkmark-circle';
      case 'danger':
        return 'alert-circle';
      case 'warning':
        return 'warning';
      case 'primary':
        return 'information-circle';
      default:
        return 'information-circle';
    }
  }

  // ============================================================================
  // ALERTES STYLISEES - Pour les erreurs critiques ou confirmations
  // ============================================================================

  /**
   * Affiche une alerte d'erreur stylisée (remplace AlertController direct)
   */
  async showErrorAlert(
    message: string,
    title: string = 'Erreur',
    buttons?: CustomAlertOptions['buttons']
  ): Promise<void> {
    await this.showCustomAlert({
      title,
      message,
      type: 'error',
      buttons: buttons || [
        {
          text: 'OK',
          role: 'confirm',
          cssClass: 'alert-button-confirm',
        },
      ],
    });
  }

  /**
   * Affiche une alerte de succès stylisée
   */
  async showSuccessAlert(
    message: string,
    title: string = 'Succès',
    buttons?: CustomAlertOptions['buttons']
  ): Promise<void> {
    await this.showCustomAlert({
      title,
      message,
      type: 'success',
      buttons: buttons || [
        {
          text: 'OK',
          role: 'confirm',
          cssClass: 'alert-button-confirm',
        },
      ],
    });
  }

  /**
   * Affiche une alerte de warning stylisée
   */
  async showWarningAlert(
    message: string,
    title: string = 'Attention',
    buttons?: CustomAlertOptions['buttons']
  ): Promise<void> {
    await this.showCustomAlert({
      title,
      message,
      type: 'warning',
      buttons: buttons || [
        {
          text: 'OK',
          role: 'confirm',
          cssClass: 'alert-button-confirm',
        },
      ],
    });
  }

  /**
   * Affiche une alerte d'information stylisée
   */
  async showInfoAlert(
    message: string,
    title: string = 'Information',
    buttons?: CustomAlertOptions['buttons']
  ): Promise<void> {
    await this.showCustomAlert({
      title,
      message,
      type: 'info',
      buttons: buttons || [
        {
          text: 'OK',
          role: 'confirm',
          cssClass: 'alert-button-confirm',
        },
      ],
    });
  }

  /**
   * Affiche une alerte de confirmation avec boutons Oui/Non
   */
  async showConfirmAlert(
    title: string,
    message: string,
    confirmHandler: () => void,
    cancelHandler?: () => void,
    confirmText: string = 'Confirmer',
    cancelText: string = 'Annuler'
  ): Promise<boolean> {
    let resolveConfirmation!: (confirmed: boolean) => void;
    const confirmationResult = new Promise<boolean>((resolve) => {
      resolveConfirmation = resolve;
    });

    await this.showCustomAlert({
      title,
      message,
      type: 'warning',
      buttons: [
        {
          text: cancelText,
          role: 'cancel',
          cssClass: 'alert-button-cancel',
          handler: () => {
            cancelHandler?.();
            resolveConfirmation(false);
          },
        },
        {
          text: confirmText,
          role: 'confirm',
          cssClass: 'alert-button-confirm',
          handler: () => {
            confirmHandler();
            resolveConfirmation(true);
          },
        },
      ],
      backdropDismiss: false,
    });

    return confirmationResult;
  }

  /**
   * Affiche une alerte personnalisée avec style amélioré
   */
  private async showCustomAlert(options: CustomAlertOptions): Promise<void> {
    const type = options.type || 'info';
    const cssClass = `custom-alert custom-alert-${type} ${options.cssClass || ''}`;

    const alert = await this.alertController.create({
      header: options.title,
      message: options.message,
      buttons: this.formatAlertButtons(options.buttons),
      cssClass,
      backdropDismiss: options.backdropDismiss !== undefined ? options.backdropDismiss : true,
      animated: true,
    });

    await alert.present();
  }

  /**
   * Formate les boutons de l'alerte avec des classes CSS par défaut
   */
  private formatAlertButtons(
    buttons?: CustomAlertOptions['buttons']
  ): AlertOptions['buttons'] {
    if (!buttons) {
      return [
        {
          text: 'OK',
          cssClass: 'alert-button-confirm',
        },
      ];
    }

    return buttons.map((button) => {
      if (typeof button === 'string') {
        return { text: button, cssClass: 'alert-button-confirm' };
      }

      return {
        text: button.text,
        role: button.role || 'confirm',
        cssClass: button.cssClass || this.getButtonCssClass(button.role),
        handler: button.handler,
      };
    });
  }

  /**
   * Retourne la classe CSS pour un bouton selon son rôle
   */
  private getButtonCssClass(role?: string): string {
    switch (role) {
      case 'cancel':
        return 'alert-button-cancel';
      case 'destructive':
        return 'alert-button-destructive';
      default:
        return 'alert-button-confirm';
    }
  }

  // ============================================================================
  // METHODES UTILITAIRES POUR L'INTEGRATION AVEC L'API
  // ============================================================================

  /**
   * Gère l'affichage d'une erreur API
   * - Erreurs 4xx/5xx : affiche une alerte stylisée
   * - Autres erreurs : affiche un toast
   */
  async handleApiError(
    error: any,
    context?: string
  ): Promise<void> {
    const status = error?.status || error?.error?.status;
    const message = this.getErrorMessage(error);

    // Pour les erreurs critiques (401, 403, 500, 503), on affiche une alerte
    const criticalErrors = [401, 403, 500, 503];
    if (criticalErrors.includes(status)) {
      await this.showErrorAlert(
        message,
        context ? `Erreur - ${context}` : 'Erreur'
      );
    } else {
      // Pour les autres erreurs, un toast suffit
      await this.showError(message);
    }
  }

  /**
   * Extrait un message d'erreur compréhensible à partir d'une erreur API
   */
  getErrorMessage(error: any): string {
    if (!error) {
      return 'Une erreur inconnue est survenue';
    }

    // Message personnalisé de l'API
    if (error?.error?.message) {
      return error.error.message;
    }

    // Message HTTP standard
    if (error?.message) {
      return error.message;
    }

    // Selon le code status
    switch (error?.status) {
      case 0:
        return 'Erreur de connexion. Vérifiez votre connexion Internet.';
      case 400:
        return 'Requête invalide';
      case 401:
        return 'Session expirée. Veuillez vous reconnecter.';
      case 403:
        return 'Accès refusé. Vous n\'avez pas les droits nécessaires.';
      case 404:
        return 'Ressource non trouvée';
      case 422:
        return 'Données invalides. Veuillez vérifier les informations saisies.';
      case 429:
        return 'Trop de requêtes. Veuillez patienter avant de réessayer.';
      case 500:
        return 'Erreur serveur. Veuillez réessayer plus tard.';
      case 503:
        return 'Service temporairement indisponible.';
      default:
        return 'Une erreur est survenue. Veuillez réessayer.';
    }
  }

  /**
   * Affiche un message de succès avec toast
   */
  async handleApiSuccess(
    message: string,
    context?: string
  ): Promise<void> {
    const finalMessage = context ? `${context}: ${message}` : message;
    await this.showSuccess(finalMessage);
  }
}
