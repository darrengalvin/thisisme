-- Fix ticket history trigger to handle service role context
-- Problem: auth.uid() returns null when using service role key
-- Solution: Use creator_id as fallback when there's no auth context

-- Drop and recreate the trigger function with better null handling
CREATE OR REPLACE FUNCTION public.handle_ticket_status_change()
RETURNS trigger AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Try to get user_id from auth context
  current_user_id := auth.uid();
  
  -- If auth.uid() is null (service role/admin updates), use creator_id as fallback
  -- This ensures we always have a user_id for history tracking
  IF current_user_id IS NULL THEN
    current_user_id := new.creator_id;
  END IF;
  
  -- Only log history if we have a valid user_id
  IF current_user_id IS NOT NULL THEN
    IF old.status IS DISTINCT FROM new.status THEN
      INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value)
      VALUES (new.id, current_user_id, 'status_change', old.status, new.status);
      
      -- Create notification for ticket creator if not the one making the change
      IF new.creator_id != current_user_id THEN
        INSERT INTO public.ticket_notifications (ticket_id, user_id, type)
        VALUES (new.id, new.creator_id, 'status_changed');
      END IF;
    END IF;
    
    IF old.stage IS DISTINCT FROM new.stage THEN
      INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value)
      VALUES (new.id, current_user_id, 'stage_move', old.stage, new.stage);
    END IF;
    
    IF old.priority IS DISTINCT FROM new.priority THEN
      INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value)
      VALUES (new.id, current_user_id, 'priority_change', old.priority, new.priority);
    END IF;
    
    IF old.assignee_id IS DISTINCT FROM new.assignee_id THEN
      INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value)
      VALUES (new.id, current_user_id, 'assignment', old.assignee_id::text, new.assignee_id::text);
      
      -- Create notification for new assignee
      IF new.assignee_id IS NOT NULL THEN
        INSERT INTO public.ticket_notifications (ticket_id, user_id, type)
        VALUES (new.id, new.assignee_id, 'assigned');
      END IF;
    END IF;
  END IF;
  
  -- Set resolved_at when status changes to resolved or closed
  IF new.status IN ('resolved', 'closed') AND old.status NOT IN ('resolved', 'closed') THEN
    new.resolved_at = timezone('utc'::text, now());
    
    -- Create notification for ticket creator (if we have user context)
    IF current_user_id IS NOT NULL AND new.creator_id != current_user_id THEN
      INSERT INTO public.ticket_notifications (ticket_id, user_id, type)
      VALUES (new.id, new.creator_id, 'resolved');
    END IF;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists, no need to recreate it
-- It will use the updated function automatically

