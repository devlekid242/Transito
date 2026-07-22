import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule, NavController } from '@ionic/angular';
import { NotificationService } from '../../services/notification.service';


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
    private pushService: NotificationService

  ) {}

  ngOnInit() {
        // Écouter les nouvelles notifications pour l'affichage en temps réel
    // const notifs = this.pushService.getUnreadNotifications();

    // this.hasUnreadNotifications = notifs > 0;
  }

  goBack(): void {
    this.navCtrl.pop();
  }

  openNotifications() {
    // Réinitialiser le compteur lors de l'ouverture
    // this.pushService.unreadCount.next(0);
    
    this.navCtrl.navigateForward('/notifications');
  }
}