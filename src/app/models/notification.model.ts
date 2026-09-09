export interface Notification {
  id: number;
  userId?: number;
  recipientType?: string;
  recipientId?: number;
  title: string;
  message?: string;
  content?: string;
  type?: 'Réservation' | 'Paiement' | 'Voyage' | 'Système' | 'Promotion' | string;
  category?: string;
  payload?: any;
  relatedId?: number;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationResponse {
  data: Notification[];
  total: number;
  unread: number;
}
