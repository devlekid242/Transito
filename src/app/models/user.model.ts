export interface User {
  id: number;
  fullName: string;
  email: string | null;
  phoneNumber: string;
  gender?: 'M' | 'F';
  dateOfBirth?: string;
  profileImage?: string;
  profilePhotoUrl?: string;
  role: 'Utilisateur' | 'Agent' | 'Partenaire';
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  prefNotifications?: number;
  prefLanguage?: string;
  prefDarkMode?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  address?: string;
  city?: string;
  country?: string;
  identityNumber?: string;
  identityType?: 'Passeport' | 'CNI' | 'Permis';
}

export interface UserUpdateRequest {
  fullName?: string;
  profileImage?: string;
  gender?: 'M' | 'F';
  dateOfBirth?: string;
  address?: string;
  city?: string;
  country?: string;
}
