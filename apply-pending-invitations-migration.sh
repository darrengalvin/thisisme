#!/bin/bash
echo "🔧 Applying pending_invitations table migration..."
echo ""
echo "Please run this SQL in your Supabase SQL Editor:"
echo "https://supabase.com/dashboard/project/_/sql"
echo ""
cat supabase/migrations/20250112_create_pending_invitations.sql
