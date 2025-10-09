/**
 * Service for notification API operations
 */

import { apiClient } from '@/lib/api/client';

export interface SendNotificationResponse {
  success: boolean;
  notification_log_id: string;
  status: string;
  message: string;
}

export interface SignupVerificationRequest {
  user_id: string;
}

class NotificationService {
  private baseUrl = '/api/notifications';

  // Email verification
  async sendVerificationEmail(userId: string): Promise<SendNotificationResponse> {
    const response = await apiClient.post<SendNotificationResponse>(
      `${this.baseUrl}/send-verification-email`,
      { user_id: userId }
    );
    return response.data;
  }
}

export const notificationService = new NotificationService();