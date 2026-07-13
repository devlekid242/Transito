export interface Trip {
  id: number;
  tripNumber: string;
  busId: number;
  agencyId: number;
  departurePointId: number;
  arrivalPointId: number;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  arrivalTime: string;
  boardingPoints: any[];
  deboardingPoints: any[];
  departureTimeOfDay: string;
  arrivalTimeOfDay: string;
  departureDate: string;
  category: 'VIP' | 'Classique' | 'Standard';
  maxSeats: number;
  availableSeats: number;
  pricePerSeat: number;
  status: 'Planifié' | 'En cours' | 'Terminé' | 'Annulé';
  // Propriétés optionnelles retournées par le backend
  agencyName?: string;
  agencyLogo?: string;
  busType?: string;
  boardingPoint?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripSearchParams {
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  category?: 'VIP' | 'Classique' | 'Standard';
  maxPrice?: number;
}

export interface TripResponse {
  data: Trip[];
  total: number;
  page: number;
  pageSize: number;
}
