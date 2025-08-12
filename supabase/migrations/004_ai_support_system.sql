-- AI-Powered Support System Schema
-- Run this in your Supabase SQL Editor after 003_support_system.sql

-- AI Ticket Analysis Table
create table if not exists public.ai_ticket_analysis (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references public.tickets(id) on delete cascade not null,
  analysis_data jsonb not null,
  model_used text not null default 'gpt-4o',
  confidence_score integer check (confidence_score >= 0 and confidence_score <= 100),
  analyzed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  analyzed_by uuid references public.users(id) on delete set null
);

-- AI Generated Fixes Table
create table if not exists public.ai_generated_fixes (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references public.tickets(id) on delete cascade not null,
  fix_plan jsonb not null,
  code_context_files text[] not null default '{}',
  model_used text not null default 'gpt-4o',
  confidence_score integer check (confidence_score >= 0 and confidence_score <= 100),
  status text check (status in ('pending_review', 'approved', 'applied', 'failed', 'rejected')) not null default 'pending_review',
  risk_level text check (risk_level in ('low', 'medium', 'high')) not null default 'medium',
  auto_applicable boolean default false,
  generated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  generated_by uuid references public.users(id) on delete set null,
  reviewed_at timestamp with time zone,
  reviewed_by uuid references public.users(id) on delete set null,
  applied_at timestamp with time zone,
  applied_by uuid references public.users(id) on delete set null,
  backup_id text,
  test_results jsonb,
  error_details text
);

-- AI Fix Applications Log
create table if not exists public.ai_fix_applications (
  id uuid default gen_random_uuid() primary key,
  fix_id uuid references public.ai_generated_fixes(id) on delete cascade not null,
  files_modified text[] not null default '{}',
  changes_summary text,
  backup_location text,
  success boolean not null default false,
  error_message text,
  rollback_performed boolean default false,
  applied_at timestamp with time zone default timezone('utc'::text, now()) not null,
  applied_by uuid references public.users(id) on delete set null
);

-- AI Learning Data (for improving fix suggestions)
create table if not exists public.ai_learning_data (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references public.tickets(id) on delete cascade not null,
  fix_id uuid references public.ai_generated_fixes(id) on delete cascade,
  human_feedback jsonb,
  success_rating integer check (success_rating >= 1 and success_rating <= 5),
  improvement_notes text,
  pattern_type text, -- e.g., 'sorting_bug', 'ui_issue', 'performance'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.users(id) on delete set null
);

-- AI System Configuration
create table if not exists public.ai_system_config (
  id uuid default gen_random_uuid() primary key,
  config_key text unique not null,
  config_value jsonb not null,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by uuid references public.users(id) on delete set null
);

-- Insert default AI system configurations
insert into public.ai_system_config (config_key, config_value, description) values
  ('auto_fix_enabled', 'true', 'Enable automatic fix generation'),
  ('auto_apply_enabled', 'false', 'Enable automatic fix application (dangerous)'),
  ('max_files_per_fix', '5', 'Maximum files that can be modified in one fix'),
  ('required_confidence_score', '80', 'Minimum confidence score for auto-application'),
  ('safe_file_patterns', '["components/**", "pages/**", "styles/**"]', 'File patterns safe for auto-modification'),
  ('protected_files', '["package.json", "next.config.js", ".env*", "prisma/**"]', 'Files that should never be auto-modified'),
  ('notification_settings', '{"on_fix_generated": true, "on_fix_applied": true, "on_fix_failed": true}', 'AI system notification preferences')
on conflict (config_key) do nothing;

-- Create indexes for performance
create index if not exists idx_ai_ticket_analysis_ticket_id on public.ai_ticket_analysis(ticket_id);
create index if not exists idx_ai_ticket_analysis_analyzed_at on public.ai_ticket_analysis(analyzed_at desc);
create index if not exists idx_ai_generated_fixes_ticket_id on public.ai_generated_fixes(ticket_id);
create index if not exists idx_ai_generated_fixes_status on public.ai_generated_fixes(status);
create index if not exists idx_ai_generated_fixes_generated_at on public.ai_generated_fixes(generated_at desc);
create index if not exists idx_ai_fix_applications_fix_id on public.ai_fix_applications(fix_id);
create index if not exists idx_ai_learning_data_pattern_type on public.ai_learning_data(pattern_type);

-- Row Level Security (RLS) Policies
alter table public.ai_ticket_analysis enable row level security;
alter table public.ai_generated_fixes enable row level security;
alter table public.ai_fix_applications enable row level security;
alter table public.ai_learning_data enable row level security;
alter table public.ai_system_config enable row level security;

-- AI Ticket Analysis Policies
create policy "Admin can view all AI ticket analysis" on public.ai_ticket_analysis
  for select using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

create policy "Admin can insert AI ticket analysis" on public.ai_ticket_analysis
  for insert with check (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- AI Generated Fixes Policies
create policy "Admin can view all AI generated fixes" on public.ai_generated_fixes
  for select using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

create policy "Admin can manage AI generated fixes" on public.ai_generated_fixes
  for all using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- AI Fix Applications Policies
create policy "Admin can view all AI fix applications" on public.ai_fix_applications
  for select using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

create policy "Admin can insert AI fix applications" on public.ai_fix_applications
  for insert with check (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- AI Learning Data Policies
create policy "Admin can manage AI learning data" on public.ai_learning_data
  for all using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- AI System Config Policies
create policy "Admin can manage AI system config" on public.ai_system_config
  for all using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- Functions for AI system

-- Function to calculate fix confidence score
create or replace function calculate_fix_confidence(fix_plan jsonb)
returns integer as $$
declare
  score integer := 0;
begin
  -- Base score for having a diagnosis
  if fix_plan->>'DIAGNOSIS' is not null then
    score := score + 20;
  end if;
  
  -- Score for having specific code changes
  if fix_plan->>'CODE_CHANGES' is not null then
    score := score + 30;
  end if;
  
  -- Score for having testing approach
  if fix_plan->>'TESTING_APPROACH' is not null then
    score := score + 20;
  end if;
  
  -- Score for having files modified list
  if jsonb_array_length(coalesce(fix_plan->'FILES_MODIFIED', '[]'::jsonb)) > 0 then
    score := score + 15;
  end if;
  
  -- Score for having rollback plan
  if fix_plan->>'ROLLBACK_PLAN' is not null then
    score := score + 15;
  end if;
  
  return least(score, 100);
end;
$$ language plpgsql;

-- Function to check if fix is auto-applicable
create or replace function is_fix_auto_applicable(fix_plan jsonb)
returns boolean as $$
declare
  safe_patterns text[] := array['sorting', 'display order', 'css styling', 'text changes'];
  risk_patterns text[] := array['database', 'authentication', 'payment', 'security'];
  description text;
  pattern text;
begin
  description := lower(fix_plan::text);
  
  -- Check for risk patterns
  foreach pattern in array risk_patterns loop
    if description like '%' || pattern || '%' then
      return false;
    end if;
  end loop;
  
  -- Check for safe patterns
  foreach pattern in array safe_patterns loop
    if description like '%' || pattern || '%' then
      return true;
    end if;
  end loop;
  
  return false;
end;
$$ language plpgsql;

-- Trigger to automatically calculate confidence scores
create or replace function update_fix_confidence_score()
returns trigger as $$
begin
  new.confidence_score := calculate_fix_confidence(new.fix_plan);
  new.auto_applicable := is_fix_auto_applicable(new.fix_plan);
  return new;
end;
$$ language plpgsql;

create trigger trigger_update_fix_confidence_score
  before insert or update on public.ai_generated_fixes
  for each row execute function update_fix_confidence_score();

-- View for AI system dashboard
create or replace view public.ai_system_stats as
select
  (select count(*) from public.ai_ticket_analysis) as total_analyses,
  (select count(*) from public.ai_generated_fixes) as total_fixes_generated,
  (select count(*) from public.ai_generated_fixes where status = 'applied') as fixes_applied,
  (select count(*) from public.ai_generated_fixes where status = 'failed') as fixes_failed,
  (select avg(confidence_score) from public.ai_generated_fixes where confidence_score is not null) as avg_confidence,
  (select count(*) from public.ai_generated_fixes where auto_applicable = true) as auto_applicable_fixes,
  (select count(*) from public.ai_fix_applications where success = true) as successful_applications,
  (select count(*) from public.ai_fix_applications where rollback_performed = true) as rollbacks_performed;

-- Grant access to admin users
grant all on public.ai_ticket_analysis to authenticated;
grant all on public.ai_generated_fixes to authenticated;
grant all on public.ai_fix_applications to authenticated;
grant all on public.ai_learning_data to authenticated;
grant all on public.ai_system_config to authenticated;
grant select on public.ai_system_stats to authenticated;
