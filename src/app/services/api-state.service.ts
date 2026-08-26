import { inject, Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { ToastController } from '@ionic/angular';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ApiStateService {

  private readonly toastController = inject(ToastController);

  constructor() {}

  /**
   * Gère un appel API avec état de chargement
   */
  handleApiCall<T>(
    observable: Observable<T>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      showToast?: boolean;
    }
  ): Observable<T> {
    return observable.pipe(
      catchError((error) => {
        const errorMsg = error?.error?.message || options?.errorMessage || 'Une erreur est survenue';
        console.error('Erreur API:', error);

        if (options?.showToast !== false) {
          this.showErrorToast(errorMsg);
        }

        return throwError(() => new Error(errorMsg));
      }),
      finalize(() => {
        if (options?.successMessage && options?.showToast !== false) {
          this.showSuccessToast(options.successMessage);
        }
      })
    );
  }

  /**
   * Affiche un toast de succès
   */
  async showSuccessToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'success',
      buttons: [
        {
          icon: 'checkmark-circle',
          text: 'OK',
          handler: () => {
            toast.dismiss();
          },
        },
      ],
    });
    await toast.present();
  }

  /**
   * Affiche un toast d'erreur
   */
  async showErrorToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'danger',
      buttons: [
        {
          icon: 'alert-circle',
          text: 'Fermer',
          handler: () => {
            toast.dismiss();
          },
        },
      ],
    });
    await toast.present();
  }

  /**
   * Affiche un toast de warning
   */
  async showWarningToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      position: 'bottom',
      color: 'warning',
      buttons: [
        {
          icon: 'warning',
          text: 'OK',
          handler: () => {
            toast.dismiss();
          },
        },
      ],
    });
    await toast.present();
  }

  /**
   * Affiche un toast informatif
   */
  async showInfoToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'primary',
      buttons: [
        {
          icon: 'information-circle',
          text: 'OK',
          handler: () => {
            toast.dismiss();
          },
        },
      ],
    });
    await toast.present();
  }
}

/**
 * Hook pour gérer l'état d'un appel API
 */
@Injectable()
export class UseApiState {
  private state$ = new BehaviorSubject<ApiState<any>>({
    data: null,
    loading: false,
    error: null,
    success: false,
  });

  public readonly state = this.state$.asObservable();
  public readonly data$ = this.state$.pipe(map(state => state.data as any));
  public readonly loading$ = this.state$.pipe(map(state => state.loading));
  public readonly error$ = this.state$.pipe(map(state => state.error));

  constructor(private apiStateService: ApiStateService) {}

  setLoading(loading: boolean): void {
    this.updateState({ loading });
  }

  setData<T>(data: T): void {
    this.updateState({ data, loading: false, success: true });
  }

  setError(error: string): void {
    this.updateState({ error, loading: false, success: false });
  }

  reset(): void {
    this.state$.next({
      data: null,
      loading: false,
      error: null,
      success: false,
    });
  }

  private updateState(partial: Partial<ApiState<any>>): void {
    const current = this.state$.getValue();
    this.state$.next({ ...current, ...partial });
  }
}
