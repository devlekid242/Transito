import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaymentLog, PaymentRequest, PaymentResponse } from '../models';
import { unwrapCollection } from 'src/app/shared/rxjs-operators';
import { environment } from 'src/environments/environment';
import { IdempotencyService } from 'src/app/services/idempotency.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient, private idempotency: IdempotencyService) {}

  /**
   * Initier un paiement
   */
  initiatePayment(paymentRequest: PaymentRequest): Observable<PaymentResponse> {
    const key = this.idempotency.create('payment');
    return this.http.post<PaymentResponse>(
      `${this.apiUrl}/initiate`,
      paymentRequest,
      { headers: { 'Idempotency-Key': key } },
    );
  }

  /**
   * Confirmer un paiement
   */
  confirmPayment(
    transactionId: string,
    otp?: string,
  ): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.apiUrl}/confirm`, {
      transaction_id: transactionId,
      otp,
    });
  }

  /**
   * Obtenir l'historique des paiements
   */
  getPaymentHistory(): Observable<PaymentLog[]> {
    return this.http
      .get<any>(`${this.apiUrl}/history`)
      .pipe(unwrapCollection<PaymentLog>());
  }

  /**
   * Obtenir les détails d'un paiement
   */
  getPaymentDetail(paymentId: number): Observable<PaymentLog> {
    return this.http.get<PaymentLog>(`${this.apiUrl}/${paymentId}`);
  }

  /**
   * Rembourser un paiement
   */
  refundPayment(paymentId: number, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${paymentId}/refund`, { reason });
  }

  /**
   * Obtenir les moyens de paiement disponibles
   */
  getPaymentMethods(): Observable<any[]> {
    return this.http
      .get<any>(`${this.apiUrl}/methods`)
      .pipe(unwrapCollection<any>());
  }

  /**
   * Valider une carte bancaire
   */
  validateCard(
    cardNumber: string,
    expiryMonth: number,
    expiryYear: number,
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/validate-card`, {
      card_number: cardNumber,
      expiry_month: expiryMonth,
      expiry_year: expiryYear,
    });
  }

  /**
   * Obtenir le statut d'une transaction
   */
  getTransactionStatus(transactionId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/transaction/${transactionId}`);
  }

  /**
   * Ajouter un moyen de paiement sauvegardé
   */
  addSavedPaymentMethod(methodData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/saved-methods`, methodData);
  }

  /**
   * Obtenir les moyens de paiement sauvegardés
   */
  getSavedPaymentMethods(): Observable<any[]> {
    return this.http
      .get<any>(`${this.apiUrl}/saved-methods`)
      .pipe(unwrapCollection<any>());
  }

  /**
   * Définir un moyen comme par défaut
   */
  setDefaultPaymentMethod(methodId: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/saved-methods/${methodId}/default`,
      {},
    );
  }

  /**
   * Supprimer un moyen de paiement sauvegardé
   */
  deletePaymentMethod(methodId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/saved-methods/${methodId}`);
  }
}
