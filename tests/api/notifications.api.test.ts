import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as notificationsGET, POST as notificationsPOST } from '@/app/api/notifications/route';
import { POST as markReadPOST } from '@/app/api/notifications/mark-read/route';
import {
  createMockRequest,
  extractJSON,
  mockEnvVars,
} from './helpers';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

import * as auth from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

describe('Notifications API Integration Tests', () => {
  let envRestore: { restore: () => void };

  beforeEach(() => {
    envRestore = mockEnvVars({
      JWT_SECRET: 'test-secret',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    envRestore.restore();
  });

  describe('GET /api/notifications', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/notifications',
      });

      const response = await notificationsGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should fetch notifications for authenticated user', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockNotifications = [
        {
          id: 'notif-1',
          user_id: 'user-123',
          title: 'Test Notification',
          message: 'Test message',
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: 'notif-2',
          user_id: 'user-123',
          title: 'Another Notification',
          message: 'Another message',
          is_read: true,
          created_at: new Date().toISOString(),
        },
      ];

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: mockNotifications, error: null })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/notifications',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await notificationsGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notifications).toHaveLength(2);
      expect(data.unreadCount).toBe(1); // Only 1 unread
    });

    it('should return empty array when no notifications', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/notifications',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await notificationsGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notifications).toEqual([]);
      expect(data.unreadCount).toBe(0);
    });

    it('should count unread notifications correctly', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockNotifications = [
        { id: '1', user_id: 'user-123', is_read: false, created_at: new Date().toISOString() },
        { id: '2', user_id: 'user-123', is_read: false, created_at: new Date().toISOString() },
        { id: '3', user_id: 'user-123', is_read: false, created_at: new Date().toISOString() },
        { id: '4', user_id: 'user-123', is_read: true, created_at: new Date().toISOString() },
      ];

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: mockNotifications, error: null })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/notifications',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await notificationsGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.unreadCount).toBe(3); // 3 unread out of 4 total
    });

    it('should handle database errors gracefully', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: { code: 'DB_ERROR', message: 'Database error' } 
              })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/notifications',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await notificationsGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/notifications (mark-read in same route)', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/notifications',
        body: {
          notificationIds: ['notif-1'],
        },
      });

      const response = await notificationsPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should mark specific notifications as read', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      }));

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        update: updateMock,
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/notifications',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          notificationIds: ['notif-1', 'notif-2'],
        },
      });

      const response = await notificationsPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(updateMock).toHaveBeenCalled();
    });

    it('should mark all notifications as read when markAllRead is true', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      }));

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        update: updateMock,
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/notifications',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          markAllRead: true,
        },
      });

      const response = await notificationsPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(updateMock).toHaveBeenCalled();
    });
  });

  describe('POST /api/notifications/mark-read', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/notifications/mark-read',
        body: {
          notificationIds: ['notif-1'],
        },
      });

      const response = await markReadPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should mark specific notifications as read', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      }));

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        update: updateMock,
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/notifications/mark-read',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          notificationIds: ['notif-1', 'notif-2', 'notif-3'],
        },
      });

      const response = await markReadPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(updateMock).toHaveBeenCalled();
    });

    it('should mark all notifications as read', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      }));

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        update: updateMock,
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/notifications/mark-read',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          markAllRead: true,
        },
      });

      const response = await markReadPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(updateMock).toHaveBeenCalled();
    });

    it('should handle database update errors', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: { code: 'DB_ERROR', message: 'Update failed' } 
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/notifications/mark-read',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          notificationIds: ['notif-1'],
        },
      });

      const response = await markReadPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('Security Tests', () => {
    it('should only fetch notifications for the authenticated user', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const eqMock = vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      }));

      const selectMock = vi.fn(() => ({
        eq: eqMock,
      }));

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: selectMock,
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/notifications',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      await notificationsGET(request);

      // Verify that eq was called with the user's ID
      expect(eqMock).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should only mark read for notifications belonging to authenticated user', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const eqUserMock = vi.fn(() => ({
        in: vi.fn(() => Promise.resolve({ data: null, error: null })),
      }));

      const updateMock = vi.fn(() => ({
        eq: eqUserMock,
      }));

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        update: updateMock,
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/notifications/mark-read',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          notificationIds: ['notif-1', 'notif-2'],
        },
      });

      await markReadPOST(request);

      // Verify that eq was called with user_id to ensure data isolation
      expect(eqUserMock).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });
});
