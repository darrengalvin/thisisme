'use client'

import Link from 'next/link'

export default function DatabaseSchemaPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Documentation
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Database Schema</h1>
          <p className="text-xl text-gray-600">
            Complete Supabase database setup for VAPI memory integration
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Overview */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Overview</h2>
            <p className="text-gray-700 mb-4">
              This schema creates the necessary database structure for VAPI memory integration, including tables for users, memories, media attachments, 
              and timeline organization. It includes proper indexes, Row Level Security (RLS) policies, and sample data for testing.
            </p>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Quick Setup:</h3>
              <p className="text-blue-800">Copy the SQL below and paste it into your Supabase SQL editor, then click "Run".</p>
            </div>
          </section>

          {/* Database Tables */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Database Tables</h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">📝 memories</h3>
                <p className="text-gray-600 text-sm mb-3">Core table storing user memories captured via VAPI</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• title, text_content</li>
                  <li>• user_id, approximate_date</li>
                  <li>• date_precision, timezone_id</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">📸 media</h3>
                <p className="text-gray-600 text-sm mb-3">Photos, videos, and files attached to memories</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• memory_id, type, storage_url</li>
                  <li>• file_name, file_size, mime_type</li>
                  <li>• thumbnail_url</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">👥 users</h3>
                <p className="text-gray-600 text-sm mb-3">User accounts (works with existing table)</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• id, email</li>
                  <li>• birth_year (optional)</li>
                  <li>• created_at, updated_at</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">📅 timezones</h3>
                <p className="text-gray-600 text-sm mb-3">Timeline containers for organizing memories</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• title, description, type</li>
                  <li>• creator_id, invite_code</li>
                  <li>• start_date, end_date</li>
                </ul>
              </div>
            </div>
          </section>

          {/* SQL Schema */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Complete SQL Schema</h2>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Copy & Paste into Supabase</h3>
                <button 
                  onClick={() => navigator.clipboard.writeText(sqlSchema)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  Copy SQL
                </button>
              </div>
              
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto max-h-96">
                <pre className="text-sm">
{`-- VAPI Memory Integration - Supabase Schema (Compatible Version)
-- Run this SQL in your Supabase SQL editor

-- Create memories table for VAPI integration
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500),
  text_content TEXT,
  user_id UUID NOT NULL,
  timezone_id UUID,
  date_precision VARCHAR(20) DEFAULT 'approximate',
  approximate_date VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create media table for photo/video attachments
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create timezones table for group/shared timelines
CREATE TABLE IF NOT EXISTS timezones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'PRIVATE',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  location VARCHAR(255),
  invite_code VARCHAR(50) UNIQUE,
  creator_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_approximate_date ON memories(approximate_date);
CREATE INDEX IF NOT EXISTS idx_memories_text_search ON memories USING gin(to_tsvector('english', title || ' ' || COALESCE(text_content, '')));
CREATE INDEX IF NOT EXISTS idx_media_memory_id ON media(memory_id);
CREATE INDEX IF NOT EXISTS idx_timezones_creator_id ON timezones(creator_id);

-- Enable Row Level Security (RLS)
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE timezones ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own memories" ON memories;
DROP POLICY IF EXISTS "Users can insert own memories" ON memories;
DROP POLICY IF EXISTS "Users can update own memories" ON memories;
DROP POLICY IF EXISTS "Users can delete own memories" ON memories;

-- RLS Policies for memories table
CREATE POLICY "Users can view own memories" ON memories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories" ON memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories" ON memories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories" ON memories
  FOR DELETE USING (auth.uid() = user_id);

-- Create a test user for VAPI webhook testing
INSERT INTO users (id, email) 
VALUES ('test-user-456', 'test@example.com')
ON CONFLICT (email) DO NOTHING;

-- Create sample memories for testing
INSERT INTO memories (title, text_content, user_id, approximate_date, date_precision) VALUES
  ('Learning to Drive', 'I was 16 when my dad taught me to drive in our old Honda Civic. I was so nervous but excited at the same time.', 'test-user-456', 'Age 16 (around 2006)', 'approximate'),
  ('High School Graduation', 'Graduation day was amazing. All my family was there and I felt so proud walking across that stage.', 'test-user-456', 'Age 18 (around 2008)', 'approximate'),
  ('First Job Interview', 'My first real job interview was at a local coffee shop. I was so nervous I spilled coffee on my shirt!', 'test-user-456', 'Age 19 (around 2009)', 'approximate')
ON CONFLICT DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timezones_updated_at BEFORE UPDATE ON timezones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`}
                </pre>
              </div>
            </div>
          </section>

          {/* Key Features */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Features</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🔒 Security Features</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Row Level Security:</strong> Users can only access their own memories</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Proper Policies:</strong> Separate policies for SELECT, INSERT, UPDATE, DELETE</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Cascade Deletes:</strong> Media automatically deleted with memories</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Performance Features</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">✓</span>
                    <span><strong>Optimized Indexes:</strong> Fast queries on user_id, dates, and text search</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">✓</span>
                    <span><strong>Full-Text Search:</strong> GIN index for searching memory content</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">✓</span>
                    <span><strong>Auto Timestamps:</strong> Automatic updated_at triggers</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Memory Organization */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Memory Organization</h2>
            
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline Structure</h3>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-purple-100 rounded-lg p-4 mb-3">
                    <h4 className="font-semibold text-purple-900">approximate_date</h4>
                    <p className="text-purple-700 text-sm">Human-readable descriptions</p>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>"Age 25"</p>
                    <p>"Summer 1982"</p>
                    <p>"Early childhood"</p>
                  </div>
                </div>

                <div className="text-center">
                  <div className="bg-blue-100 rounded-lg p-4 mb-3">
                    <h4 className="font-semibold text-blue-900">date_precision</h4>
                    <p className="text-blue-700 text-sm">Accuracy indicator</p>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>"exact"</p>
                    <p>"approximate"</p>
                    <p>"era"</p>
                  </div>
                </div>

                <div className="text-center">
                  <div className="bg-green-100 rounded-lg p-4 mb-3">
                    <h4 className="font-semibold text-green-900">text_content</h4>
                    <p className="text-green-700 text-sm">Rich memory details</p>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Full story</p>
                    <p>People involved</p>
                    <p>Sensory details</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Testing */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Testing Your Setup</h2>
            
            <div className="bg-yellow-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-900 mb-4">After Running the SQL:</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-2">1. Verify Tables Created</h4>
                  <p className="text-yellow-800 text-sm mb-3">Check that all tables appear in your Supabase dashboard</p>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    <li>✓ memories</li>
                    <li>✓ media</li>
                    <li>✓ timezones</li>
                    <li>✓ users (existing)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-yellow-900 mb-2">2. Test Sample Data</h4>
                  <p className="text-yellow-800 text-sm mb-3">Query the memories table to see test data</p>
                  <div className="bg-yellow-100 rounded p-2">
                    <code className="text-xs text-yellow-800">
                      SELECT * FROM memories WHERE user_id = 'test-user-456';
                    </code>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-100 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <strong>Next:</strong> Test your webhook functions using <code>node test-vapi-webhooks.js</code>
                </p>
              </div>
            </div>
          </section>

          {/* Troubleshooting */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Troubleshooting</h2>
            
            <div className="space-y-6">
              <div className="border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2">❌ Policy Already Exists Error</h3>
                <p className="text-red-700 text-sm mb-2">If you see "policy already exists" errors:</p>
                <p className="text-red-600 text-xs">The SQL includes DROP POLICY IF EXISTS statements to handle this automatically.</p>
              </div>

              <div className="border border-orange-200 rounded-lg p-4">
                <h3 className="font-semibold text-orange-900 mb-2">⚠️ Column Does Not Exist Error</h3>
                <p className="text-orange-700 text-sm mb-2">If your users table has different column names:</p>
                <p className="text-orange-600 text-xs">The SQL is designed to work with existing users tables. It only inserts basic id and email fields.</p>
              </div>

              <div className="border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">✅ Success Indicators</h3>
                <p className="text-green-700 text-sm mb-2">You should see:</p>
                <ul className="text-green-600 text-xs space-y-1">
                  <li>• Tables created successfully</li>
                  <li>• Indexes created</li>
                  <li>• Policies applied</li>
                  <li>• Sample data inserted</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Next Steps */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Next Steps</h2>
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-blue-900 mb-3">Database Complete ✅</h3>
                  <p className="text-blue-800 text-sm mb-3">Your database is now ready for VAPI integration!</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700 text-sm">
                    <li>Configure VAPI tools</li>
                    <li>Test webhook functions</li>
                    <li>Deploy and launch</li>
                  </ol>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-3">Continue Reading:</h3>
                  <div className="space-y-2">
                    <Link href="/docs/vapi-tools" className="block text-blue-600 hover:text-blue-800">
                      → VAPI Tools Configuration
                    </Link>
                    <Link href="/docs/api-testing" className="block text-blue-600 hover:text-blue-800">
                      → API Testing Guide
                    </Link>
                    <Link href="/docs/vapi-integration" className="block text-blue-600 hover:text-blue-800">
                      → Back to VAPI Integration Overview
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

const sqlSchema = `-- VAPI Memory Integration - Supabase Schema (Compatible Version)
-- Run this SQL in your Supabase SQL editor

-- Create memories table for VAPI integration
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500),
  text_content TEXT,
  user_id UUID NOT NULL,
  timezone_id UUID,
  date_precision VARCHAR(20) DEFAULT 'approximate',
  approximate_date VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create media table for photo/video attachments
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create timezones table for group/shared timelines
CREATE TABLE IF NOT EXISTS timezones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'PRIVATE',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  location VARCHAR(255),
  invite_code VARCHAR(50) UNIQUE,
  creator_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_approximate_date ON memories(approximate_date);
CREATE INDEX IF NOT EXISTS idx_memories_text_search ON memories USING gin(to_tsvector('english', title || ' ' || COALESCE(text_content, '')));
CREATE INDEX IF NOT EXISTS idx_media_memory_id ON media(memory_id);
CREATE INDEX IF NOT EXISTS idx_timezones_creator_id ON timezones(creator_id);

-- Enable Row Level Security (RLS)
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE timezones ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own memories" ON memories;
DROP POLICY IF EXISTS "Users can insert own memories" ON memories;
DROP POLICY IF EXISTS "Users can update own memories" ON memories;
DROP POLICY IF EXISTS "Users can delete own memories" ON memories;

-- RLS Policies for memories table
CREATE POLICY "Users can view own memories" ON memories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories" ON memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories" ON memories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories" ON memories
  FOR DELETE USING (auth.uid() = user_id);

-- Create a test user for VAPI webhook testing
INSERT INTO users (id, email) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com')
ON CONFLICT (email) DO NOTHING;

-- Create sample memories for testing
INSERT INTO memories (title, text_content, user_id, approximate_date, date_precision) VALUES
  ('Learning to Drive', 'I was 16 when my dad taught me to drive in our old Honda Civic. I was so nervous but excited at the same time.', '550e8400-e29b-41d4-a716-446655440000', 'Age 16 (around 2006)', 'approximate'),
  ('High School Graduation', 'Graduation day was amazing. All my family was there and I felt so proud walking across that stage.', '550e8400-e29b-41d4-a716-446655440000', 'Age 18 (around 2008)', 'approximate'),
  ('First Job Interview', 'My first real job interview was at a local coffee shop. I was so nervous I spilled coffee on my shirt!', '550e8400-e29b-41d4-a716-446655440000', 'Age 19 (around 2009)', 'approximate')
ON CONFLICT DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timezones_updated_at BEFORE UPDATE ON timezones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`
