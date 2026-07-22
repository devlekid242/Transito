import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import Pusher, { Channel } from 'pusher-js';
import { Notification } from '../models';
import { unwrapCollection } from '../shared/rxjs-operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/user-notifications`;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private pusher: Pusher | null = null;
  private channel: Channel | null = null;
  // Identifie la connexion active (utilisateur + token). Sert de garde
  // anti-doublon : voir connectRealtime() ci-dessous.
  private activeConnectionKey: string | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Ouvre la connexion Pusher et s'abonne au canal privé de l'utilisateur
   * (`private-user-{id}`). À appeler juste après un login réussi, ou au
   * boot si un token valide est déjà en mémoire (voir AuthService).
   *
   * L'authentification du canal passe par PusherAuthController côté API
   * (`/api/pusher/auth`), qui vérifie que le JWT correspond bien au canal
   * demandé.
   *
   * ⚠️ Idempotent par design : si cette méthode est appelée deux fois de
   * suite pour le même (userId, token) — par exemple parce que deux endroits
   * du code déclenchent la connexion au démarrage — le second appel est
   * ignoré au lieu de couper la connexion WebSocket du premier appel avant la
   * fin de son handshake (c'est cette situation qui provoquait l'erreur
   * "WebSocket is closed before the connection is established").
   * Un appel avec un token différent (ex: après refreshAccessToken) force en
   * revanche une reconnexion propre.
   */
  connectRealtime(userId: number, token: string): void {
    const key = `${userId}:${token}`;
    if (this.pusher && this.activeConnectionKey === key) {
      return; // déjà connecté (ou en cours de connexion) avec ces identifiants
    }

    this.disconnectRealtime();
    this.activeConnectionKey = key;

    this.loadNotifications();

    this.pusher = new Pusher(environment.pusher.key, {
      cluster: environment.pusher.cluster,
      authEndpoint: `${environment.apiUrl}/pusher/auth`,
      auth: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    this.channel = this.pusher.subscribe(`private-user-${userId}`);

    this.channel.bind('new-notification', (payload: Notification) => {
      this.addLocalNotification(payload);
    });

    this.channel.bind('pusher:subscription_error', (status: unknown) => {
      console.error('Échec de la souscription au canal Pusher', status);
    });
  }

  /** À appeler au logout pour ne plus écouter le canal de l'utilisateur déconnecté. */
  disconnectRealtime(): void {
    if (this.channel) {
      this.channel.unbind_all();
      this.channel = null;
    }
    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
    }
    this.activeConnectionKey = null;
  }

  /**
   * Charger les notifications
   */
  private loadNotifications(): void {
    this.getUnreadNotifications().subscribe((notifications) =>
      this.notificationsSubject.next(notifications),
    );
  }

  /**
   * Obtenir toutes les notifications
   */
  getNotifications(): Observable<Notification[]> {
    return this.http
      .get<any>(this.apiUrl)
      .pipe(unwrapCollection<Notification>());
  }

  /**
   * Obtenir les notifications non lues
   */
  getUnreadNotifications(): Observable<Notification[]> {
    return this.http
      .get<any>(`${this.apiUrl}/unread`)
      .pipe(unwrapCollection<Notification>());
  }

  /**
   * Marquer une notification comme lue
   */
  markAsRead(notificationId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${notificationId}/read`, {});
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  markAllAsRead(): Observable<any> {
    return this.http.patch(`${this.apiUrl}/mark-all-read`, {});
  }

  /**
   * Supprimer une notification
   */
  deleteNotification(notificationId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${notificationId}`);
  }

  /**
   * Obtenir le nombre de notifications non lues
   */
  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread/count`);
  }

  /**
   * Ajouter une notification à l'état local
   */
  addLocalNotification(notification: Notification): void {
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([notification, ...current]);
  }
}