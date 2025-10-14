// 🛡️ Comprehensive Input Validation Schemas using Zod
// Protects against SQL injection, XSS, data corruption, and malicious inputs

import { z } from 'zod';

// ============ COMMON VALIDATORS ============

export const emailSchema = z.string().email('Invalid email address').toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const uuidSchema = z.string().uuid('Invalid ID format');

export const urlSchema = z.string().url('Invalid URL').max(2000, 'URL too long');

// Flexible phone number schema that accepts various formats and normalizes them
export const phoneSchema = z
  .string()
  .transform((val) => {
    // Remove all spaces, parentheses, dashes, and other common formatting
    const cleaned = val.replace(/[\s\(\)\-\.]/g, '')
    
    // Handle UK numbers starting with 0 - convert to +44
    if (cleaned.startsWith('0')) {
      return '+44' + cleaned.substring(1)
    }
    
    // If it doesn't start with +, assume it's an international number and add +
    if (!cleaned.startsWith('+')) {
      return '+' + cleaned
    }
    
    return cleaned
  })
  .refine(
    (val) => /^\+\d{10,15}$/.test(val),
    'Phone number must be 10-15 digits (spaces and formatting are okay)'
  )
  .nullish(); // Allows null, undefined, or valid phone number

// ============ AUTH SCHEMAS ============

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

// ============ MEMORY SCHEMAS ============

export const createMemorySchema = z.object({
  title: z.string().max(200, 'Title too long').optional(),
  textContent: z.string().max(10000, 'Content too long (max 10,000 characters)'),
  timeZoneId: uuidSchema.optional(),
  memory_date: z.string().datetime().optional(),
  image_url: urlSchema.optional(),
  audio_url: urlSchema.optional(),
  tagged_people: z.array(uuidSchema).max(50, 'Too many tagged people').optional(),
});

export const updateMemorySchema = z.object({
  title: z.string().max(200, 'Title too long').optional(),
  textContent: z.string().max(10000, 'Content too long').optional(),
  timeZoneId: uuidSchema.optional(),
  memory_date: z.string().datetime().optional(),
  image_url: urlSchema.optional(),
  audio_url: urlSchema.optional(),
});

export const deleteMemorySchema = z.object({
  id: uuidSchema,
});

// ============ CHAPTER (TIMEZONE) SCHEMAS ============

export const createChapterSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
});

export const updateChapterSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
});

// ============ NETWORK/PEOPLE SCHEMAS ============

// Photo URL schema that accepts both regular URLs and base64 data URLs
const photoUrlSchema = z
  .string()
  .refine(
    (val) => {
      // Allow empty strings (will be converted to null)
      if (!val || val.trim() === '') {
        return true
      }
      // Allow data URLs (base64 encoded images from phone camera/library)
      if (val.startsWith('data:image/')) {
        return true
      }
      // For regular URLs, validate format (but don't limit length for cloud storage URLs)
      try {
        new URL(val)
        return true
      } catch {
        return false
      }
    },
    'Must be a valid URL or image data'
  )
  .nullish()

export const addPersonSchema = z.object({
  person_name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  person_email: emailSchema.optional(),
  person_phone: phoneSchema,
  relationship: z.string().max(50, 'Relationship too long').nullish(),
  notes: z.string().max(1000, 'Notes too long').nullish(),
  photo_url: photoUrlSchema, // Now accepts data URLs and regular URLs without length limit
  selectedChapters: z.array(uuidSchema).max(100, 'Too many chapters').optional(),
});

export const updatePersonSchema = z.object({
  person_name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  person_email: emailSchema.optional(),
  person_phone: phoneSchema,
  relationship: z.string().max(50, 'Relationship too long').nullish(),
  notes: z.string().max(1000, 'Notes too long').nullish(),
  photo_url: photoUrlSchema, // Now accepts data URLs and regular URLs without length limit
});

// ============ INVITATION SCHEMAS ============

export const invitePersonSchema = z.object({
  personId: uuidSchema,
  personName: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  personEmail: emailSchema.optional(),
  personPhone: phoneSchema,
  inviteMethod: z.enum(['email', 'sms', 'both']),
  relationship: z.string().max(50, 'Relationship too long').optional(),
  customMessage: z.string().max(500, 'Message too long').optional(),
  selectedChapters: z.array(uuidSchema).max(100, 'Too many chapters').optional(),
});

export const redeemInviteSchema = z.object({
  inviteCode: z.string().length(8, 'Invalid invite code'),
  userId: uuidSchema,
});

// ============ COMMENT SCHEMAS ============

export const createCommentSchema = z.object({
  memoryId: uuidSchema,
  comment: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment too long'),
  parentCommentId: uuidSchema.optional(),
});

export const updateCommentSchema = z.object({
  comment: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment too long'),
});

// ============ SUPPORT TICKET SCHEMAS ============

export const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description too long'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.enum(['bug', 'feature', 'question', 'improvement', 'security', 'performance', 'monitoring', 'testing']),
  screenshot_url: urlSchema.optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description too long').optional(),
  status: z.enum(['open', 'in_progress', 'review', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.enum(['bug', 'feature', 'question', 'improvement', 'security', 'performance', 'monitoring', 'testing']).optional(),
  stage: z.enum(['backlog', 'todo', 'doing', 'testing', 'done']).optional(),
  assignee_id: uuidSchema.optional(),
  screenshot_url: urlSchema.optional(),
  metadata: z.record(z.any()).optional(),
});

// ============ HELPER FUNCTIONS ============

/**
 * Validates data against a schema and returns typed result
 * @throws ZodError with detailed validation errors
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Validates data and returns success/error result (doesn't throw)
 */
export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Formats Zod errors into user-friendly messages
 */
export function formatZodErrors(error: z.ZodError): string[] {
  return error.errors.map((err) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });
}

/**
 * Sanitizes HTML to prevent XSS attacks
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates and sanitizes user input
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  return sanitizeHtml(input.trim().slice(0, maxLength));
}
