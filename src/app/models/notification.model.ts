export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'Réservation' | 'Paiement' | 'Voyage' | 'Système' | 'Promotion';
  relatedId?: number;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  data: Notification[];
  total: number;
  unread: number;
}
