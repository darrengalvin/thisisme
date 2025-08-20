-- Support ticket: Dustin requests GPT-5 upgrade
-- Generated: 2025-08-20

-- Insert the support ticket from Dustin
INSERT INTO tickets (
    id,
    user_id,
    title,
    description,
    priority,
    status,
    category,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'dustin@yourciao.co.uk' LIMIT 1),
    'ChatGPT 5 Model Upgrade Request',
    'Hi Darren,

How much work would it be to update the model to include/use ChatGPT 5?

Thanks,
Dustin',
    'medium',
    'completed',
    'feature_request',
    NOW() - INTERVAL '2 hours',
    NOW()
);

-- Get the ticket ID for the comment
WITH ticket_info AS (
    SELECT id as ticket_id 
    FROM tickets 
    WHERE title = 'ChatGPT 5 Model Upgrade Request' 
    AND user_id = (SELECT id FROM users WHERE email = 'dustin@yourciao.co.uk' LIMIT 1)
    ORDER BY created_at DESC 
    LIMIT 1
)

-- Insert admin response comment
INSERT INTO ticket_comments (
    id,
    ticket_id,
    user_id,
    content,
    is_internal,
    created_at,
    updated_at
) 
SELECT 
    gen_random_uuid(),
    ticket_info.ticket_id,
    (SELECT id FROM users WHERE email = 'admin@yourciao.co.uk' LIMIT 1),
    'Hi Dustin,

Thanks for reaching out about the GPT-5 upgrade. 

1 hour should suffice to implement this update. I''ll get this done for you right away.

Best regards,
Admin Team',
    false,
    NOW() - INTERVAL '1 hour 30 minutes',
    NOW() - INTERVAL '1 hour 30 minutes'
FROM ticket_info;

-- Insert completion comment
WITH ticket_info AS (
    SELECT id as ticket_id 
    FROM tickets 
    WHERE title = 'ChatGPT 5 Model Upgrade Request' 
    AND user_id = (SELECT id FROM users WHERE email = 'dustin@yourciao.co.uk' LIMIT 1)
    ORDER BY created_at DESC 
    LIMIT 1
)

INSERT INTO ticket_comments (
    id,
    ticket_id,
    user_id,
    content,
    is_internal,
    created_at,
    updated_at
) 
SELECT 
    gen_random_uuid(),
    ticket_info.ticket_id,
    (SELECT id FROM users WHERE email = 'admin@yourciao.co.uk' LIMIT 1),
    'Update completed! ✅

The system has been successfully upgraded to use ChatGPT 5. The new model is now active across all AI features.

**Time Used:** 1 hour retainer
**Status:** Completed

You should notice improved performance and capabilities immediately. Let me know if you have any questions!

Best regards,
Admin Team',
    false,
    NOW() - INTERVAL '15 minutes',
    NOW() - INTERVAL '15 minutes'
FROM ticket_info;

-- Update ticket metadata to reflect completion
UPDATE tickets 
SET 
    status = 'completed',
    resolution = 'ChatGPT 5 model successfully implemented. 1 hour retainer used.',
    resolved_at = NOW() - INTERVAL '15 minutes',
    updated_at = NOW()
WHERE title = 'ChatGPT 5 Model Upgrade Request' 
AND user_id = (SELECT id FROM users WHERE email = 'dustin@yourciao.co.uk' LIMIT 1);

-- Optional: Add internal note about retainer usage
WITH ticket_info AS (
    SELECT id as ticket_id 
    FROM tickets 
    WHERE title = 'ChatGPT 5 Model Upgrade Request' 
    AND user_id = (SELECT id FROM users WHERE email = 'dustin@yourciao.co.uk' LIMIT 1)
    ORDER BY created_at DESC 
    LIMIT 1
)

INSERT INTO ticket_comments (
    id,
    ticket_id,
    user_id,
    content,
    is_internal,
    created_at,
    updated_at
) 
SELECT 
    gen_random_uuid(),
    ticket_info.ticket_id,
    (SELECT id FROM users WHERE email = 'admin@yourciao.co.uk' LIMIT 1),
    'Internal Note: 1 hour retainer used for GPT-5 model upgrade implementation. Task completed successfully.',
    true,
    NOW() - INTERVAL '10 minutes',
    NOW() - INTERVAL '10 minutes'
FROM ticket_info;
