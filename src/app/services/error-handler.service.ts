import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export class ErrorHandler {
  static handle(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur s\'est produite';

    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      switch (error.status) {
        case 0:
          errorMessage = 'Erreur de connexion. Vérifiez votre connexion Internet.';
          break;
        case 400:
          errorMessage = error.error?.message || 'Requête invalide';
          break;
        case 401:
          errorMessage = 'Vous devez vous authentifier';
          break;
        case 403:
          errorMessage = 'Accès refusé';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée';
          break;
        case 500:
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
          break;
        case 503:
          errorMessage = 'Service indisponible. Veuillez réessayer plus tard.';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.statusText}`;
      }
    }

    console.error('HTTP Error:', {
      status: error.status,
      message: errorMessage,
      error: error.error,
    });

    return throwError(() => ({
      status: error.status,
      message: errorMessage,
      error: error.error,
    }));
  }
}

export function HandleError() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const result = originalMethod.apply(this, args);

      if (result instanceof Observable) {
        return result.pipe(catchError((error) => ErrorHandler.handle(error)));
      }

      return result;
    };

    return descriptor;
  };
}
