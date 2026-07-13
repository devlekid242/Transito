export interface PromoCode {
  id: number;
  code: string;
  discountType: 'Pourcentage' | 'Montant fixe';
  discountValue: number;
  maxUsage?: number;
  currentUsage: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromoValidation {
  isValid: boolean;
  discountAmount: number;
  finalPrice: number;
  message?: string;
}
