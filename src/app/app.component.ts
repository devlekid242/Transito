import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Platform } from '@ionic/angular';
import { PushNotificationService } from './services/PushNotificationService.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  
  constructor(
    private platform: Platform,
    private pushService: PushNotificationService
  ) {}

  ngOnInit() {
    this.platform.ready().then(() => {
      // Activé globalement au démarrage de l'app !
      this.pushService.initPush();
    });
  }
}
