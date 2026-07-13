import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonicModule,
  NavController,
  ModalController,
  LoadingController,
  AlertController,
  ToastController,
} from '@ionic/angular';
import { PaymentService } from '../../../services/payment.service';
import { PaymentMethodSelectorComponent } from '../../../components/payment-method-selector/payment-method-selector.component';

interface SavedPaymentMethod {
  id: string;
  type: 'Card' | 'Mobile Money' | 'Bank Transfer' | 'Cash';
  name: string;
  lastDigits?: string;
  expiry?: string;
  icon: string;
  isDefault: boolean;
}

@Component({
  selector: 'app-manage-payment-methods',
  templateUrl: './manage-payment-methods.page.html',
  styleUrls: ['./manage-payment-methods.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class ManagePaymentMethodsPage implements OnInit {
  savedMethods: SavedPaymentMethod[] = [];
  isLoading = false;

  constructor(
    private navCtrl: NavController,
    private paymentService: PaymentService,
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit() {
    this.loadPaymentMethods();
  }

  private async loadPaymentMethods() {
    this.isLoading = true;
    const loader = await this.loadingCtrl.create({
      message: 'Chargement des moyens de paiement...',
    });
    await loader.present();

    this.paymentService.getPaymentMethods().subscribe({
      next: (methods: any[]) => {
        // Transformer les données reçues en SavedPaymentMethod
        this.savedMethods = methods.map((method: any, index: number) => ({
          id: method.id || `method-${index}`,
          type: method.type,
          name: method.name || this.getMethodName(method.type),
          lastDigits: method.lastDigits,
          expiry: method.expiry,
          icon: this.getMethodIcon(method.type),
          isDefault: method.isDefault || index === 0,
        }));
        this.isLoading = false;
        loader.dismiss();
      },
      error: async (err) => {
        await loader.dismiss();
        this.isLoading = false;
        console.error('Erreur lors du chargement des moyens de paiement:', err);
        await this.showAlert(
          'Erreur',
          'Impossible de charger vos moyens de paiement',
        );
      },
    });
  }

  async addPaymentMethod() {
    const modal = await this.modalCtrl.create({
      component: PaymentMethodSelectorComponent,
      cssClass: 'payment-method-modal',
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      // Ajouter le nouveau moyen de paiement
      const newMethod: SavedPaymentMethod = {
        id: `method-${Date.now()}`,
        type: data.type,
        name: data.name,
        icon: data.icon,
        isDefault: this.savedMethods.length === 0,
      };

      // Appeler l'API pour ajouter le moyen de paiement
      this.paymentService.addSavedPaymentMethod(newMethod).subscribe({
        next: (response) => {
          newMethod.id = response.id;
          this.savedMethods.push(newMethod);
          this.showToast('Moyen de paiement ajouté avec succès');
        },
        error: (err) => {
          console.error('Erreur:', err);
          this.showAlert('Erreur', "Impossible d'ajouter le moyen de paiement");
        },
      });
    }
  }

  async setAsDefault(method: SavedPaymentMethod) {
    // Appeler l'API pour mettre à jour comme par défaut
    this.paymentService.setDefaultPaymentMethod(method.id).subscribe({
      next: () => {
        this.savedMethods.forEach((m) => {
          m.isDefault = m.id === method.id;
        });
        this.showToast(`${method.name} défini comme moyen par défaut`);
      },
      error: (err) => {
        console.error('Erreur:', err);
        this.showAlert('Erreur', 'Impossible de mettre à jour');
      },
    });
  }

  async deletePaymentMethod(method: SavedPaymentMethod) {
    const alert = await this.alertCtrl.create({
      header: 'Supprimer ce moyen de paiement?',
      message: `Êtes-vous sûr de vouloir supprimer ${method.name}?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
        },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => {
            // Appeler l'API pour supprimer
            this.paymentService.deletePaymentMethod(method.id).subscribe({
              next: () => {
                this.savedMethods = this.savedMethods.filter(
                  (m) => m.id !== method.id,
                );
                this.showToast('Moyen de paiement supprimé');
              },
              error: (err) => {
                console.error('Erreur:', err);
                this.showAlert('Erreur', 'Impossible de supprimer le moyen');
              },
            });
          },
        },
      ],
    });
    await alert.present();
  }

  goBack() {
    this.navCtrl.back();
  }

  private getMethodName(type: string): string {
    const nameMap: Record<string, string> = {
      Card: 'Carte Bancaire',
      'Mobile Money': 'Mobile Money',
      'Bank Transfer': 'Virement Bancaire',
      Cash: 'Paiement à la Gare',
    };
    return nameMap[type] || type;
  }

  private getMethodIcon(type: string): string {
    const iconMap: Record<string, string> = {
      Card: 'credit_card',
      'Mobile Money': 'smartphone',
      'Bank Transfer': 'account_balance',
      Cash: 'local_atm',
    };
    return iconMap[type] || 'payment';
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'success',
    });
    await toast.present();
  }
}
