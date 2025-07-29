-- LIFE Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security
alter table auth.users enable row level security;

-- Create custom user profiles table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) primary key,
  email text unique not null,
  birth_year integer check (birth_year >= 1900 and birth_year <= extract(year from current_date)),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create timezones table (chapters/life phases)
create table public.timezones (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  type text check (type in ('PRIVATE', 'GROUP')) not null default 'PRIVATE',
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  location text,
  invite_code text unique,
  creator_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create timezone_members table (users belonging to chapters)
create table public.timezone_members (
  id uuid default gen_random_uuid() primary key,
  timezone_id uuid references public.timezones(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role text check (role in ('CREATOR', 'MEMBER')) not null default 'MEMBER',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(timezone_id, user_id)
);

-- Create memories table
create table public.memories (
  id uuid default gen_random_uuid() primary key,
  title text,
  text_content text,
  user_id uuid references public.users(id) on delete cascade not null,
  timezone_id uuid references public.timezones(id) on delete cascade,
  date_precision text check (date_precision in ('exact', 'approximate', 'era')),
  approximate_date text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create media table (photos, videos, etc.)
create table public.media (
  id uuid default gen_random_uuid() primary key,
  memory_id uuid references public.memories(id) on delete cascade not null,
  type text check (type in ('IMAGE', 'VIDEO', 'AUDIO')) not null,
  storage_url text not null,
  thumbnail_url text,
  file_name text not null,
  file_size integer not null check (file_size > 0),
  mime_type text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create invitations table (for sharing timezones)
create table public.invitations (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  timezone_id uuid references public.timezones(id) on delete cascade not null,
  created_by uuid references public.users(id) on delete cascade not null,
  is_active boolean default true not null,
  expires_at timestamp with time zone,
  status text check (status in ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED')) not null default 'PENDING',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create notifications table
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type text check (type in ('TIMEZONE_INVITATION', 'NEW_MEMORY', 'MEMBER_JOINED')) not null,
  title text not null,
  message text not null,
  data jsonb,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better performance
create index users_email_idx on public.users(email);
create index memories_user_id_idx on public.memories(user_id);
create index memories_timezone_id_idx on public.memories(timezone_id);
create index memories_created_at_idx on public.memories(created_at);
create index media_memory_id_idx on public.media(memory_id);
create index timezones_creator_id_idx on public.timezones(creator_id);
create index timezone_members_user_id_idx on public.timezone_members(user_id);
create index timezone_members_timezone_id_idx on public.timezone_members(timezone_id);
create index notifications_user_id_idx on public.notifications(user_id);
create index invitations_code_idx on public.invitations(code);

-- Create updated_at triggers
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger timezones_updated_at before update on public.timezones
  for each row execute procedure public.handle_updated_at();

create trigger memories_updated_at before update on public.memories
  for each row execute procedure public.handle_updated_at();

-- Row Level Security Policies

-- Users can only access their own profile
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- Timezones policies
create policy "Users can view timezones they are members of" on public.timezones
  for select using (
    exists (
      select 1 from public.timezone_members
      where timezone_id = timezones.id and user_id = auth.uid()
    )
  );

create policy "Users can create timezones" on public.timezones
  for insert with check (auth.uid() = creator_id);

create policy "Creators can update their timezones" on public.timezones
  for update using (auth.uid() = creator_id);

create policy "Creators can delete their timezones" on public.timezones
  for delete using (auth.uid() = creator_id);

-- Timezone members policies
create policy "Users can view timezone memberships" on public.timezone_members
  for select using (
    user_id = auth.uid() or
    exists (
      select 1 from public.timezone_members tm
      where tm.timezone_id = timezone_members.timezone_id and tm.user_id = auth.uid()
    )
  );

create policy "Creators can manage timezone members" on public.timezone_members
  for all using (
    exists (
      select 1 from public.timezones t
      where t.id = timezone_id and t.creator_id = auth.uid()
    )
  );

-- Memories policies
create policy "Users can view memories in their timezones" on public.memories
  for select using (
    user_id = auth.uid() or
    exists (
      select 1 from public.timezone_members tm
      where tm.timezone_id = memories.timezone_id and tm.user_id = auth.uid()
    )
  );

create policy "Users can create memories" on public.memories
  for insert with check (auth.uid() = user_id);

create policy "Users can update own memories" on public.memories
  for update using (auth.uid() = user_id);

create policy "Users can delete own memories" on public.memories
  for delete using (auth.uid() = user_id);

-- Media policies
create policy "Users can view media for accessible memories" on public.media
  for select using (
    exists (
      select 1 from public.memories m
      where m.id = media.memory_id and (
        m.user_id = auth.uid() or
        exists (
          select 1 from public.timezone_members tm
          where tm.timezone_id = m.timezone_id and tm.user_id = auth.uid()
        )
      )
    )
  );

create policy "Users can manage media for own memories" on public.media
  for all using (
    exists (
      select 1 from public.memories m
      where m.id = media.memory_id and m.user_id = auth.uid()
    )
  );

-- Notifications policies
create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

-- Invitations policies
create policy "Users can view invitations they created or received" on public.invitations
  for select using (
    created_by = auth.uid() or
    exists (
      select 1 from public.timezone_members tm
      where tm.timezone_id = invitations.timezone_id and tm.user_id = auth.uid()
    )
  );

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.timezones enable row level security;
alter table public.timezone_members enable row level security;
alter table public.memories enable row level security;
alter table public.media enable row level security;
alter table public.notifications enable row level security;
alter table public.invitations enable row level security;

-- Create function to handle user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create function to create default personal timezone
create or replace function public.create_personal_timezone(user_id uuid)
returns uuid as $$
declare
  timezone_id uuid;
begin
  insert into public.timezones (title, description, type, creator_id)
  values ('Personal', 'My personal memories and moments', 'PRIVATE', user_id)
  returning id into timezone_id;
  
  insert into public.timezone_members (timezone_id, user_id, role)
  values (timezone_id, user_id, 'CREATOR');
  
  return timezone_id;
end;
$$ language plpgsql security definer; 