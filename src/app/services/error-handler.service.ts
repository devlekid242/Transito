import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UiNotificationService } from './ui-notification.service';

/**
 * Type pour les erreurs formatées
 */
export interface FormattedError {
  status: number;
  message: string;
  error?: any;
  isCritical: boolean;
}

/**
 * Options pour le traitement des erreurs
 */
export interface ErrorHandleOptions {
  showToast?: boolean;
  showAlert?: boolean;
  context?: string;
  silent?: boolean; // Si true, ne pas afficher de notification
}

/**
 * Service pour gérer centralement les erreurs HTTP
 * Intègre la notification visuelle via UiNotificationService
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  private readonly notificationService = inject(UiNotificationService);

  constructor() {}

  /**
   * Gère une erreur HTTP et retourne un Observable d'erreur
   * Peut afficher une notification selon les options
   */
  handle(
    error: HttpErrorResponse,
    options?: ErrorHandleOptions,
  ): Observable<never> {
    const formattedError = this.formatError(error);

    // Log l'erreur dans la console
    console.error('HTTP Error:', {
      status: error.status,
      message: formattedError.message,
      error: error.error,
    });

    // Affiche une notification si non silencieux
    if (!options?.silent) {
      this.notifyError(formattedError, options);
    }

    return throwError(() => formattedError);
  }

  /**
   * Formate une erreur HTTP en un objet structuré
   */
  formatError(error: HttpErrorResponse): FormattedError {
    let errorMessage = "Une erreur s'est produite";
    let isCritical = false;

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = error.error.message;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 0:
          errorMessage =
            'Erreur de connexion. Vérifiez votre connexion Internet.';
          isCritical = true;
          break;
        case 400:
          errorMessage = error.error?.message || 'Requête invalide';
          break;
        case 401:
          errorMessage = 'Vous devez vous authentifier';
          isCritical = true;
          break;
        case 403:
          errorMessage = 'Accès refusé';
          isCritical = true;
          break;
        case 404:
          errorMessage = 'Ressource non trouvée';
          break;
        case 422:
          errorMessage = error.error?.message || 'Données invalides';
          break;
        case 429:
          errorMessage = 'Trop de requêtes. Veuillez patienter.';
          break;
        case 500:
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
          isCritical = true;
          break;
        case 503:
          errorMessage = 'Service indisponible. Veuillez réessayer plus tard.';
          isCritical = true;
          break;
        default:
          errorMessage =
            error.error?.message ||
            `Erreur ${error.status}: ${error.statusText}`;
      }
    }

    return {
      status: error.status,
      message: errorMessage,
      error: error.error,
      isCritical,
    };
  }

  /**
   * Affiche une notification pour une erreur
   */
  async notifyError(
    error: FormattedError,
    options?: ErrorHandleOptions,
  ): Promise<void> {
    const context = options?.context ? ` - ${options.context}` : '';
    const title = `Erreur${context}`;

    // Si showAlert est explicitement demandé, ou si c'est une erreur critique
    if (options?.showAlert || error.isCritical) {
      await this.notificationService.showErrorAlert(error.message, title);
    } else if (options?.showToast !== false) {
      // Par défaut, afficher un toast
      await this.notificationService.showError(error.message);
    }
  }

  /**
   * Affiche une notification pour un message d'erreur personnalisé
   */
  async showError(
    message: string,
    options?: Omit<ErrorHandleOptions, 'showToast' | 'showAlert'> & {
      type?: 'toast' | 'alert';
    },
  ): Promise<void> {
    if (options?.silent) return;

    const title = options?.context ? `Erreur - ${options.context}` : 'Erreur';

    if (options?.type === 'alert' || !options?.type) {
      // Par défaut, afficher une alerte pour les erreurs explicites
      await this.notificationService.showErrorAlert(message, title);
    } else {
      await this.notificationService.showError(message);
    }
  }

  /**
   * Extrait un message d'erreur à partir d'une erreur quelconque
   */
  getErrorMessage(error: any): string {
    return this.notificationService.getErrorMessage(error);
  }
}

// ============================================================================
// CLASSE STATIQUE POUR LA COMPATIBILITE ASCENDANTE
// ============================================================================

export class ErrorHandler {
  static handle(
    error: HttpErrorResponse,
    options?: ErrorHandleOptions,
  ): Observable<never> {
    const errorHandler = new ErrorHandlerService();
    return errorHandler.handle(error, options);
  }

  /**
   * Affiche une erreur avec notification
   */
  static async showError(
    error: HttpErrorResponse | string,
    options?: ErrorHandleOptions,
  ): Promise<void> {
    const errorHandler = new ErrorHandlerService();

    if (typeof error === 'string') {
      await errorHandler.showError(error, options);
    } else {
      const formatted = errorHandler.formatError(error);
      await errorHandler.notifyError(formatted, options);
    }
  }

  /**
   * Formate une erreur HTTP
   */
  static formatError(error: HttpErrorResponse): FormattedError {
    const errorHandler = new ErrorHandlerService();
    return errorHandler.formatError(error);
  }
}

// ============================================================================
// DECORATOR POUR LE TRAITEMENT AUTOMATIQUE DES ERREURS
// ============================================================================

export function HandleError(options?: ErrorHandleOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const result = originalMethod.apply(this, args);

      if (result instanceof Observable) {
        const errorHandler = new ErrorHandlerService();
        return result.pipe(
          catchError((error: HttpErrorResponse) => {
            return errorHandler.handle(error, options);
          }),
        );
      }

      return result;
    };

    return descriptor;
  };
}
