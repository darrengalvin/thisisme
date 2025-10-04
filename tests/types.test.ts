import { describe, it, expect } from 'vitest';
import type {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from '@/types/support';
import {
  isValidTicketStatus,
  isValidTicketPriority,
  isValidTicketCategory,
} from '@/types/support';

describe('Support Types', () => {
  describe('Type Guards', () => {
    describe('isValidTicketStatus()', () => {
      it('should accept valid statuses', () => {
        expect(isValidTicketStatus('open')).toBe(true);
        expect(isValidTicketStatus('in_progress')).toBe(true);
        expect(isValidTicketStatus('review')).toBe(true);
        expect(isValidTicketStatus('resolved')).toBe(true);
        expect(isValidTicketStatus('closed')).toBe(true);
      });

      it('should reject invalid statuses', () => {
        expect(isValidTicketStatus('invalid')).toBe(false);
        expect(isValidTicketStatus('pending')).toBe(false);
        expect(isValidTicketStatus('')).toBe(false);
      });
    });

    describe('isValidTicketPriority()', () => {
      it('should accept valid priorities', () => {
        expect(isValidTicketPriority('low')).toBe(true);
        expect(isValidTicketPriority('medium')).toBe(true);
        expect(isValidTicketPriority('high')).toBe(true);
        expect(isValidTicketPriority('critical')).toBe(true);
      });

      it('should reject invalid priorities', () => {
        expect(isValidTicketPriority('urgent')).toBe(false);
        expect(isValidTicketPriority('normal')).toBe(false);
      });
    });

    describe('isValidTicketCategory()', () => {
      it('should accept valid categories', () => {
        expect(isValidTicketCategory('bug')).toBe(true);
        expect(isValidTicketCategory('feature')).toBe(true);
        expect(isValidTicketCategory('security')).toBe(true);
        expect(isValidTicketCategory('performance')).toBe(true);
        expect(isValidTicketCategory('monitoring')).toBe(true);
        expect(isValidTicketCategory('testing')).toBe(true);
      });

      it('should reject invalid categories', () => {
        expect(isValidTicketCategory('invalid')).toBe(false);
        expect(isValidTicketCategory('task')).toBe(false);
      });
    });
  });

  describe('Ticket Interface', () => {
    it('should have required fields', () => {
      const ticket: Ticket = {
        id: '123',
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'open',
        priority: 'high',
        category: 'bug',
        stage: 'backlog',
        creator_id: '456',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        creator: {
          id: '456',
          email: 'test@example.com',
        },
      };

      expect(ticket.id).toBeDefined();
      expect(ticket.title).toBeDefined();
      expect(ticket.status).toBeDefined();
    });
  });
});
