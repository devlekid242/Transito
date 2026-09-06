import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import Pusher, { Channel } from 'pusher-js';
import { Notification } from '../models';
import { unwrapCollection } from '../shared/rxjs-operators';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/user-notifications`;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  // 👈 Exposé pour le badge du header (shared-header.component.ts) :
  // nombre de notifications non lues, dérivé de notifications$.
  public unreadCount$ = new BehaviorSubject<number>(0);

  private pusher: Pusher | null = null;
  private channel: Channel | null = null; // private-user-{id}
  private agencyChannel: Channel | null = null; // private-agency-{agencyId}, agents/partenaires uniquement
  private activeConnectionKey: string | null = null;
  private activeAgencyId: number | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Ouvre la connexion Pusher et s'abonne au canal privé de l'utilisateur
   * (`private-user-{id}`). À appeler juste après un login réussi, ou au
   * boot si un token valide est déjà en mémoire (voir AuthService).
   *
   * ⚠️ Idempotent par design : voir commentaire d'origine plus bas.
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
      console.error('Échec de la souscription au canal Pusher (user)', status);
    });

    console.log('we are connected to pusher server');
  }

  /**
   * 👈 NOUVEAU : à appeler UNIQUEMENT pour les comptes partenaire/agent, juste
   * après connectRealtime(), quand on connaît l'agencyId de l'agent
   * (AuthService en dispose via response.user.agent.agency.id).
   *
   * S'abonne au canal `private-agency-{agencyId}` sur lequel
   * NotificationBroadcastService (backend) diffuse les notifications
   * `agency_all` scopées à CETTE agence (annonces internes, alertes agence,
   * etc.). Sans cet abonnement, ces notifications ne sont jamais reçues
   * en temps réel côté app partenaire — seul le push FCM natif les sortirait.
   */
  subscribeToAgencyChannel(agencyId: number): void {
    if (!this.pusher) {
      console.warn('subscribeToAgencyChannel appelé avant connectRealtime()');
      return;
    }
    if (this.agencyChannel && this.activeAgencyId === agencyId) {
      return; // déjà abonné à cette agence
    }
    if (this.agencyChannel) {
      this.agencyChannel.unbind_all();
      this.pusher.unsubscribe(`private-agency-${this.activeAgencyId}`);
    }

    this.activeAgencyId = agencyId;
    this.agencyChannel = this.pusher.subscribe(`private-agency-${agencyId}`);

    this.agencyChannel.bind('new-notification', (payload: Notification) => {
      this.addLocalNotification(payload);
    });

    this.agencyChannel.bind('pusher:subscription_error', (status: unknown) => {
      console.error(
        'Échec de la souscription au canal Pusher (agence)',
        status
      );
    });
  }

  /** À appeler au logout pour ne plus écouter le(s) canal(aux) de l'utilisateur déconnecté. */
  disconnectRealtime(): void {
    if (this.channel) {
      this.channel.unbind_all();
      this.channel = null;
    }
    if (this.agencyChannel) {
      this.agencyChannel.unbind_all();
      this.agencyChannel = null;
    }
    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
    }
    this.activeConnectionKey = null;
    this.activeAgencyId = null;
    this.notificationsSubject.next([]);
    this.unreadCount$.next(0);
  }

  /**
   * Charger les notifications
   */
  private loadNotifications(): void {
    this.getUnreadNotifications().subscribe((notifications) => {
      this.notificationsSubject.next(notifications);
      this.unreadCount$.next(notifications.length);
    });
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
   * Marquer une notification comme lue.
   * 👈 CORRIGÉ : met désormais à jour le state local (notifications$ +
   * unreadCount$) au lieu de laisser la notif "lue" trainer côté front.
   */
  markAsRead(notificationId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${notificationId}/read`, {}).pipe(
      tap(() => {
        const remaining = this.notificationsSubject.value.filter(
          (n) => n.id !== notificationId
        );
        this.notificationsSubject.next(remaining);
        this.unreadCount$.next(remaining.length);
      })
    );
  }

  /**
   * Marquer toutes les notifications comme lues.
   * 👈 CORRIGÉ : vide le state local en conséquence.
   */
  markAllAsRead(): Observable<any> {
    return this.http.patch(`${this.apiUrl}/mark-all-read`, {}).pipe(
      tap(() => {
        this.notificationsSubject.next([]);
        this.unreadCount$.next(0);
      })
    );
  }

  /**
   * Supprimer une notification.
   * 👈 CORRIGÉ : retire l'entrée du state local après succès.
   */
  deleteNotification(notificationId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${notificationId}`).pipe(
      tap(() => {
        const remaining = this.notificationsSubject.value.filter(
          (n) => n.id !== notificationId
        );
        this.notificationsSubject.next(remaining);
        this.unreadCount$.next(remaining.length);
      })
    );
  }

  /**
   * Obtenir le nombre de notifications non lues (depuis l'API, indépendant
   * du state local — utile pour un premier chargement hors connexion Pusher).
   */
  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread/count`);
  }

  /**
   * Ajouter une notification à l'état local (appelé aussi bien depuis le
   * canal user que le canal agence).
   */
  addLocalNotification(notification: Notification): void {
    const current = this.notificationsSubject.value;
    const updated = [notification, ...current];
    this.notificationsSubject.next(updated);
    this.unreadCount$.next(updated.length);
  }
}
