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
import {
  LocalNotifications,
  ActionPerformed as LocalActionPerformed,
} from '@capacitor/local-notifications';
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
 *
 * 👈 IMPORTANT : le canal Android ci-dessous (CHANNEL_ID) doit matcher EXACTEMENT
 * le `channel_id` utilisé côté back dans FcmPushService::sendToTokens(), sinon
 * Android retombe sur un canal par défaut à importance normale → plus de
 * heads-up popup, juste son + icône dans la barre de statut.
 */
@Injectable({ providedIn: 'root' })
export class NativePushService {
  private currentToken: string | null = null;

  /** Doit être identique au channel_id envoyé par FcmPushService.php (back) */
  private readonly CHANNEL_ID = 'transito_notifications';

  /** Type d'action pour les notifications locales (foreground), à parité avec ce que Snapchat/FB affichent */
  private readonly BOOKING_ACTION_TYPE = 'BOOKING_ACTIONS';

  constructor(private http: HttpClient, private router: Router) {}

  /**
   * À appeler une fois au démarrage de l'app pour un utilisateur authentifié
   * (juste après login, ou au boot si un token valide est déjà stocké).
   */
  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.info('Push natif indisponible hors build natif (web/PWA).');
      return;
    }

    // 👈 NOUVEAU : canal HIGH importance, utilisé à la fois par le push natif
    // (background/killed, référencé par FcmPushService côté back) ET par les
    // notifications locales qu'on construit nous-mêmes en foreground.
    // Sans ceci, Android crée un canal par défaut à importance normale et le
    // heads-up n'apparaît jamais, quel que soit ce qu'envoie le back.
    await PushNotifications.createChannel({
      id: this.CHANNEL_ID,
      name: 'Alertes Transito',
      description: 'Réservations, paiements, annonces',
      importance: 5, // MAX -> heads-up popup garanti, cohérent avec PRIORITY_HIGH côté back
      visibility: 1, // public, cohérent avec 'PUBLIC' côté back
      vibration: true,
      lights: true,
    });

    // 👈 NOUVEAU : type d'action pour reproduire les boutons "Voir" / "Pas
    // intéressé" façon Snapchat — actif uniquement pour les notifications
    // affichées via LocalNotifications (donc app en foreground).
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: this.BOOKING_ACTION_TYPE,
          actions: [
            { id: 'view', title: 'Voir' },
            { id: 'dismiss', title: "Je ne suis pas intéressé·e" },
          ],
        },
      ],
    });

    const permission = await PushNotifications.checkPermissions();
    if (permission.receive !== 'granted') {
      const requested = await PushNotifications.requestPermissions();
      if (requested.receive !== 'granted') {
        console.warn('Notifications refusées par l’utilisateur.');
        return;
      }
    }

    // 👈 NOUVEAU : permission dédiée aux notifications locales (obligatoire Android 13+)
    await LocalNotifications.requestPermissions();

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

    // 👈 MODIFIÉ : app au premier plan. Android n'affiche JAMAIS une
    // notification FCM automatiquement dans ce cas — on la construit donc
    // nous-mêmes via LocalNotifications, sur le même canal (donc même son,
    // même comportement heads-up que le push natif en arrière-plan).
    PushNotifications.addListener(
      'pushNotificationReceived',
      async (notification: PushNotificationSchema) => {
        const data = notification.data ?? {};
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now() % 2147483647,
              title: notification.title ?? 'Transito',
              body: notification.body ?? '',
              channelId: this.CHANNEL_ID,
              actionTypeId: this.BOOKING_ACTION_TYPE,
              smallIcon: 'ic_stat_notification',
              extra: data,
            },
          ],
        });
      }
    );

    // L'utilisateur a tapé la notification dans la barre système (app en
    // arrière-plan ou fermée) : on route vers la bonne page grâce aux
    // données jointes par FcmPushService côté API.
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        this.handleNotificationTap(action.notification.data);
      }
    );

    // 👈 NOUVEAU : équivalent pour un tap sur une notification LOCALE
    // (celle qu'on affiche nous-mêmes quand l'app est en foreground).
    LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (action: LocalActionPerformed) => {
        if (action.actionId === 'dismiss') return;
        this.handleNotificationTap(action.notification.extra);
      }
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
    await LocalNotifications.removeAllListeners();
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