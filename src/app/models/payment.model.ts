export interface PaymentLog {
  id: number;
  reservationId: number;
  amount: number;
  currency: string;
  reference: string;
  paymentMethod: 'Card' | 'Mobile Money' | 'Bank Transfer' | 'Cash';
  status: 'Initié' | 'Complété' | 'Échoué' | 'Remboursé' | 'SUCCESS';
  transactionId?: string;
  paymentGateway?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRequest {
  reservationId: number;
  amount: number;
  paymentMethod:
    | 'MTN_MOMO'
    | 'AIRTEL_MONEY'
    | 'Card'
    | 'Mobile Money'
    | 'Bank Transfer'
    | 'Cash';
  phoneNumber?: string;
  cardDetails?: {
    number: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
  };
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  paymentLogId?: number;
  status: string;
  message?: string;
}
