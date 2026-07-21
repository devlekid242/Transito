// src/app/services/PushNotificationService.service.ts
import { Injectable } from '@angular/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root' // Garantit que le service est un Singleton unique pour toute l'app
})
export class PushNotificationService {
  public unreadCount = new BehaviorSubject<number>(0);
  public notifications = new BehaviorSubject<any[]>([]);

  constructor(
    private platform: Platform,
    private router: Router
  ) {}

  initPush() {
    if (this.platform.is('capacitor')) {
      this.registerPush();
    }
  }

  private async registerPush() {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') return;

    await PushNotifications.register();

    // Enregistrement du Token
    PushNotifications.addListener('registration', (token) => {
      console.log('FCM Token Global: ', token.value);
      // Envoyez le token à votre backend MySQL/API
    });

    // 1. Réception globale (Application ouverte)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Notification reçue en premier plan : ', notification);
      
      // Mettre à jour le compteur global
      this.unreadCount.next(this.unreadCount.value + 1);
      
      // Stocker la notification dans la liste globale
      const currentNotifs = this.notifications.value;
      this.notifications.next([notification, ...currentNotifs]);
    });

    // 2. Action au clic globale (Application fermée ou en arrière-plan)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Action déclenchée depuis n\'importe quelle page : ', action);
      
      const data = action.notification.data;
      
      // Exemple de redirection selon les données fournies par votre backend
      if (data && data.route) {
        this.router.navigateByUrl(data.route);
      } else {
        this.router.navigateByUrl('/notifications');
      }
    });
  }
}