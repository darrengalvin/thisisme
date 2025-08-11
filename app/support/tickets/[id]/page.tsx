'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Paperclip, Clock, User, Tag, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  creator: { id: string; email: string };
  assignee?: { id: string; email: string };
  comments: Comment[];
  history: HistoryEntry[];
}

interface Comment {
  id: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
  user: { id: string; email: string };
}

interface HistoryEntry {
  id: string;
  action: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
  user: { id: string; email: string };
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchTicket();
    }
  }, [params.id]);

  const fetchTicket = async () => {
    try {
      const response = await fetch(`/api/support/tickets/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setTicket(data.ticket);
      } else if (response.status === 404) {
        router.push('/support');
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/support/tickets/${params.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment }),
      });

      if (response.ok) {
        setNewComment('');
        fetchTicket();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-50';
      case 'in_progress': return 'text-purple-600 bg-purple-50';
      case 'review': return 'text-indigo-600 bg-indigo-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      case 'closed': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatAction = (action: string) => {
    switch (action) {
      case 'created': return 'created this ticket';
      case 'status_change': return 'changed status';
      case 'priority_change': return 'changed priority';
      case 'stage_move': return 'moved stage';
      case 'assignment': return 'changed assignee';
      case 'commented': return 'added a comment';
      default: return action;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Ticket not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/support"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Support
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{ticket.title}</h1>
              
              <div className="flex flex-wrap gap-3 mb-6">
                <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(ticket.status)}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority} priority
                </span>
                <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600">
                  {ticket.category}
                </span>
              </div>

              <div className="prose max-w-none mb-6">
                <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
              </div>

              <div className="border-t pt-6">
                <h2 className="font-semibold text-gray-900 mb-4">Comments</h2>
                
                <div className="space-y-4 mb-6">
                  {ticket.comments.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No comments yet</p>
                  ) : (
                    ticket.comments.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{comment.user.email}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(comment.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {comment.is_internal && (
                            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                              Internal
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSubmitComment} className="flex gap-3">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />
                  <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="font-semibold text-gray-900 mb-4">Details</h2>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Created by</p>
                  <p className="font-medium text-gray-900">{ticket.creator.email}</p>
                </div>
                
                {ticket.assignee && (
                  <div>
                    <p className="text-sm text-gray-500">Assigned to</p>
                    <p className="font-medium text-gray-900">{ticket.assignee.email}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium text-gray-900">
                    {new Date(ticket.created_at).toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Last updated</p>
                  <p className="font-medium text-gray-900">
                    {new Date(ticket.updated_at).toLocaleString()}
                  </p>
                </div>
                
                {ticket.resolved_at && (
                  <div>
                    <p className="text-sm text-gray-500">Resolved</p>
                    <p className="font-medium text-gray-900">
                      {new Date(ticket.resolved_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Activity</h2>
              
              <div className="space-y-3">
                {ticket.history.length === 0 ? (
                  <p className="text-gray-500 text-sm">No activity yet</p>
                ) : (
                  ticket.history.slice(0, 10).map((entry) => (
                    <div key={entry.id} className="text-sm">
                      <p className="text-gray-900">
                        <span className="font-medium">{entry.user.email}</span>{' '}
                        {formatAction(entry.action)}
                      </p>
                      {entry.old_value && entry.new_value && (
                        <p className="text-gray-500 ml-2">
                          {entry.old_value} → {entry.new_value}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}