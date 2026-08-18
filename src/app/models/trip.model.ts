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
  estimatedArrivalTime: string;
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


export interface TripPoint {
  id: number;
  name: string;
  address: string;
  city: string;
}

export interface TripBus {
  id: number;
  registrationNumber: string;
  category: string;
  capacity: number;
}

/**
 * Détail complet d'un voyage (endpoint GET /trips/:id), utilisé par la page
 * trip-detail avant de passer à la réservation. Étend Trip avec les points
 * d'embarquement/débarquement disponibles et les infos bus/chauffeur.
 */
export interface TripDetail extends Trip {
  boardingPoints: TripPoint[];
  deboardingPoints: TripPoint[];
  departurePoint: TripPoint;
  arrivalPoint: TripPoint;
  estimatedArrivalTime: string;
  tripDate: string;
  driverName: string;
  seatsReserved: number;
  bus: TripBus;
  createdAt: string;
  updatedAt: string;
}

