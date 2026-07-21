import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule, NavController } from '@ionic/angular';
import { PushNotificationService } from '../../services/PushNotificationService.service';


@Component({
  selector: 'app-partner-header',
  templateUrl: './partner-header.component.html',
  styleUrls: ['./partner-header.component.scss'],
  imports: [CommonModule, IonicModule]
})
export class PartnerHeaderComponent {
  @Input() title: string = '';
  @Output() menuClicked = new EventEmitter<void>();

  
  hasUnreadNotifications: boolean = false;

  constructor(
    private navCtrl: NavController,
    private pushService: PushNotificationService

  ) {}

  ngOnInit() {
        // Écouter les nouvelles notifications pour l'affichage en temps réel
    this.pushService.unreadCount.subscribe(count => {
      this.hasUnreadNotifications = count > 0;
    });
  }

  goBack(): void {
    this.navCtrl.pop();
  }

  openNotifications() {
    // Réinitialiser le compteur lors de l'ouverture
    this.pushService.unreadCount.next(0);
    
    this.navCtrl.navigateForward('/notifications');
  }
}