export interface Bus {
  id: number;
  agencyId: number;
  licensePlate: string;
  brand: string;
  model: string;
  category: 'VIP' | 'Classique' | 'Standard';
  totalSeats: number;
  seatLayout: string;
  features?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusResponse {
  data: Bus[];
  total: number;
  page: number;
  pageSize: number;
}
