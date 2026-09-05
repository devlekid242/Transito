import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ticket } from '../models';
import { unwrapCollection } from '../shared/rxjs-operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  private apiUrl = `${environment.apiUrl}/tickets`;

  constructor(private http: HttpClient) {}

  /**
   * Get ticket details by ID
   */
  getTicket(ticketId: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.apiUrl}/${ticketId}`);
  }

  /**
   * Get tickets by reservation ID
   */
  getTicketsByReservation(reservationId: number): Observable<Ticket[]> {
    return this.http
      .get<any>(`${this.apiUrl}?reservation_id=${reservationId}`)
      .pipe(unwrapCollection<Ticket>());
  }

  /**
   * Validate ticket (mark as boarded)
   */
  validateTicket(ticketId: number, agentId: number): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.apiUrl}/${ticketId}/validate`, {
      agentId,
    });
  }

  /**
   * Cancel ticket
   */
  cancelTicket(ticketId: number): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.apiUrl}/${ticketId}`, {
      status: 'annule',
    });
  }

  /**
   * Get manifest for trip (all tickets)
   */
  getManifest(tripId: number): Observable<Ticket[]> {
    return this.http
      .get<any>(`${this.apiUrl}?trip_id=${tripId}`)
      .pipe(unwrapCollection<Ticket>());
  }

  /**
   * Get QR code for ticket
   */
  getTicketQr(bookingId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${bookingId}/qr`);
  }
}
