// ✨ Comprehensive TypeScript types for Support/Ticket System

export type TicketStatus = 'open' | 'in_progress' | 'review' | 'resolved' | 'closed';

export type TicketStage = 'backlog' | 'todo' | 'doing' | 'testing' | 'done';

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export type TicketCategory = 
  | 'bug' 
  | 'feature' 
  | 'question' 
  | 'improvement'
  | 'security'
  | 'performance'
  | 'monitoring'
  | 'testing';

export type TicketAction = 
  | 'status_change' 
  | 'assignment' 
  | 'priority_change' 
  | 'stage_move' 
  | 'created' 
  | 'commented';

export interface TicketUser {
  id: string;
  email: string;
  full_name?: string | null;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
  user: TicketUser;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  comment_id?: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export interface TicketHistoryEntry {
  id: string;
  ticket_id: string;
  user_id: string;
  action: TicketAction;
  old_value?: string | null;
  new_value?: string | null;
  created_at: string;
  user: TicketUser;
}

export interface TicketMetadata {
  ai_pr_url?: string;
  ai_pr_number?: number;
  ai_analysis_id?: string;
  validation_passed?: boolean;
  validation_notes?: string;
  validated_at?: string;
  [key: string]: any; // Allow additional metadata
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  stage: TicketStage;
  creator_id: string;
  assignee_id?: string | null;
  screenshot_url?: string | null;
  metadata?: TicketMetadata | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  creator: TicketUser;
  assignee?: TicketUser | null;
  comments?: TicketComment[];
  attachments?: TicketAttachment[];
  history?: TicketHistoryEntry[];
}

export interface TicketListItem {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  stage: TicketStage;
  creator_id: string;
  assignee_id?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  creator: TicketUser;
  assignee?: TicketUser | null;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  screenshot_url?: string;
  metadata?: TicketMetadata;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  stage?: TicketStage;
  assignee_id?: string | null;
  screenshot_url?: string;
  metadata?: TicketMetadata;
}

export interface TicketStats {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  critical_tickets: number;
  high_tickets: number;
  avg_resolution_hours: number;
}

export interface KanbanColumn {
  id: TicketStage;
  title: string;
  tickets: TicketListItem[];
}

export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  category?: TicketCategory[];
  stage?: TicketStage[];
  assignee_id?: string;
  creator_id?: string;
  search?: string;
}

// API Response types
export interface TicketResponse {
  ticket: Ticket;
}

export interface TicketsResponse {
  tickets: TicketListItem[];
  total?: number;
}

export interface TicketStatsResponse {
  stats: TicketStats;
}

export interface CreateTicketResponse {
  success: boolean;
  ticket: Ticket;
  message?: string;
}

export interface UpdateTicketResponse {
  success: boolean;
  ticket: Ticket;
  message?: string;
}

export interface DeleteTicketResponse {
  success: boolean;
  message: string;
}

// Utility type guards
export const isValidTicketStatus = (status: string): status is TicketStatus => {
  return ['open', 'in_progress', 'review', 'resolved', 'closed'].includes(status);
};

export const isValidTicketStage = (stage: string): stage is TicketStage => {
  return ['backlog', 'todo', 'doing', 'testing', 'done'].includes(stage);
};

export const isValidTicketPriority = (priority: string): priority is TicketPriority => {
  return ['low', 'medium', 'high', 'critical'].includes(priority);
};

export const isValidTicketCategory = (category: string): category is TicketCategory => {
  return ['bug', 'feature', 'question', 'improvement', 'security', 'performance', 'monitoring', 'testing'].includes(category);
};
