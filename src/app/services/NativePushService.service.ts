import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  PushNotificationSchema,
  ActionPerformed,
  Token,
} from '@capacitor/push-notifications';
import { environment } from '../../environments/environment.prod';

/**
 * Push natif (Capacitor / FCM) : c'est LUI qui fait apparaître une
 * notification dans la barre système du téléphone, y compris app fermée ou
 * en arrière-plan — contrairement à Pusher qui exige une connexion WebSocket
 * active (donc l'app ouverte).
 *
 * Les deux services sont complémentaires et tournent en parallèle :
 *  - PushNotificationService (Pusher) → temps réel in-app
 *  - NativePushService (Capacitor/FCM) → notification système
 *
 * ⚠️ Ne fonctionne que sur un build natif réel (iOS/Android), jamais dans un
 * navigateur (`ionic serve`) : `Capacitor.isNativePlatform()` le vérifie.
 */
@Injectable({ providedIn: 'root' })
export class NativePushService {
  private currentToken: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  /**
   * À appeler une fois au démarrage de l'app pour un utilisateur authentifié
   * (juste après login, ou au boot si un token valide est déjà stocké).
   */
  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.info('Push natif indisponible hors build natif (web/PWA).');
      return;
    }

    const permission = await PushNotifications.checkPermissions();
    if (permission.receive !== 'granted') {
      const requested = await PushNotifications.requestPermissions();
      if (requested.receive !== 'granted') {
        console.warn('Notifications refusées par l’utilisateur.');
        return;
      }
    }

    // Enregistre l'appareil auprès d'APNs (iOS) / FCM (Android) : déclenche
    // l'événement 'registration' ci-dessous avec le token à transmettre à l'API.
    await PushNotifications.register();

    PushNotifications.addListener('registration', (token: Token) => {
      this.currentToken = token.value;
      this.sendTokenToBackend(token.value);
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Échec de l’enregistrement push natif', error);
    });

    // Notification reçue alors que l'app est au premier plan. Pusher couvre
    // déjà ce cas côté UI ; on se contente ici de logguer / synchroniser.
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push reçu (premier plan)', notification);
      },
    );

    // L'utilisateur a tapé la notification dans la barre système (app en
    // arrière-plan ou fermée) : on route vers la bonne page grâce aux
    // données jointes par FcmPushService côté API.
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        this.handleNotificationTap(action.notification.data);
      },
    );
  }

  /** À appeler au logout pour ne plus recevoir de push destinés à cet utilisateur sur cet appareil. */
  async teardown(): Promise<void> {
    if (!Capacitor.isNativePlatform() || !this.currentToken) {
      return;
    }
    this.http
      .post(`${environment.apiUrl}/devices/unregister`, {
        token: this.currentToken,
      })
      .subscribe({
        error: (err) =>
          console.error('Échec de désenregistrement du device token', err),
      });
    await PushNotifications.removeAllListeners();
    this.currentToken = null;
  }

  private sendTokenToBackend(token: string): void {
    const platform = Capacitor.getPlatform(); // 'ios' | 'android'
    this.http
      .post(`${environment.apiUrl}/devices/register`, { token, platform })
      .subscribe({
        next: () => console.log('Device token enregistré côté API'),
        error: (err) =>
          console.error('Échec de l’enregistrement du device token', err),
      });
  }

  /**
   * Déduit la page à ouvrir à partir des données jointes par le backend
   * (`FcmPushService::sendForNotification`). Adapte les routes à ton app.
   */
  private handleNotificationTap(data: any): void {
    const category = data?.category;
    const payload = this.safeParse(data?.payload);

    switch (category) {
      case 'BOOKING':
      case 'TICKET':
        if (payload?.reservationId || payload?.ticketId) {
          this.router.navigate([
            '/ticket',
            payload.reservationId || payload.ticketId,
          ]);
        } else {
          this.router.navigate(['/tabs/reservation']);
        }
        break;
      case 'PAYMENT':
        this.router.navigate(['/tabs/reservation']);
        break;
      default:
        this.router.navigate(['/notifications']);
    }
  }

  private safeParse(value: any): any {
    if (!value) return null;
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return null;
    }
  }
}
