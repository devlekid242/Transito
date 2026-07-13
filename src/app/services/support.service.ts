import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { unwrapCollection } from '../shared/rxjs-operators';
import { environment } from 'src/environments/environment.prod';

export interface SupportTicket {
  id: number;
  userId: number;
  subject: string;
  message: string;
  category: 'booking' | 'payment' | 'technical' | 'complaint' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  attachments?: string[];
  responses?: SupportResponse[];
  createdAt: string;
  updatedAt?: string;
}

export interface SupportResponse {
  id: number;
  ticketId: number;
  agentId?: number;
  message: string;
  attachments?: string[];
  createdAt: string;
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
  createTicket(ticket: Partial<SupportTicket>): Observable<SupportTicket> {
    return this.http.post<SupportTicket>(this.apiUrl, ticket);
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
   * Get single ticket details
   */
  getTicket(ticketId: number): Observable<SupportTicket> {
    return this.http.get<SupportTicket>(`${this.apiUrl}/${ticketId}`);
  }

  /**
   * Update ticket status
   */
  updateTicketStatus(
    ticketId: number,
    status: string,
  ): Observable<SupportTicket> {
    return this.http.patch<SupportTicket>(`${this.apiUrl}/${ticketId}`, {
      status,
    });
  }

  /**
   * Add response/reply to ticket
   */
  addResponse(
    ticketId: number,
    response: Partial<SupportResponse>,
  ): Observable<SupportResponse> {
    return this.http.post<SupportResponse>(
      `${this.apiUrl}/${ticketId}/responses`,
      response,
    );
  }

  /**
   * Get ticket responses
   */
  getResponses(ticketId: number): Observable<SupportResponse[]> {
    return this.http
      .get<any>(`${this.apiUrl}/${ticketId}/responses`)
      .pipe(unwrapCollection<SupportResponse>());
  }
}
