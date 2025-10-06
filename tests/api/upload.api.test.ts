import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as uploadPOST } from '@/app/api/upload/route';
import {
  createMockRequest,
  extractJSON,
  mockEnvVars,
} from './helpers';

// Helper to create a mock file with arrayBuffer method
function createMockFile(content: string | Uint8Array, filename: string, type: string): File {
  const file = new File([content], filename, { type });
  // Add arrayBuffer method for Node.js environment
  if (typeof (file as any).arrayBuffer !== 'function') {
    Object.defineProperty(file, 'arrayBuffer', {
      value: async function() {
        if (content instanceof Uint8Array) {
          return content.buffer;
        }
        const encoder = new TextEncoder();
        return encoder.encode(content).buffer;
      }
    });
  }
  return file;
}

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/file.jpg' } })),
      })),
    },
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name) => {
      if (name === 'auth-token') {
        return { value: 'valid-token' };
      }
      return null;
    }),
  })),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

import * as auth from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

describe('Upload API Integration Tests', () => {
  let envRestore: { restore: () => void };

  beforeEach(() => {
    envRestore = mockEnvVars({
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    });

    vi.clearAllMocks();
    
    // Reset default mocks after clearAllMocks
    vi.mocked(auth.verifyToken).mockResolvedValue({
      userId: 'user-123',
      email: 'test@example.com',
    });
    
    vi.mocked(cookies).mockReturnValue({
      get: vi.fn((name) => {
        if (name === 'auth-token') {
          return { value: 'valid-token' };
        }
        return null;
      }),
    } as any);
    
    vi.mocked(createClient).mockReturnValue({
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/file.jpg' } })),
        })),
      },
    } as any);
  });

  afterEach(() => {
    envRestore.restore();
  });

  describe('POST /api/upload', () => {
    it('should require authentication', async () => {
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn(() => null), // No auth token
      } as any);

      // Create a mock file
      const mockFile = createMockFile('test content', 'test.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('file', mockFile);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/upload',
        body: formData,
      });

      // Manually set the FormData on the request
      Object.defineProperty(request, 'formData', {
        value: async () => formData,
      });

      const response = await uploadPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication required');
    });

    it('should reject invalid token', async () => {
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn(() => ({ value: 'invalid-token' })),
      } as any);

      vi.mocked(auth.verifyToken).mockResolvedValue(null);

      const mockFile = createMockFile('test', 'test.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('file', mockFile);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/upload',
        body: formData,
      });

      Object.defineProperty(request, 'formData', {
        value: async () => formData,
      });

      const response = await uploadPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid token');
    });

    it('should reject files larger than 10MB', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      // Create a mock file > 10MB
      const largeContent = new Uint8Array(11 * 1024 * 1024); // 11MB
      const mockFile = createMockFile(largeContent, 'large.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('file', mockFile);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/upload',
        body: formData,
      });

      Object.defineProperty(request, 'formData', {
        value: async () => formData,
      });

      const response = await uploadPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('smaller than 10MB');
    });

    it('should reject invalid file types', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const mockFile = createMockFile('test', 'test.pdf', 'application/pdf');
      const formData = new FormData();
      formData.append('file', mockFile);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/upload',
        body: formData,
      });

      Object.defineProperty(request, 'formData', {
        value: async () => formData,
      });

      const response = await uploadPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid file type');
      expect(data.allowedTypes).toBeDefined();
    });

    it('should accept JPEG images', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const mockFile = createMockFile('test', 'test.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('file', mockFile);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/upload',
        body: formData,
      });

      Object.defineProperty(request, 'formData', {
        value: async () => formData,
      });

      const response = await uploadPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.url).toBeDefined();
    });

    it('should accept PNG images', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const mockFile = createMockFile('test', 'test.png', 'image/png');
      const formData = new FormData();
      formData.append('file', mockFile);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/upload',
        body: formData,
      });

      Object.defineProperty(request, 'formData', {
        value: async () => formData,
      });

      const response = await uploadPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.url).toBeDefined();
    });

    it('should accept WebP images', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const mockFile = createMockFile('test', 'test.webp', 'image/webp');
      const formData = new FormData();
      formData.append('file', mockFile);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/upload',
        body: formData,
      });

      Object.defineProperty(request, 'formData', {
        value: async () => formData,
      });

      const response = await uploadPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.url).toBeDefined();
    });

    it('should organize uploads by user ID', async () => {
      const userId = 'user-456';
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId, 
        email: 'test@example.com' 
      });

      const uploadMock = vi.fn(() => Promise.resolve({ 
        data: { path: `uploads/${userId}/test-uuid-1234.jpg` }, 
        error: null 
      }));

      vi.mocked(createClient).mockReturnValue({
        storage: {
          from: vi.fn(() => ({
            upload: uploadMock,
            getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/file.jpg' } })),
          })),
        },
      } as any);

      const mockFile = createMockFile('test', 'test.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('file', mockFile);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/upload',
        body: formData,
      });

      Object.defineProperty(request, 'formData', {
        value: async () => formData,
      });

      await uploadPOST(request);

      // Verify upload was called with user-specific path
      expect(uploadMock).toHaveBeenCalled();
      const uploadPath = (uploadMock.mock.calls as any)[0]?.[0];
      expect(uploadPath).toContain(`uploads/${userId}/`);
    });

    it('should handle storage upload errors', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      vi.mocked(createClient).mockReturnValue({
        storage: {
          from: vi.fn(() => ({
            upload: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: { message: 'Storage quota exceeded' } 
            })),
          })),
        },
      } as any);

      const mockFile = createMockFile('test', 'test.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('file', mockFile);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/upload',
        body: formData,
      });

      Object.defineProperty(request, 'formData', {
        value: async () => formData,
      });

      const response = await uploadPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to upload');
    });

    it('should require file in form data', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const formData = new FormData();
      // No file attached

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/upload',
        body: formData,
      });

      Object.defineProperty(request, 'formData', {
        value: async () => formData,
      });

      const response = await uploadPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('Security Tests', () => {
    it('should sanitize file paths to prevent directory traversal', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const uploadMock = vi.fn(() => Promise.resolve({ 
        data: { path: 'uploads/user-123/test-uuid-1234.jpg' }, 
        error: null 
      }));

      vi.mocked(createClient).mockReturnValue({
        storage: {
          from: vi.fn(() => ({
            upload: uploadMock,
            getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/file.jpg' } })),
          })),
        },
      } as any);

      // Attempt path traversal in filename
      const mockFile = createMockFile('test', '../../../etc/passwd', 'image/jpeg');
      const formData = new FormData();
      formData.append('file', mockFile);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/upload',
        body: formData,
      });

      Object.defineProperty(request, 'formData', {
        value: async () => formData,
      });

      await uploadPOST(request);

      // The file should be uploaded with a safe UUID path
      const uploadPath = (uploadMock.mock.calls as any)[0]?.[0];
      expect(uploadPath).not.toContain('../');
      expect(uploadPath).toContain('uploads/user-123/');
    });

    it('should validate environment configuration', async () => {
      // Clear environment variables
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const mockFile = createMockFile('test', 'test.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('file', mockFile);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/upload',
        body: formData,
      });

      Object.defineProperty(request, 'formData', {
        value: async () => formData,
      });

      const response = await uploadPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.error).toContain('configuration error');

      // Restore env vars
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    });
  });
});
