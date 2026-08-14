import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, AlertController, LoadingController, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { SupportService, SupportTicket } from '../../../services/support.service';

@Component({
  selector: 'app-support',
  templateUrl: './support.page.html',
  styleUrls: ['./support.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
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
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() {}

  ionViewWillEnter() {}

  ionViewWillLeave() {
    this.isSubmitting = false;
  }

  async sendRequest() {
    if (!this.subject.trim() || !this.message.trim()) {
      await this.showAlert('Erreur', 'Veuillez renseigner le sujet et le message');
      return;
    }

    this.isSubmitting = true;
    const loader = await this.loadingCtrl.create({
      message: 'Envoi de votre demande...',
    });
    await loader.present();

    const ticketPayload: Partial<SupportTicket> = {
      subject: this.subject,
      message: this.message,
      category: 'other',
      priority: 'medium',
    };

    this.supportService.createTicket(ticketPayload).subscribe({
      next: async () => {
        this.isSubmitting = false;
        loader.dismiss();
        await this.showAlert('Succès', 'Votre demande a bien été envoyée au support.');
        this.subject = '';
        this.message = '';
        this.navCtrl.back();
      },
      error: async (err) => {
        this.isSubmitting = false;
        loader.dismiss();
        console.error('Erreur support:', err);
        await this.showAlert('Erreur', 'Impossible d\'envoyer votre demande pour le moment');
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
    this.navCtrl.back();
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }
}