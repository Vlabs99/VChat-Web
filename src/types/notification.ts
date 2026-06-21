export interface InAppNotification {
  notificationId: string;
  type: string; // 'REQUEST' | 'ACCEPTED'
  title: string;
  body: string;
  fromUserId: string;
  isRead: boolean;
  createdAt: number | any;
  chatId?: string;
}
