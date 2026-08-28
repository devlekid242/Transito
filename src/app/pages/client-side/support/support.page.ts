import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonSpinner, IonHeader, NavController, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { SupportService, SupportTicket } from '../../../services/support.service';
import { UiNotificationService } from '../../../services/ui-notification.service';

@Component({
  selector: 'app-support',
  templateUrl: './support.page.html',
  styleUrls: ['./support.page.scss'],
  standalone: true,
  imports: [IonContent, IonSpinner, IonHeader, CommonModule, FormsModule],
})
export class SupportPage implements OnInit, ViewWillEnter, ViewWillLeave {
  // 👈 CORRIGÉ : name / email retirés (jamais envoyés au back, voir
  // support.page.html) pour éviter de faire croire qu'ils sont utilisés.
  subject = '';
  message = '';
  isSubmitting = false;

  supportNumber = '+237612345678';

  constructor(
    private navCtrl: NavController,
    private supportService: SupportService,
    private notificationService: UiNotificationService,
  ) {}

  ngOnInit() {}

  ionViewWillEnter() {}

  ionViewWillLeave() {
    this.isSubmitting = false;
  }

  async sendRequest() {
    if (!this.subject.trim() || !this.message.trim()) {
      await this.notificationService.showErrorAlert(
        'Veuillez renseigner le sujet et le message',
        'Erreur'
      );
      return;
    }

    this.isSubmitting = true;

    const ticketPayload: Partial<SupportTicket> = {
      subject: this.subject,
      message: this.message,
      category: 'other',
      priority: 'medium',
    };

    this.supportService.createTicket(ticketPayload).subscribe({
      next: async () => {
        this.isSubmitting = false;
        await this.notificationService.showSuccessAlert(
          'Votre demande a bien été envoyée au support.',
          'Succès'
        );
        this.subject = '';
        this.message = '';
        this.navCtrl.navigateBack('/support');
      },
      error: async (err) => {
        this.isSubmitting = false;
        console.error('Erreur support:', err);
        await this.notificationService.showErrorAlert(
          'Impossible d\'envoyer votre demande pour le moment',
          'Erreur'
        );
      },
    });
  }

  contactWhatsapp() {
    const url = `https://wa.me/${this.supportNumber.replace(/\D/g, '')}`;
    window.open(url, '_blank');
  }

  callSupport() {
    window.location.href = `tel:${this.supportNumber}`;
  }

  goBack() {
    this.navCtrl.navigateBack('/support');
  }
}