import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular';
import { NativePushService } from './services/NativePushService.service';
import { AuthService } from './services/auth.service';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Router } from '@angular/router';
import { UiNotificationService } from './services';
import { NetworkService } from './services/network.service';


if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: false });
  StatusBar.setStyle({ style: Style.Dark });
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private readonly network = inject(NetworkService);
  private readonly nativePush = inject(NativePushService);
  private readonly authService = inject(AuthService);
  private router = inject(Router);
  private readonly notificationService = inject(UiNotificationService);
  constructor(private platform: Platform) {}

  ngOnInit() {
    this.platform.ready().then(() => {
      // NB : la connexion Pusher (NotificationService.connectRealtime) n'est
      // PLUS déclenchée ici. Elle est entièrement pilotée par AuthService
      // (constructeur pour une session déjà stockée au boot, applyAuthResponse
      // pour un login, refreshAccessToken, logout). L'appeler aussi ici créait
      // une double connexion quasi simultanée : le second appel coupait
      // (disconnectRealtime) la connexion WebSocket du premier avant la fin de
      // son handshake → "WebSocket is closed before the connection is
      // established" dans la console.
      //
      // Seul le push natif (Capacitor/FCM) reste initialisé ici, car il doit
      // attendre platform.ready() pour que le pont natif soit disponible.
      if (this.authService.isAuthenticated()) {
        this.nativePush.init();
        this.initBackButton();
      }
    });
  }

  initBackButton() {
    App.addListener('backButton', ({ canGoBack }) => {
      const currentUrl = this.router.url;

      // Sur les pages "racines" (tabs, login, home) -> demander confirmation avant de quitter
      const rootPages = ['/tabs/home', '/tabs/partner-dashboard', '/auth/login'];

      if (rootPages.includes(currentUrl)) {
        this.confirmExit();
      } else if (canGoBack) {
        window.history.back();
      } else {
        this.confirmExit();
      }
    });
  }

  async confirmExit() {
    const confirmed = await this.notificationService.showConfirmAlert(
      'Quitter l\'application',
      'Voulez-vous vraiment quitter ?',
      () => undefined,
      undefined,
      'Quitter',
    );
    if (confirmed) {
      App.exitApp();
    }
  }
}
