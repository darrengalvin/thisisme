import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as githubAuthGET } from '@/app/api/github/auth/route';
import { GET as githubCallbackGET } from '@/app/api/github/callback/route';
import { GET as githubStatusGET } from '@/app/api/github/status/route';
import {
  createMockRequest,
  extractJSON,
  mockEnvVars,
} from './helpers';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('@/lib/github/client', () => ({
  GitHubClient: vi.fn().mockImplementation(() => ({
    validateConnection: vi.fn(() => Promise.resolve({
      valid: true,
      user: {
        login: 'testuser',
        id: 123,
        avatar_url: 'https://avatar.url',
        name: 'Test User',
        email: 'test@example.com',
      },
      rateLimit: {
        limit: 5000,
        remaining: 4500,
        reset: Date.now() + 3600000,
      },
    })),
    analyzeCodebase: vi.fn(() => Promise.resolve({
      totalFiles: 100,
      files: [],
    })),
  })),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name) => {
      if (name === 'auth-token') {
        return { value: 'valid-token' };
      }
      if (name === 'github_oauth_state') {
        return { value: 'valid-state-123' };
      }
      return null;
    }),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

import * as auth from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

describe('GitHub OAuth API Integration Tests', () => {
  let envRestore: { restore: () => void };
  let fetchMock: any;

  beforeEach(() => {
    envRestore = mockEnvVars({
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      GITHUB_CLIENT_ID: 'test-client-id',
      GITHUB_CLIENT_SECRET: 'test-client-secret',
      NEXT_PUBLIC_URL: 'https://test.app',
      NODE_ENV: 'test',
    });

    vi.clearAllMocks();
    
    fetchMock = global.fetch = vi.fn();
    
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
        if (name === 'github_oauth_state') {
          return { value: 'valid-state-123' };
        }
        return null;
      }),
    } as any);
  });

  afterEach(() => {
    envRestore.restore();
  });

  describe('GET /api/github/auth (connect)', () => {
    it('should redirect to GitHub OAuth URL with correct parameters', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/github/auth?action=connect',
      });

      const response = await githubAuthGET(request);

      expect(response.status).toBe(307); // Redirect
      
      const location = response.headers.get('location');
      expect(location).toContain('github.com/login/oauth/authorize');
      expect(location).toContain('client_id=test-client-id');
      expect(location).toContain('redirect_uri=');
      expect(location).toContain('scope=');
      expect(location).toContain('state=');
    });

    it('should set secure OAuth state cookie', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/github/auth?action=connect',
      });

      const response = await githubAuthGET(request);

      // Check that a cookie is set
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toBeDefined();
      if (setCookieHeader) {
        expect(setCookieHeader).toContain('github_oauth_state');
        expect(setCookieHeader).toContain('HttpOnly');
      }
    });

    it('should require GitHub client credentials', async () => {
      // Remove GitHub credentials
      envRestore.restore();
      envRestore = mockEnvVars({
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_URL: 'https://test.app',
        // NO GitHub credentials
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/github/auth?action=connect',
      });

      const response = await githubAuthGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.error).toContain('GitHub OAuth not configured');
    });

    it('should include required OAuth scopes', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/github/auth?action=connect',
      });

      const response = await githubAuthGET(request);
      const location = response.headers.get('location');

      expect(location).toContain('scope=');
      const scopesMatch = location?.match(/scope=([^&]+)/);
      if (scopesMatch) {
        const scopes = decodeURIComponent(scopesMatch[1]);
        expect(scopes).toContain('repo');
        expect(scopes).toContain('workflow');
        expect(scopes).toContain('user:email');
      }
    });
  });

  describe('GET /api/github/auth (disconnect)', () => {
    it('should require authentication', async () => {
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn(() => null), // No auth token
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/github/auth?action=disconnect',
      });

      const response = await githubAuthGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication required');
    });

    it('should disconnect GitHub connection', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const deleteMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          delete: deleteMock,
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/github/auth?action=disconnect',
      });

      const response = await githubAuthGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('disconnected');
    });
  });

  describe('GET /api/github/callback', () => {
    it('should reject callback without code', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/github/callback',
      });

      const response = await githubCallbackGET(request);

      expect(response.status).toBe(307); // Redirect
      const location = response.headers.get('location');
      expect(location).toContain('error=no_code');
    });

    it('should validate state parameter', async () => {
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn((name) => {
          if (name === 'github_oauth_state') {
            return { value: 'different-state' }; // Mismatched state
          }
          return null;
        }),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/github/callback?code=test-code&state=wrong-state',
      });

      const response = await githubCallbackGET(request);

      expect(response.status).toBe(307); // Redirect
      const location = response.headers.get('location');
      expect(location).toContain('error=invalid_state');
    });

    it('should handle GitHub OAuth errors', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/github/callback?error=access_denied',
      });

      const response = await githubCallbackGET(request);

      expect(response.status).toBe(307); // Redirect
      const location = response.headers.get('location');
      expect(location).toContain('error=oauth_access_denied');
    });

    it('should exchange code for access token', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      // Mock cookies for both request.cookies AND next/headers cookies
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn((name) => {
          if (name === 'auth-token') {
            return { value: 'valid-token' };
          }
          if (name === 'github_oauth_state') {
            return { value: 'valid-state-123' }; // Must match the state in URL
          }
          return null;
        }),
      } as any);

      // Mock Supabase client for upsert and delete operations
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          upsert: vi.fn(() => Promise.resolve({ error: null })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
          insert: vi.fn(() => Promise.resolve({ error: null })),
        })),
      } as any);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'gho_test_token',
          scope: 'repo,workflow',
          token_type: 'bearer',
        }),
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          login: 'testuser',
          id: 123,
          email: 'test@github.com',
          avatar_url: 'https://avatar.url',
          name: 'Test User',
        }),
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          login: 'testuser',
          id: 123,
        }),
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => [], // No repos
      });

      // Create request with cookies directly on the request object
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/github/callback?code=test-code&state=valid-state-123',
      });
      
      // Add cookies to the request object using Object.defineProperty
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => {
            if (name === 'github_oauth_state') {
              return { value: 'valid-state-123' };
            }
            return null;
          },
        },
        writable: false,
        configurable: true,
      });

      const response = await githubCallbackGET(request);

      expect(response.status).toBe(307); // Redirect
      const location = response.headers.get('location');
      expect(location).toContain('github=connected');
    });

    it('should handle token exchange failure', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/github/callback?code=test-code&state=valid-state-123',
      });

      // Add cookies to the request object using Object.defineProperty
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => {
            if (name === 'github_oauth_state') {
              return { value: 'valid-state-123' };
            }
            return null;
          },
        },
        writable: false,
        configurable: true,
      });

      const response = await githubCallbackGET(request);

      expect(response.status).toBe(307); // Redirect
      const location = response.headers.get('location');
      expect(location).toContain('error=callback_failed');
    });
  });

  describe('GET /api/github/status', () => {
    it('should require authentication', async () => {
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn(() => null), // No auth token
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/github/status',
      });

      const response = await githubStatusGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication required');
    });

    it('should return not connected when no GitHub connection exists', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: { code: 'PGRST116' } 
              })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/github/status',
      });

      const response = await githubStatusGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.connected).toBe(false);
    });

    it('should return connection status with user details', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const mockConnection = {
        user_id: 'user-123',
        github_username: 'testuser',
        github_id: 123,
        access_token: 'gho_test_token',
      };

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn((table) => {
          if (table === 'github_connections') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ 
                    data: mockConnection, 
                    error: null 
                  })),
                })),
              })),
              update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
            };
          }
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({ // Support chained .eq() calls
                  order: vi.fn(() => Promise.resolve({ data: [], error: null })),
                })),
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          };
        }),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/github/status',
      });

      const response = await githubStatusGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.connected).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.login).toBe('testuser');
    });
  });

  describe('Security Tests', () => {
    it('should use HTTPS for OAuth redirects in production', async () => {
      envRestore.restore();
      envRestore = mockEnvVars({
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        GITHUB_CLIENT_ID: 'test-client-id',
        GITHUB_CLIENT_SECRET: 'test-client-secret',
        NEXT_PUBLIC_URL: 'https://production.app',
        NODE_ENV: 'production',
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/github/auth?action=connect',
      });

      const response = await githubAuthGET(request);
      const location = response.headers.get('location');

      // Check for URL-encoded HTTPS (redirect_uri=https%3A%2F%2F)
      expect(location).toContain('redirect_uri=https%3A%2F%2F');
    });

    it('should not leak GitHub client secret in errors', async () => {
      // This test ensures we don't accidentally expose the client secret
      envRestore.restore();
      envRestore = mockEnvVars({
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_URL: 'https://test.app',
        // Missing GitHub credentials
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/github/auth?action=connect',
      });

      const response = await githubAuthGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(JSON.stringify(data)).not.toContain('test-client-secret');
      expect(JSON.stringify(data)).not.toContain('GITHUB_CLIENT_SECRET');
    });

    it('should validate access token before storing connection', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      // Mock cookies for next/headers calls
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn((name) => {
          if (name === 'auth-token') {
            return { value: 'valid-token' };
          }
          return null;
        }),
      } as any);

      // First call: token exchange success
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'gho_test_token',
          scope: 'repo,workflow',
          token_type: 'bearer',
        }),
      })
      // Second call: user info success
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          login: 'testuser',
          id: 123,
        }),
      })
      // Third call: token validation FAILS
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/github/callback?code=test-code&state=valid-state-123',
      });

      // Add cookies to the request object using Object.defineProperty
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => {
            if (name === 'github_oauth_state') {
              return { value: 'valid-state-123' };
            }
            return null;
          },
        },
        writable: false,
        configurable: true,
      });

      const response = await githubCallbackGET(request);

      expect(response.status).toBe(307); // Redirect
      const location = response.headers.get('location');
      expect(location).toContain('error=invalid_token');
    });
  });
});
