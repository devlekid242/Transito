import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { unwrapCollection } from '../shared/rxjs-operators';
import { environment } from 'src/environments/environment.prod';

/**
 * 👈 CORRIGÉ : les statuts déclarés ici ('in_progress' | 'resolved') ne
 * correspondaient à AUCUN statut réellement renvoyé par le back
 * (SupportTicket::$status n'accepte que open | answered | closed | pending).
 * Résultat : les filtres et badges de la page liste ne matchaient jamais
 * rien. Alignement sur les vraies valeurs du back.
 */
export type SupportTicketStatus = 'open' | 'answered' | 'closed' | 'pending';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'critical';

export interface SupportTicket {
  id: number;
  subject: string;
  message?: string;
  category: 'booking' | 'payment' | 'technical' | 'complaint' | 'other';
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  createdAt: string;
  updatedAt?: string;
  closedAt?: string | null;
  slaDueAt?: string | null;
  slaBreached?: boolean;
  responseCount?: number;
  reservationId?: number;
  tripId?: number;
  agencyId?: number;
  responses?: SupportResponse[];
}

export interface SupportResponse {
  id: number;
  ticketId?: number;
  message: string;
  createdAt: string;
  isFromSupport?: boolean;
  author?: { id: number; fullName: string; isCurrentUser?: boolean } | null;
}

@Injectable({
  providedIn: 'root',
})
export class SupportService {
  private apiUrl = `${environment.apiUrl}/support`;

  constructor(private http: HttpClient) {}

  /**
   * Create support ticket
   */
  createTicket(ticket: Partial<SupportTicket>): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.apiUrl, ticket);
  }

  /**
   * Get user's support tickets
   */
  getMyTickets(): Observable<SupportTicket[]> {
    return this.http
      .get<any>(`${this.apiUrl}/my-tickets`)
      .pipe(unwrapCollection<SupportTicket>());
  }

  /**
   * Get single ticket details (avec ses réponses)
   */
  getTicket(ticketId: number): Observable<SupportTicket> {
    return this.http.get<SupportTicket>(`${this.apiUrl}/${ticketId}`);
  }

  /**
   * Ferme le ticket.
   * 👈 CORRIGÉ : remplace l'ancien updateTicketStatus() qui appelait
   * `PATCH /api/support/{id}`, une route qui n'existe pas côté back — seules
   * `/close` et `/reopen` existent pour un client.
   */
  closeTicket(ticketId: number, reason?: string): Observable<SupportTicket> {
    return this.http.post<SupportTicket>(`${this.apiUrl}/${ticketId}/close`, {
      reason,
    });
  }

  /**
   * Rouvre le ticket.
   */
  reopenTicket(ticketId: number): Observable<SupportTicket> {
    return this.http.post<SupportTicket>(
      `${this.apiUrl}/${ticketId}/reopen`,
      {},
    );
  }

  /**
   * Add response/reply to ticket
   */
  addResponse(ticketId: number, message: string): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(
      `${this.apiUrl}/${ticketId}/responses`,
      { message },
    );
  }

  // Récupérer les détails d'un ticket avec le fil de discussion
  getTicketDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  // // Envoyer une nouvelle réponse
  // addResponse(id: number, message: string): Observable<any> {
  //   return this.http.post(`${this.apiUrl}/${id}/responses`, { message });
  // }

  // // Optionnel : Clôturer le ticket
  // closeTicket(id: number, reason: string = ''): Observable<any> {
  //   return this.http.post(`${this.apiUrl}/${id}/close`, { reason });
  // }
}
