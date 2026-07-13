export interface Agency {
  id: number;
  name: string;
  shortName: string;
  description?: string;
  phoneNumber: string;
  email: string;
  address: string;
  city: string;
  rating: number;
  totalReviews: number;
  logo?: string;
  coverImage?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyPoint {
  id: number;
  agencyId: number;
  city: string;
  address: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyResponse {
  data: Agency[];
  total: number;
  page: number;
  pageSize: number;
}
