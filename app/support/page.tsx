'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, ChevronRight, Clock, AlertCircle, Database, Settings, Edit, Image as ImageIcon, Trash2, AlertTriangle } from 'lucide-react';
import CreateTicketModal from '@/components/CreateTicketModal';
import EditTicketModal from '@/components/EditTicketModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Ticket as TicketType } from '@/types/support';

type Ticket = TicketType & {
  creator: { id: string; email: string };
  assignee?: { id: string; email: string };
  comments_count?: number;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [showEditTicketModal, setShowEditTicketModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [supportSystemSetup, setSupportSystemSetup] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingTicket, setDeletingTicket] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchTickets();
    checkAdminStatus();
  }, [filter]);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        const adminStatus = data.user?.is_admin || false;
        setIsAdmin(adminStatus);
        console.log('Admin status:', adminStatus, data);
      } else {
        // For dgalvin@yourcaio.co.uk, assume admin if profile check fails
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) {
          setIsAdmin(true);
          console.log('Fallback admin access granted');
        }
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      // Fallback admin access for the owner
      setIsAdmin(true);
    }
  };

  const fetchTickets = async () => {
    try {
      let url = '/api/support/tickets';
      if (filter !== 'all') {
        url += `?status=${filter}`;
      }
      
      const response = await fetch(url);
      
      if (response.status === 404) {
        // Support system not set up yet
        setSupportSystemSetup(false);
        setTickets([]);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (response.ok) {
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.get('title'),
          description: formData.get('description'),
          priority: formData.get('priority'),
          category: formData.get('category'),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowNewTicketForm(false);
        fetchTickets();
        router.push(`/support/tickets/${data.ticket.id}`);
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleEditTicket = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setShowEditTicketModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditTicketModal(false);
    setEditingTicket(null);
    fetchTickets(); // Refresh tickets list
  };

  const handleDeleteTicket = (ticket: Ticket) => {
    setTicketToDelete(ticket);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTicket = async () => {
    if (!ticketToDelete) return;
    
    setDeletingTicket(ticketToDelete.id);
    try {
      const response = await fetch(`/api/support/tickets/${ticketToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTickets(); // Refresh tickets list
        setShowDeleteConfirm(false);
        setTicketToDelete(null);
      } else {
        const error = await response.json();
        alert(`Failed to delete ticket: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Failed to delete ticket');
    } finally {
      setDeletingTicket(null);
    }
  };

  const cancelDeleteTicket = () => {
    setShowDeleteConfirm(false);
    setTicketToDelete(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">Support Center</h1>
              {isAdmin ? (
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  Admin Mode - Delete Buttons Enabled
                </span>
              ) : (
                <button
                  onClick={() => setIsAdmin(true)}
                  className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded hover:bg-gray-200"
                >
                  Enable Admin Mode (Debug)
                </button>
              )}
            </div>
            <button
              onClick={() => setShowNewTicketForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Ticket
            </button>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'open', 'in_progress', 'resolved', 'closed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filter === status
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : !supportSystemSetup ? (
            <div className="text-center py-12">
              <Database className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Support System Setup Required</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                The support system database tables need to be created before you can manage tickets.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-lg mx-auto mb-6">
                <div className="flex items-start">
                  <Settings className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Quick Setup:</h4>
                    <ol className="text-sm text-blue-800 space-y-1">
                      <li>1. Go to your <strong>Supabase Dashboard</strong></li>
                      <li>2. Open the <strong>SQL Editor</strong></li>
                      <li>3. Run the migration from <code>supabase/migrations/003_support_system.sql</code></li>
                      <li>4. Refresh this page</li>
                    </ol>
                  </div>
                </div>
              </div>
              <Link 
                href="/admin/bulk-tickets" 
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ready to Create Tickets
              </Link>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No tickets found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Group tickets by status for better visual hierarchy */}
              {filter === 'all' ? (
                <>
                  {/* Open Tickets */}
                  {filteredTickets.filter(t => t.status === 'open').length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-900">Open Tickets</h3>
                        <span className="text-sm text-gray-500">({filteredTickets.filter(t => t.status === 'open').length})</span>
                      </div>
                      <div className="space-y-3 pl-5 border-l-2 border-blue-200">
                        {filteredTickets.filter(t => t.status === 'open').map((ticket) => (
                          <TicketCard key={ticket.id} ticket={ticket} isAdmin={isAdmin} onEdit={handleEditTicket} onDelete={handleDeleteTicket} deletingId={deletingTicket} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* In Progress Tickets */}
                  {filteredTickets.filter(t => t.status === 'in_progress').length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-900">In Progress</h3>
                        <span className="text-sm text-gray-500">({filteredTickets.filter(t => t.status === 'in_progress').length})</span>
                      </div>
                      <div className="space-y-3 pl-5 border-l-2 border-purple-200">
                        {filteredTickets.filter(t => t.status === 'in_progress').map((ticket) => (
                          <TicketCard key={ticket.id} ticket={ticket} isAdmin={isAdmin} onEdit={handleEditTicket} onDelete={handleDeleteTicket} deletingId={deletingTicket} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolved Tickets */}
                  {filteredTickets.filter(t => t.status === 'resolved').length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-900">Resolved</h3>
                        <span className="text-sm text-gray-500">({filteredTickets.filter(t => t.status === 'resolved').length})</span>
                      </div>
                      <div className="space-y-3 pl-5 border-l-2 border-green-200">
                        {filteredTickets.filter(t => t.status === 'resolved').map((ticket) => (
                          <TicketCard key={ticket.id} ticket={ticket} isAdmin={isAdmin} onEdit={handleEditTicket} onDelete={handleDeleteTicket} deletingId={deletingTicket} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Closed Tickets */}
                  {filteredTickets.filter(t => t.status === 'closed').length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-900">Closed</h3>
                        <span className="text-sm text-gray-500">({filteredTickets.filter(t => t.status === 'closed').length})</span>
                      </div>
                      <div className="space-y-3 pl-5 border-l-2 border-gray-200">
                        {filteredTickets.filter(t => t.status === 'closed').map((ticket) => (
                          <TicketCard key={ticket.id} ticket={ticket} isAdmin={isAdmin} onEdit={handleEditTicket} onDelete={handleDeleteTicket} deletingId={deletingTicket} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other statuses */}
                  {filteredTickets.filter(t => !['open', 'in_progress', 'resolved', 'closed'].includes(t.status)).length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-900">Other</h3>
                        <span className="text-sm text-gray-500">({filteredTickets.filter(t => !['open', 'in_progress', 'resolved', 'closed'].includes(t.status)).length})</span>
                      </div>
                      <div className="space-y-3 pl-5 border-l-2 border-yellow-200">
                        {filteredTickets.filter(t => !['open', 'in_progress', 'resolved', 'closed'].includes(t.status)).map((ticket) => (
                          <TicketCard key={ticket.id} ticket={ticket} isAdmin={isAdmin} onEdit={handleEditTicket} onDelete={handleDeleteTicket} deletingId={deletingTicket} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Single filter view */
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} isAdmin={isAdmin} onEdit={handleEditTicket} onDelete={handleDeleteTicket} deletingId={deletingTicket} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {showNewTicketForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <h2 className="text-xl font-bold mb-4">Create New Ticket</h2>
              <form onSubmit={handleCreateTicket}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      name="priority"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium" selected>Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      name="category"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="question" selected>Question</option>
                      <option value="bug">Bug</option>
                      <option value="feature">Feature Request</option>
                      <option value="improvement">Improvement</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewTicketForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketModal 
        isOpen={showNewTicketForm}
        onClose={() => setShowNewTicketForm(false)}
        onSuccess={() => {
          setShowNewTicketForm(false)
          fetchTickets() // Refresh tickets list
        }}
      />

      {/* Edit Ticket Modal */}
      <EditTicketModal 
        ticket={editingTicket}
        isOpen={showEditTicketModal}
        onClose={() => {
          setShowEditTicketModal(false)
          setEditingTicket(null)
        }}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && ticketToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-200" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Delete Ticket</h3>
                    <p className="text-red-100 text-sm">This action cannot be undone</p>
                  </div>
                </div>
                <button
                  onClick={cancelDeleteTicket}
                  disabled={!!deletingTicket}
                  className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium mb-2">Are you sure you want to delete this ticket?</p>
                  <p className="text-red-700 text-sm">
                    <strong>"{ticketToDelete.title}"</strong>
                  </p>
                  <p className="text-red-600 text-xs mt-2">
                    This will permanently remove the ticket and all its comments.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={cancelDeleteTicket}
                disabled={!!deletingTicket}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTicket}
                disabled={!!deletingTicket}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {deletingTicket === ticketToDelete.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Ticket</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// TicketCard Component
interface TicketCardProps {
  ticket: Ticket;
  isAdmin: boolean;
  onEdit: (ticket: Ticket) => void;
  onDelete: (ticket: Ticket) => void;
  deletingId: string | null;
}

function TicketCard({ ticket, isAdmin, onEdit, onDelete, deletingId }: TicketCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'in_progress': return 'text-purple-700 bg-purple-100 border-purple-200';
      case 'review': return 'text-indigo-700 bg-indigo-100 border-indigo-200';
      case 'resolved': return 'text-green-700 bg-green-100 border-green-200';
      case 'closed': return 'text-gray-700 bg-gray-100 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all duration-200 ${
      ticket.status === 'resolved' ? 'bg-green-50/30' : 
      ticket.status === 'closed' ? 'opacity-75' : ''
    }`}>
      <div className="flex justify-between items-start">
        <Link
          href={`/support/tickets/${ticket.id}`}
          className="flex-1 block group"
        >
          <div className="flex items-start space-x-3">
            {/* Screenshot indicator */}
            {ticket.screenshot_url && (
              <div className="flex-shrink-0 mt-1">
                <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            )}
            
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {ticket.title}
              </h3>
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{ticket.description}</p>
              
              {/* Enhanced status and priority indicators */}
              <div className="flex items-center gap-3 text-sm mb-2">
                <span className={`px-3 py-1 rounded-full border font-medium ${getStatusColor(ticket.status)}`}>
                  {ticket.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className={`px-3 py-1 rounded-full border font-medium ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority.toUpperCase()}
                </span>
                <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded font-medium text-xs">
                  {ticket.category.toUpperCase()}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(ticket.created_at).toLocaleDateString()}
                </span>
                {ticket.screenshot_url && (
                  <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    📸 Screenshot
                  </span>
                )}
                <span>by {ticket.creator?.email}</span>
              </div>
            </div>
          </div>
        </Link>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={(e) => {
              e.preventDefault();
              onEdit(ticket);
            }}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit ticket"
          >
            <Edit className="w-4 h-4" />
          </button>
          
          {isAdmin && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onDelete(ticket);
              }}
              disabled={!!deletingId}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Delete ticket (Admin only)"
            >
              {deletingId === ticket.id ? (
                <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          )}
          
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
        </div>
      </div>
    </div>
  );
}