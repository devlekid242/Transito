import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  NavController,
  LoadingController,
  AlertController,
  ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular';
import { PaymentService } from '../../../services/payment.service';
import { PaymentLog } from '../../../models';

@Component({
  selector: 'app-payment-history',
  templateUrl: './payment-history.page.html',
  styleUrls: ['./payment-history.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, CommonModule],
})
export class PaymentHistoryPage
  implements OnInit, ViewWillEnter, ViewWillLeave
{
  payments: PaymentLog[] = [];
  filteredPayments: PaymentLog[] = [];
  isLoading = false;
  selectedFilter: 'all' | 'completed' | 'failed' | 'refunded' = 'all';
  totalSpent: number = 0;

  constructor(
    private navCtrl: NavController,
    private paymentService: PaymentService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit() {
    this.loadPaymentHistory();
  }

  ionViewWillEnter() {
    this.loadPaymentHistory();
  }

  ionViewWillLeave() {
    this.isLoading = false;
  }

  private async loadPaymentHistory() {
    this.isLoading = true;

    this.paymentService.getPaymentHistory().subscribe({
      next: (payments: PaymentLog[]) => {
        this.payments = payments.sort((a, b) => {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        this.calculateTotal();
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement historique:', err);
        this.isLoading = false;
        this.showAlert(
          'Erreur',
          "Impossible de charger l'historique des paiements",
        );
      },
    });
  }

  private calculateTotal() {
    this.totalSpent = this.payments
      .filter((p) => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0);
  }

  applyFilter() {
    switch (this.selectedFilter) {
      case 'completed':
        this.filteredPayments = this.payments.filter(
          (p) => p.status === 'SUCCESS',
        );
        break;
      case 'failed':
        this.filteredPayments = this.payments.filter(
          (p) => p.status === 'Échoué',
        );
        break;
      case 'refunded':
        this.filteredPayments = this.payments.filter(
          (p) => p.status === 'Remboursé',
        );
        break;
      default:
        this.filteredPayments = this.payments;
    }
  }

  setFilter(filter: 'all' | 'completed' | 'failed' | 'refunded') {
    this.selectedFilter = filter;
    this.applyFilter();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Complété':
        return 'success';
      case 'Échoué':
        return 'error';
      case 'Remboursé':
        return 'warning';
      case 'Initié':
        return 'medium';
      default:
        return 'secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Complété':
      case 'SUCCESS':
        return 'fa-solid fa-circle-check';
      case 'Échoué':
        return 'fa-solid fa-circle-xmark';
      case 'Remboursé':
        return 'fa-solid fa-rotate-left';
      case 'Initié':
        return 'fa-solid fa-clock';
      default:
        return 'fa-solid fa-circle-info';
    }
  }

  getPaymentMethodIcon(method: string): string {
    switch (method) {
      case 'Card':
        return 'fa-solid fa-credit-card';
      case 'Mobile Money':
        return 'fa-solid fa-mobile-screen-button';
      case 'Bank Transfer':
        return 'fa-solid fa-building-columns';
      case 'Cash':
        return 'fa-solid fa-money-bill-wave';
      default:
        return 'fa-solid fa-receipt';
    }
  }

  viewPaymentDetails(payment: PaymentLog) {
    // Navigation vers détails du paiement
    this.navCtrl.navigateForward(`/payment-detail/${payment.id}`);
  }

  downloadReceipt(payment: PaymentLog) {
    // Générer et télécharger le reçu
    this.showAlert(
      'Reçu',
      `Reçu pour transaction #${payment.transactionId} généré`,
    );
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
