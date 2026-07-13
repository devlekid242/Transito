import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, LoadingController, AlertController } from '@ionic/angular';
import { PaymentService } from '../../services/payment.service';

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'Card' | 'Mobile Money' | 'Bank Transfer' | 'Cash';
  icon: string;
  description: string;
  isAvailable: boolean;
}

@Component({
  selector: 'app-payment-method-selector',
  templateUrl: './payment-method-selector.component.html',
  styleUrls: ['./payment-method-selector.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class PaymentMethodSelectorComponent implements OnInit {
  paymentMethods: PaymentMethod[] = [];
  selectedMethod: PaymentMethod | null = null;
  isLoading = false;

  // Méthodes de paiement par défaut
  private defaultMethods: PaymentMethod[] = [
    {
      id: 'card',
      name: 'Carte Bancaire',
      type: 'Card',
      icon: 'credit_card',
      description: 'Visa, Mastercard, American Express',
      isAvailable: true,
    },
    {
      id: 'mobile',
      name: 'Mobile Money',
      type: 'Mobile Money',
      icon: 'smartphone',
      description: 'Orange Money, MTN Mobile Money, Airtel Money',
      isAvailable: true,
    },
    {
      id: 'bank',
      name: 'Virement Bancaire',
      type: 'Bank Transfer',
      icon: 'account_balance',
      description: 'Transfert bancaire direct',
      isAvailable: true,
    },
    {
      id: 'cash',
      name: 'Paiement à la Gare',
      type: 'Cash',
      icon: 'local_atm',
      description: 'Payez à la gare avec de l\'argent liquide',
      isAvailable: true,
    },
  ];

  constructor(
    private modalCtrl: ModalController,
    private paymentService: PaymentService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit() {
    this.loadPaymentMethods();
  }

  private async loadPaymentMethods() {
    this.isLoading = true;
    this.paymentService.getPaymentMethods().subscribe({
      next: (methods: any[]) => {
        // Si l'API retourne des méthodes personnalisées, les utiliser
        if (methods && methods.length > 0) {
          this.paymentMethods = methods.map((method: any) => ({
            id: method.id || method.type?.toLowerCase(),
            name: method.name || this.getMethodName(method.type),
            type: method.type,
            icon: this.getMethodIcon(method.type),
            description: method.description || this.getMethodDescription(method.type),
            isAvailable: method.isAvailable !== false,
          }));
        } else {
          this.paymentMethods = this.defaultMethods;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des moyens de paiement:', err);
        // Utiliser les méthodes par défaut en cas d'erreur
        this.paymentMethods = this.defaultMethods;
        this.isLoading = false;
      },
    });
  }

  selectMethod(method: PaymentMethod) {
    this.selectedMethod = method;
  }

  async confirmSelection() {
    if (!this.selectedMethod) {
      await this.showAlert('Erreur', 'Veuillez sélectionner un moyen de paiement');
      return;
    }

    await this.modalCtrl.dismiss(this.selectedMethod);
  }

  cancel() {
    this.modalCtrl.dismiss(null);
  }

  private getMethodName(type: string): string {
    const nameMap: Record<string, string> = {
      'Card': 'Carte Bancaire',
      'Mobile Money': 'Mobile Money',
      'Bank Transfer': 'Virement Bancaire',
      'Cash': 'Paiement à la Gare',
    };
    return nameMap[type] || type;
  }

  private getMethodIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'Card': 'credit_card',
      'Mobile Money': 'smartphone',
      'Bank Transfer': 'account_balance',
      'Cash': 'local_atm',
    };
    return iconMap[type] || 'payment';
  }

  private getMethodDescription(type: string): string {
    const descriptionMap: Record<string, string> = {
      'Card': 'Visa, Mastercard, American Express',
      'Mobile Money': 'Orange Money, MTN Mobile Money, Airtel Money',
      'Bank Transfer': 'Transfert bancaire direct',
      'Cash': 'Payez à la gare avec de l\'argent liquide',
    };
    return descriptionMap[type] || '';
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
