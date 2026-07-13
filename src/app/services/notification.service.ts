import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
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

  constructor(private http: HttpClient) {
    this.loadNotifications();
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
