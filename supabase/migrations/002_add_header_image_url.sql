-- Add header_image_url column to timezones table
-- This column was missing from the initial schema but is used by the application

alter table public.timezones add column header_image_url text;

-- Add index for performance if needed
create index timezones_header_image_url_idx on public.timezones(header_image_url); 