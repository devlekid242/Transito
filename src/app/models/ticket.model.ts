export interface Ticket {
  id: number;
  agenceName: string;
  reservationId: number;
  ticketNumber: string;
  passengerName: string;
  tripNumber: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  arrivalTime: string;
  departureDate: string;
  seatNumber: string;
  price: number;
  busLicensePlate: string;
  qrCode?: string;
  status: 'Actif' | 'Utilisé' | 'Annulé' | 'Expiré';
  createdAt: string;
  updatedAt: string;
}

export interface TicketValidation {
  ticketId: number;
  validatedAt: string;
  validatedBy: string;
  status: 'Valide' | 'Invalide' | 'Expiré' | 'Déjà utilisé';
}
