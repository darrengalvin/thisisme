# Invite Code Redemption System

## Problem Solved
Users can now redeem invitations **even if they sign up with a different email or phone number** than they were originally invited to. This solves the edge case where:
- Someone is invited via their personal email but signs up with work email
- Someone is invited via one phone but signs up with another
- Someone doesn't have access to the original contact method

## How It Works

### 1. Automatic Redemption (Original System)
- User receives invitation via email/SMS
- Signs up with **the same** email/phone
- ✅ Automatically gets chapter access

### 2. Manual Redemption (New System)
- User receives invitation with **unique 8-character code**
- Signs up with **any** email/phone
- Manually enters the code to redeem
- ✅ Gets chapter access

## Features

### Invite Code Generation
- **Automatically generated** when invitation is created
- **8 characters** long (e.g., `K7P2XMNH`)
- Uses safe alphabet (excludes similar-looking chars: 0,O,1,I)
- **Unique** across all invitations
- **Never expires** (until invitation expires)

### Code Distribution
Both email and SMS invitations now include the invite code:

**Email:**
```
┌─────────────────────────────────────┐
│ Or use this invite code after       │
│ signing up:                          │
│                                      │
│  ┌─────────────┐                    │
│  │  K7P2XMNH   │                    │
│  └─────────────┘                    │
│                                      │
│ Already have an account or signing  │
│ up with a different email? Go to    │
│ Settings → Redeem Invite Code       │
└─────────────────────────────────────┘
```

**SMS:**
```
Hi John! Sarah (your friend) invited you 
to join This Is Me. Invite code: K7P2XMNH 
(save this to join later or if using a 
different phone/email) Join: thisisme.app
```

### Redemption UI Component
New component: `<RedeemInviteCode />`
- Clean, simple interface
- Auto-uppercases input
- Real-time validation
- Success/error feedback
- Can be placed anywhere in the app

## Files Created/Modified

### New Files
1. **`add-invite-code-to-invitations.sql`** - Migration to add invite codes
2. **`app/api/auth/redeem-invite/route.ts`** - API endpoint to redeem codes
3. **`components/RedeemInviteCode.tsx`** - UI component for redemption
4. **`INVITE-CODE-REDEMPTION.md`** - This documentation

### Modified Files
1. **`app/api/network/invite/route.ts`**
   - Returns invite_code in response
   - Passes code to email/SMS functions

2. **`lib/resend.ts`**
   - Added `inviteCode` parameter to `sendPersonInviteEmail`
   - Displays code in email template (HTML and text)

3. **`lib/twilio.ts`**
   - Added `inviteCode` parameter to `sendPersonInviteSMS`
   - Includes code in SMS message

## Database Schema

### `pending_invitations` Table Updates
```sql
-- New column
invite_code VARCHAR(16) UNIQUE NOT NULL

-- Index for fast lookups
CREATE INDEX idx_pending_invitations_invite_code 
ON pending_invitations(invite_code);

-- Auto-generation trigger
CREATE TRIGGER trigger_set_invite_code
BEFORE INSERT ON pending_invitations
FOR EACH ROW
EXECUTE FUNCTION set_invite_code();
```

## API Endpoints

### POST `/api/auth/redeem-invite`
Manually redeem an invite code.

**Request:**
```json
{
  "inviteCode": "K7P2XMNH"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully joined 2 chapters!",
  "chaptersAdded": 2,
  "chapters": [
    { "id": "...", "title": "College Years" },
    { "id": "...", "title": "Work Life" }
  ]
}
```

**Response (Already Used):**
```json
{
  "success": false,
  "error": "This invitation has already been used by someone else."
}
```

**Response (Expired):**
```json
{
  "success": false,
  "error": "This invitation has expired. Please contact the person who invited you."
}
```

## Usage

### Add Redemption UI to Your App

```tsx
import RedeemInviteCode from '@/components/RedeemInviteCode'

// In your component:
<RedeemInviteCode 
  onSuccess={() => {
    // Optional: Reload data, show success message, etc.
    window.location.reload()
  }}
/>
```

Suggested locations:
- Settings/Profile page
- My People / Network page
- Dashboard sidebar
- Welcome screen for new users

## Migration Steps

1. **Run the invite code migration:**
   ```sql
   -- See: add-invite-code-to-invitations.sql
   ```

2. **Deploy the code changes** (already done)

3. **Add RedeemInviteCode component** to your UI:
   ```tsx
   // Example: In your dashboard or settings
   import RedeemInviteCode from '@/components/RedeemInviteCode'
   
   <RedeemInviteCode onSuccess={() => router.refresh()} />
   ```

4. **Test the flow:**
   - Send yourself an invitation
   - Note the invite code from email/SMS
   - Sign up with a **different** email
   - Use the redemption UI to enter the code
   - ✅ Verify chapter access is granted

## User Scenarios

### Scenario 1: Different Email
```
1. Alice invites Bob via bob.personal@gmail.com
2. Bob receives email with code: "K7P2XMNH"
3. Bob signs up with bob.work@company.com
4. Bob enters code "K7P2XMNH" in redemption UI
5. ✅ Bob gets access to invited chapters
```

### Scenario 2: Different Phone
```
1. Alice invites Bob via phone +44 7700 900123
2. Bob receives SMS with code: "K7P2XMNH"
3. Bob signs up with +1 555 0100 (US number)
4. Bob enters code "K7P2XMNH"
5. ✅ Bob gets access to invited chapters
```

### Scenario 3: Already Has Account
```
1. Alice invites Bob via bob@email.com
2. Bob already has an account
3. Bob logs in to existing account
4. Bob goes to Settings → Redeem Invite Code
5. Bob enters code "K7P2XMNH"
6. ✅ Bob gets access to invited chapters
```

### Scenario 4: Saves Code for Later
```
1. Alice invites Bob
2. Bob receives code but isn't ready to sign up
3. Bob saves code in notes: "K7P2XMNH"
4. Two weeks later, Bob signs up
5. Bob enters the saved code
6. ✅ Bob gets access to invited chapters
```

## Security Considerations

✅ **Unique codes** - No duplicates possible
✅ **One-time use** - Code marked as used after redemption
✅ **Authenticated only** - Must be logged in to redeem
✅ **Expiration** - Codes expire with invitation (30 days default)
✅ **Rate limiting** - Consider adding to prevent brute force
✅ **Audit trail** - Tracks who redeemed what and when

## Analytics & Monitoring

Track these metrics:
- Redemption rate (automatic vs manual)
- Time to redemption
- Failed redemption attempts
- Popular redemption methods

Query examples:
```sql
-- Manual redemptions (different email/phone)
SELECT COUNT(*) FROM pending_invitations
WHERE status = 'accepted'
AND accepted_by_user_id IS NOT NULL
AND (invitee_email IS NULL OR invitee_phone IS NULL);

-- Redemption time analysis
SELECT 
  AVG(EXTRACT(EPOCH FROM (accepted_at - created_at))/3600) as avg_hours_to_redeem
FROM pending_invitations
WHERE status = 'accepted';
```

## Future Enhancements

- [ ] QR code generation for invite codes
- [ ] Share invite code via other platforms (WhatsApp, etc.)
- [ ] Allow users to see their own invite codes they've sent
- [ ] Resend invitation with same code
- [ ] Custom expiry per invitation
- [ ] Admin dashboard to manage invitations
- [ ] Push notification when code is redeemed

## Testing Checklist

- [ ] Create invitation via email
- [ ] Verify email includes invite code
- [ ] Create invitation via SMS
- [ ] Verify SMS includes invite code
- [ ] Sign up with different email than invited
- [ ] Successfully redeem code
- [ ] Try to redeem same code twice (should fail)
- [ ] Try to redeem expired code (should fail)
- [ ] Try to redeem invalid code (should fail)
- [ ] Verify chapter access after redemption
- [ ] Check invitation marked as "accepted"

