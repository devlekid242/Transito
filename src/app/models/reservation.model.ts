export interface Reservation {
  id: number;
  tripId: number;
  userId: number;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  seatNumber: string;
  totalPrice: number;
  status: 'Confirmé' | 'En attente' | 'Annulé' | 'Expiré';
  bookingDate: string;
  // Propriétés optionnelles - infos du trajet et agence
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
  paymentMethod: 'MTN_MOMO' | 'AIRTEL_MONEY';
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
