import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Promo } from '../models';
import { unwrapCollection } from '../shared/rxjs-operators';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class PromoService {
  private apiUrl = `${environment.apiUrl}/promos`;

  constructor(private http: HttpClient) {}

  /**
   * Obtenir toutes les promotions actives
   */
  getActivePromos(): Observable<Promo[]> {
    return this.http
      .get<any>(`${this.apiUrl}/active`)
      .pipe(unwrapCollection<Promo>());
  }

  /**
   * Valider un code promo
   */
  validatePromoCode(code: string, tripId?: number): Observable<any> {
    let params = new HttpParams().set('code', code);
    if (tripId) {
      params = params.set('trip_id', tripId.toString());
    }
    return this.http.get(`${this.apiUrl}/validate`, { params });
  }

  /**
   * Appliquer un code promo à une réservation
   */
  applyPromoCode(reservationId: number, promoCode: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/apply`, {
      reservation_id: reservationId,
      promo_code: promoCode,
    });
  }

  /**
   * Obtenir la réduction d'un code promo
   */
  getPromoDiscount(code: string, amount: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/discount`, {
      params: new HttpParams()
        .set('code', code)
        .set('amount', amount.toString()),
    });
  }

  /**
   * Obtenir les codes promos de l'utilisateur
   */
  getUserPromos(): Observable<Promo[]> {
    return this.http
      .get<any>(`${this.apiUrl}/my-codes`)
      .pipe(unwrapCollection<Promo>());
  }
}
