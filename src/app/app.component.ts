import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular';
import { NativePushService } from './services/NativePushService.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  
  private readonly nativePush = inject(NativePushService);
  private readonly authService = inject(AuthService);

  constructor(private platform : Platform) {}

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
      }
    });
  }
}
