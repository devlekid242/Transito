import { Injectable, signal, effect, inject } from '@angular/core';
import { Network } from '@capacitor/network';
import { AuthService } from './auth.service';
import { UiNotificationService } from './ui-notification.service';

@Injectable({ providedIn: 'root' })
export class NetworkService {
  isOnline = signal<boolean>(true);

  private notificationService = inject(UiNotificationService);

  private authService = inject(AuthService);
  private currentToast: HTMLIonToastElement | null = null;

  constructor() {
    this.initNetworkListener();
    this.watchConnectivity();
  }

  async initNetworkListener() {
    const status = await Network.getStatus();
    this.isOnline.set(status.connected);

    Network.addListener('networkStatusChange', (status) => {
      this.isOnline.set(status.connected);
    });
  }

  private watchConnectivity() {
    effect(() => {
      const online = this.isOnline();
      const authenticated = this.authService.isAuthenticated();

      if (!online && authenticated) {
        this.showOfflineToast('offline');
      } else if (online && this.currentToast) {
        this.showOfflineToast('online');
      }
    });
  }

  private async showOfflineToast(status: 'online' | 'offline') {
    // Évite d'empiler plusieurs toasts si l'état change rapidement
    if (status === 'offline') {
      this.notificationService.showInfo('Connexion Internet perdue');
    } else {
      this.notificationService.showSuccess('Connexion rétablie');
    }
  }
}
