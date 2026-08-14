import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BookingRequest, Reservation } from '../models';
import { unwrapCollection } from '../shared/rxjs-operators';
import { environment } from '../../environments/environment';
import { IdempotencyService } from './idempotency.service';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private apiUrl = `${environment.apiUrl}/bookings`;

  constructor(private http: HttpClient, private idempotency: IdempotencyService) {}

  /**
   * Créer une nouvelle réservation
   */
  createBooking(booking: BookingRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}`, booking, { headers: { 'Idempotency-Key': this.idempotency.create('booking') } });
  }

  /**
   * Obtenir les détails d'une réservation
   */
  getBookingDetail(bookingId: number): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}/${bookingId}`);
  }

  /**
   * Obtenir les réservations de l'utilisateur
   */
  getUserBookings(): Observable<Reservation[]> {
    return this.http
      .get<any>(`${this.apiUrl}/my-bookings`)
      .pipe(unwrapCollection<Reservation>());
  }

  /**
   * Obtenir les réservations actives
   */
  getActiveBookings(): Observable<Reservation[]> {
    return this.http
      .get<any>(`${this.apiUrl}/active`)
      .pipe(unwrapCollection<Reservation>());
  }

  /**
   * Obtenir l'historique des réservations
   */
  getBookingHistory(): Observable<Reservation[]> {
    return this.http
      .get<any>(`${this.apiUrl}/history`)
      .pipe(unwrapCollection<Reservation>());
  }

  /**
   * Annuler une réservation
   */
  cancelBooking(bookingId: number, reason?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${bookingId}/cancel`, { reason }, { headers: { 'Idempotency-Key': this.idempotency.create(`booking-cancel-${bookingId}`) } });
  }

  /**
   * Modifier une réservation
   */
  updateBooking(
    bookingId: number,
    booking: Partial<BookingRequest>,
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/${bookingId}`, booking);
  }

  /**
   * Valider les places disponibles
   */
  validateSeats(tripId: number, seatNumbers: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/validate-seats`, {
      trip_id: tripId,
      seat_numbers: seatNumbers,
    });
  }
}
