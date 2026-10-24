export type PaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED'
  | 'REFUND_PENDING'
  | 'REFUNDED_COMPLETED'
  | 'DUPLICATE';

export interface PaymentLog {
  id: number;
  reservationId: number;
  amount: number | string;
  currency: string;
  reference: string;
  paymentMethod: string;
  status: PaymentStatus;
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

export type PaymentConfirmationStatus =
  | 'confirmed'
  | 'pending'
  | 'failure'
  | 'expired'
  | 'refund_pending';

export interface PaymentConfirmationResponse {
  success: boolean;
  transactionId: string;
  status: PaymentConfirmationStatus;
  secondsUntilExpiration: number;
  nextCheckInSeconds: number;
  message: string | null;
}
