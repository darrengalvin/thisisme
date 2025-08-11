-- Support System Schema for Supabase
-- This migration adds a complete support ticketing system with kanban board functionality

-- Add is_admin field to users table
alter table public.users add column if not exists is_admin boolean default false;

-- Create tickets table
create table if not exists public.tickets (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  priority text check (priority in ('low', 'medium', 'high', 'critical')) not null default 'medium',
  status text check (status in ('open', 'in_progress', 'review', 'resolved', 'closed')) not null default 'open',
  stage text check (stage in ('backlog', 'todo', 'doing', 'testing', 'done')) not null default 'backlog',
  category text check (category in ('bug', 'feature', 'question', 'improvement')) not null default 'question',
  creator_id uuid references public.users(id) on delete cascade not null,
  assignee_id uuid references public.users(id) on delete set null,
  due_date timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create ticket_comments table
create table if not exists public.ticket_comments (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references public.tickets(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  comment text not null,
  is_internal boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create ticket_attachments table
create table if not exists public.ticket_attachments (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references public.tickets(id) on delete cascade not null,
  comment_id uuid references public.ticket_comments(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  file_size integer not null check (file_size > 0),
  uploaded_by uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create ticket_history table
create table if not exists public.ticket_history (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references public.tickets(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  action text check (action in ('status_change', 'assignment', 'priority_change', 'stage_move', 'created', 'commented')) not null,
  old_value text,
  new_value text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create ticket_notifications table
create table if not exists public.ticket_notifications (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references public.tickets(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  type text check (type in ('created', 'commented', 'status_changed', 'assigned', 'resolved')) not null,
  email_sent boolean default false not null,
  email_id text,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better performance
create index if not exists tickets_creator_id_idx on public.tickets(creator_id);
create index if not exists tickets_assignee_id_idx on public.tickets(assignee_id);
create index if not exists tickets_status_idx on public.tickets(status);
create index if not exists tickets_stage_idx on public.tickets(stage);
create index if not exists tickets_priority_idx on public.tickets(priority);
create index if not exists tickets_created_at_idx on public.tickets(created_at);
create index if not exists ticket_comments_ticket_id_idx on public.ticket_comments(ticket_id);
create index if not exists ticket_comments_user_id_idx on public.ticket_comments(user_id);
create index if not exists ticket_attachments_ticket_id_idx on public.ticket_attachments(ticket_id);
create index if not exists ticket_history_ticket_id_idx on public.ticket_history(ticket_id);
create index if not exists ticket_notifications_ticket_id_idx on public.ticket_notifications(ticket_id);
create index if not exists ticket_notifications_user_id_idx on public.ticket_notifications(user_id);

-- Add updated_at triggers
create trigger tickets_updated_at before update on public.tickets
  for each row execute procedure public.handle_updated_at();

create trigger ticket_comments_updated_at before update on public.ticket_comments
  for each row execute procedure public.handle_updated_at();

-- Enable Row Level Security
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.ticket_history enable row level security;
alter table public.ticket_notifications enable row level security;

-- RLS Policies for tickets
-- Users can view their own tickets
create policy "Users can view own tickets" on public.tickets
  for select using (creator_id = auth.uid());

-- Admins can view all tickets
create policy "Admins can view all tickets" on public.tickets
  for select using (
    exists (
      select 1 from public.users
      where id = auth.uid() and is_admin = true
    )
  );

-- Assigned users can view their assigned tickets
create policy "Assigned users can view assigned tickets" on public.tickets
  for select using (assignee_id = auth.uid());

-- Users can create tickets
create policy "Users can create tickets" on public.tickets
  for insert with check (creator_id = auth.uid());

-- Users can update their own tickets
create policy "Users can update own tickets" on public.tickets
  for update using (creator_id = auth.uid());

-- Admins can update any ticket
create policy "Admins can update all tickets" on public.tickets
  for update using (
    exists (
      select 1 from public.users
      where id = auth.uid() and is_admin = true
    )
  );

-- Assigned users can update their assigned tickets
create policy "Assigned users can update assigned tickets" on public.tickets
  for update using (assignee_id = auth.uid());

-- RLS Policies for ticket_comments
-- Users can view comments on tickets they can access
create policy "Users can view accessible ticket comments" on public.ticket_comments
  for select using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and (
        t.creator_id = auth.uid() or
        t.assignee_id = auth.uid() or
        exists (
          select 1 from public.users
          where id = auth.uid() and is_admin = true
        )
      )
    ) and (
      -- Non-internal comments are visible to all
      is_internal = false or
      -- Internal comments are only visible to admins
      exists (
        select 1 from public.users
        where id = auth.uid() and is_admin = true
      )
    )
  );

-- Users can add comments to accessible tickets
create policy "Users can add comments to accessible tickets" on public.ticket_comments
  for insert with check (
    user_id = auth.uid() and
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and (
        t.creator_id = auth.uid() or
        t.assignee_id = auth.uid() or
        exists (
          select 1 from public.users
          where id = auth.uid() and is_admin = true
        )
      )
    )
  );

-- RLS Policies for ticket_attachments
-- Users can view attachments on accessible tickets
create policy "Users can view accessible ticket attachments" on public.ticket_attachments
  for select using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and (
        t.creator_id = auth.uid() or
        t.assignee_id = auth.uid() or
        exists (
          select 1 from public.users
          where id = auth.uid() and is_admin = true
        )
      )
    )
  );

-- Users can add attachments to accessible tickets
create policy "Users can add attachments to accessible tickets" on public.ticket_attachments
  for insert with check (
    uploaded_by = auth.uid() and
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and (
        t.creator_id = auth.uid() or
        t.assignee_id = auth.uid() or
        exists (
          select 1 from public.users
          where id = auth.uid() and is_admin = true
        )
      )
    )
  );

-- RLS Policies for ticket_history
-- Users can view history of accessible tickets
create policy "Users can view accessible ticket history" on public.ticket_history
  for select using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and (
        t.creator_id = auth.uid() or
        t.assignee_id = auth.uid() or
        exists (
          select 1 from public.users
          where id = auth.uid() and is_admin = true
        )
      )
    )
  );

-- System can insert history records
create policy "System can insert ticket history" on public.ticket_history
  for insert with check (user_id = auth.uid());

-- RLS Policies for ticket_notifications
-- Users can view their own notifications
create policy "Users can view own ticket notifications" on public.ticket_notifications
  for select using (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
create policy "Users can update own ticket notifications" on public.ticket_notifications
  for update using (user_id = auth.uid());

-- System can insert notifications
create policy "System can insert ticket notifications" on public.ticket_notifications
  for insert with check (true);

-- Function to automatically create history entry when ticket is created
create or replace function public.handle_ticket_created()
returns trigger as $$
begin
  insert into public.ticket_history (ticket_id, user_id, action, new_value)
  values (new.id, new.creator_id, 'created', 'Ticket created');
  
  -- Create notification for admins
  insert into public.ticket_notifications (ticket_id, user_id, type)
  select new.id, u.id, 'created'
  from public.users u
  where u.is_admin = true and u.id != new.creator_id;
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_ticket_created
  after insert on public.tickets
  for each row execute procedure public.handle_ticket_created();

-- Function to handle ticket status changes
create or replace function public.handle_ticket_status_change()
returns trigger as $$
begin
  if old.status != new.status then
    insert into public.ticket_history (ticket_id, user_id, action, old_value, new_value)
    values (new.id, auth.uid(), 'status_change', old.status, new.status);
    
    -- Create notification for ticket creator if not the one making the change
    if new.creator_id != auth.uid() then
      insert into public.ticket_notifications (ticket_id, user_id, type)
      values (new.id, new.creator_id, 'status_changed');
    end if;
  end if;
  
  if old.stage != new.stage then
    insert into public.ticket_history (ticket_id, user_id, action, old_value, new_value)
    values (new.id, auth.uid(), 'stage_move', old.stage, new.stage);
  end if;
  
  if old.priority != new.priority then
    insert into public.ticket_history (ticket_id, user_id, action, old_value, new_value)
    values (new.id, auth.uid(), 'priority_change', old.priority, new.priority);
  end if;
  
  if old.assignee_id is distinct from new.assignee_id then
    insert into public.ticket_history (ticket_id, user_id, action, old_value, new_value)
    values (new.id, auth.uid(), 'assignment', old.assignee_id::text, new.assignee_id::text);
    
    -- Create notification for new assignee
    if new.assignee_id is not null then
      insert into public.ticket_notifications (ticket_id, user_id, type)
      values (new.id, new.assignee_id, 'assigned');
    end if;
  end if;
  
  -- Set resolved_at when status changes to resolved or closed
  if new.status in ('resolved', 'closed') and old.status not in ('resolved', 'closed') then
    new.resolved_at = timezone('utc'::text, now());
    
    -- Create notification for ticket creator
    if new.creator_id != auth.uid() then
      insert into public.ticket_notifications (ticket_id, user_id, type)
      values (new.id, new.creator_id, 'resolved');
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_ticket_updated
  before update on public.tickets
  for each row execute procedure public.handle_ticket_status_change();

-- Function to handle new comments
create or replace function public.handle_ticket_comment_created()
returns trigger as $$
begin
  insert into public.ticket_history (ticket_id, user_id, action, new_value)
  values (new.ticket_id, new.user_id, 'commented', 
    case when new.is_internal then 'Internal comment added' else 'Comment added' end);
  
  -- Create notifications for relevant users
  -- Notify ticket creator if they didn't make the comment
  insert into public.ticket_notifications (ticket_id, user_id, type)
  select new.ticket_id, t.creator_id, 'commented'
  from public.tickets t
  where t.id = new.ticket_id and t.creator_id != new.user_id;
  
  -- Notify assignee if they didn't make the comment
  insert into public.ticket_notifications (ticket_id, user_id, type)
  select new.ticket_id, t.assignee_id, 'commented'
  from public.tickets t
  where t.id = new.ticket_id and t.assignee_id is not null 
    and t.assignee_id != new.user_id and t.assignee_id != t.creator_id;
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_ticket_comment_created
  after insert on public.ticket_comments
  for each row execute procedure public.handle_ticket_comment_created();

-- Create view for ticket statistics
create or replace view public.ticket_stats as
select 
  count(*) as total_tickets,
  count(case when status = 'open' then 1 end) as open_tickets,
  count(case when status = 'in_progress' then 1 end) as in_progress_tickets,
  count(case when status = 'resolved' then 1 end) as resolved_tickets,
  count(case when status = 'closed' then 1 end) as closed_tickets,
  count(case when priority = 'critical' then 1 end) as critical_tickets,
  count(case when priority = 'high' then 1 end) as high_tickets,
  avg(extract(epoch from (resolved_at - created_at))/3600)::numeric(10,2) as avg_resolution_hours
from public.tickets;

-- Grant access to the view
grant select on public.ticket_stats to authenticated;