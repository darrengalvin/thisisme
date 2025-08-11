# Support System Setup Instructions

Your support system is ready to deploy! The 404 error you're seeing occurs because the database tables haven't been created yet.

## Quick Setup (Choose ONE option):

### Option 1: Run Migration in Supabase Dashboard (Recommended)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste the entire contents of `supabase/migrations/003_support_system.sql`
5. Click **Run** to execute the migration
6. Refresh your app - the support system should now work!

### Option 2: Set Your User as Admin
After running the migration, make yourself an admin so you can manage tickets:

```sql
-- Run this in Supabase SQL Editor
UPDATE public.users 
SET is_admin = true 
WHERE email = 'dgalvin@yourcaio.co.uk';
```

## What This Creates:

✅ **Database Tables:**
- `tickets` - Main support tickets
- `ticket_comments` - Comments on tickets  
- `ticket_attachments` - File attachments
- `ticket_history` - Audit trail of changes
- `ticket_notifications` - Email/app notifications

✅ **Features:**
- Complete kanban board for ticket management
- Priority levels (low, medium, high, critical)
- Status tracking (open, in_progress, review, resolved, closed)
- Stage management (backlog, todo, doing, testing, done)
- Comment system with internal/external comments
- File attachments
- Email notifications
- Automatic history tracking
- Row-level security (RLS) policies

✅ **API Endpoints Already Created:**
- `GET/POST /api/support/tickets` - List/create tickets
- `GET/PUT /api/support/tickets/[id]` - View/update specific ticket
- `POST /api/support/tickets/[id]/comments` - Add comments
- `GET /api/support/notifications` - User notifications

## After Setup:

1. **Access Support Center**: Go to `/support` in your app
2. **Admin Dashboard**: Go to `/admin/support` for ticket management
3. **Bulk Ticket Creation**: Go to `/admin/bulk-tickets` to create all the reported issues
4. **Kanban Board**: Go to `/admin/support/reports` for project management view

## Troubleshooting:

If you still get 404 errors after running the migration:
1. Check that all tables were created: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'ticket%';`
2. Verify your user exists: `SELECT id, email, is_admin FROM public.users WHERE email = 'dgalvin@yourcaio.co.uk';`
3. Restart your Next.js development server

## Ready to Create Tickets!

Once the database is set up, all your reported issues can be created as proper support tickets through the `/admin/bulk-tickets` interface:

1. Memory Edit Modal scrolling issue (HIGH)
2. View dropdown → toggle buttons (MEDIUM)
3. Chapter chronological sorting (HIGH) 
4. Chapter close without saving (HIGH)
5. Memory creation without pictures (MEDIUM)
6. Multiple picture uploads (MEDIUM)
7. Dictation feature (MEDIUM)

The entire support system infrastructure is ready - it just needs the database tables created! 🚀
