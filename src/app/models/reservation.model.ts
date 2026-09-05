export interface ReservationTicket {
  id: number;
  ticketNumber: string;
  seatNumber: number;
  passengerName: string;
  passengerPhone: string;
  qrCodeToken: string | null;
  /** 'Utilisé' | 'En attente' | 'Annulé' | '' */
  status: string;
}

export interface ReservationRefund {
  status: string; // e.g. 'REFUNDED_COMPLETED'
  amount: string;
}

export interface Reservation {
  id: number;
  tripId: number;
  userId: number;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  seatNumber: string;
  totalPrice: number;
  /** Statut de la RÉSERVATION (niveau contrat) */
  status: 'Confirmé' | 'En attente' | 'Annulé' | 'Expiré' | 'Remboursé';
  boardingPoint?: string;
  deboardingPoint?: string;
  paymentExpiresAt?: string;
  refund?: ReservationRefund | null;
  canCancel?: boolean;
  bookingDate: string;
  /** Billets rattachés — le statut du ticket (Utilisé, En attente…) est DISTINCT du statut de la réservation */
  tickets?: ReservationTicket[];
  trip?: {
    id: number;
    departureCity: string;
    arrivalCity: string;
    departureTime: string;
    arrivalTime: string;
    departureDate: string;
    agencyLogo?: string;
    agencyId: number;
    agencyName?: string;
    pricePerSeat: number;
    busLicensePlate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Passenger {
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string;
  identityNumber?: string;
  identityType?: 'Passeport' | 'CNI' | 'Permis';
  isMainPassenger: boolean;
}

export interface Baggage {
  id?: number;
  reservationId?: number;
  weight: number;
  description: string;
  baggageType: 'Bagage à main' | 'Bagage en soute' | 'Équipement spécial';
}

export interface BookingRequest {
  tripId: number;
  passengers: Passenger[];
  baggages: Baggage[];
  paymentPhone: string;
  paymentMethod: any;
  totalPrice: number;
  promoCodeId?: number;
  boardingPoint?: string;
  deboardingPoint?: string;
}

export interface ReservationResponse {
  data: Reservation[];
  total: number;
  page: number;
  pageSize: number;
}
