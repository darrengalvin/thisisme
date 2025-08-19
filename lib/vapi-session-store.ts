import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface VapiSession {
  sessionId: string;
  userId: string;
  userData: {
    email: string;
    name: string;
    birthYear: number;
    currentAge: number;
  };
  createdAt: Date;
  expiresAt: Date;
}

export class VapiSessionStore {
  private static SESSION_TTL_MINUTES = 30;

  static async createSession(userId: string, userData: any): Promise<string> {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_TTL_MINUTES * 60 * 1000);

    const { error } = await supabase
      .from('vapi_sessions')
      .insert({
        session_id: sessionId,
        user_id: userId,
        user_data: userData,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      console.error('Error creating VAPI session:', error);
      throw error;
    }

    console.log(`✅ Created VAPI session: ${sessionId} for user: ${userId}`);
    return sessionId;
  }

  static async getSession(sessionId: string): Promise<VapiSession | null> {
    if (!sessionId) return null;

    const { data, error } = await supabase
      .from('vapi_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error || !data) {
      console.log(`❌ Session not found: ${sessionId}`);
      return null;
    }

    // Check if session is expired
    if (new Date(data.expires_at) < new Date()) {
      console.log(`⏰ Session expired: ${sessionId}`);
      await this.deleteSession(sessionId);
      return null;
    }

    return {
      sessionId: data.session_id,
      userId: data.user_id,
      userData: data.user_data,
      createdAt: new Date(data.created_at),
      expiresAt: new Date(data.expires_at)
    };
  }

  static async deleteSession(sessionId: string): Promise<void> {
    await supabase
      .from('vapi_sessions')
      .delete()
      .eq('session_id', sessionId);
  }

  static async cleanupExpiredSessions(): Promise<void> {
    const { error } = await supabase
      .from('vapi_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (!error) {
      console.log('🧹 Cleaned up expired VAPI sessions');
    }
  }
}