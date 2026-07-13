export interface Review {
  id: number;
  userId: number;
  agencyId?: number;
  tripId?: number;
  rating: number;
  comment: string;
  reviewType: 'Agence' | 'Voyage' | 'Bus';
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRequest {
  agencyId?: number;
  tripId?: number;
  rating: number;
  comment: string;
  reviewType: 'Agence' | 'Voyage' | 'Bus';
}
