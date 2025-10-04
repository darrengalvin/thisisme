'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, 
  User, 
  Clock, 
  MessageSquare, 
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  TestTube2,
  Archive,
  List,
  LayoutGrid,
  Search,
  Filter,
  Plus,
  ChevronRight,
  Image as ImageIcon,
  Edit,
  Trash2,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import CreateTicketModal from '@/components/CreateTicketModal';
import EditTicketModal from '@/components/EditTicketModal';
import type { 
  Ticket as TicketType, 
  TicketListItem, 
  TicketStatus, 
  TicketStage, 
  TicketPriority,
  TicketCategory 
} from '@/types/support';

// Using imported types with local interface for additional fields
interface Ticket extends TicketType {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  stage: string;
  created_at: string;
  updated_at?: string;
  creator: { email: string };
  assignee?: { email: string };
  comments?: { count: number }[];
  screenshot_url?: string;
  metadata?: {
    has_screenshot?: boolean;
    screenshot_url?: string;
  };
}

interface KanbanData {
  backlog: Ticket[];
  todo: Ticket[];
  doing: Ticket[];
  testing: Ticket[];
  done: Ticket[];
}

const STAGES = [
  { id: 'backlog', title: 'Backlog', icon: Archive, color: 'gray' },
  { id: 'todo', title: 'To Do', icon: AlertCircle, color: 'blue' },
  { id: 'doing', title: 'In Progress', icon: PlayCircle, color: 'purple' },
  { id: 'testing', title: 'Testing', icon: TestTube2, color: 'orange' },
  { id: 'done', title: 'Done', icon: CheckCircle2, color: 'green' },
];

export default function UnifiedSupportPage() {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [kanbanData, setKanbanData] = useState<KanbanData>({
    backlog: [],
    todo: [],
    doing: [],
    testing: [],
    done: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [draggedTicket, setDraggedTicket] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [deletingTicket, setDeletingTicket] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchKanbanData();
  }, []);

  const handleEditTicket = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setShowEditModal(true);
    setSelectedTicket(null); // Close detail modal
  };

  const handleDeleteTicket = (ticket: Ticket) => {
    setTicketToDelete(ticket);
    setShowDeleteConfirm(true);
    setSelectedTicket(null); // Close detail modal
  };

  const confirmDeleteTicket = async () => {
    if (!ticketToDelete) return;
    
    setDeletingTicket(ticketToDelete.id);
    try {
      const response = await fetch(`/api/support/tickets/${ticketToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchKanbanData(); // Refresh
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

  const fetchKanbanData = async () => {
    try {
      const response = await fetch('/api/admin/support/kanban', {
        credentials: 'include'
      });
      
      if (response.status === 403) {
        router.push('/support');
        return;
      }
      
      const data = await response.json();
      
      if (response.ok) {
        setKanbanData(data.kanban);
      }
    } catch (error) {
      console.error('Error fetching kanban data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (ticketId: string) => {
    setDraggedTicket(ticketId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetStage: string) => {
    if (!draggedTicket) return;

    let sourceStage = '';
    let ticket: Ticket | undefined;
    
    for (const [stage, tickets] of Object.entries(kanbanData)) {
      ticket = tickets.find(t => t.id === draggedTicket);
      if (ticket) {
        sourceStage = stage;
        break;
      }
    }

    if (!ticket || sourceStage === targetStage) {
      setDraggedTicket(null);
      return;
    }

    const newKanbanData = { ...kanbanData };
    newKanbanData[sourceStage as keyof KanbanData] = newKanbanData[sourceStage as keyof KanbanData]
      .filter(t => t.id !== draggedTicket);
    newKanbanData[targetStage as keyof KanbanData] = [
      ...newKanbanData[targetStage as keyof KanbanData],
      { ...ticket, stage: targetStage }
    ];
          
          setKanbanData(newKanbanData);
    setDraggedTicket(null);
          
          try {
            await fetch('/api/admin/support/kanban', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
              body: JSON.stringify({
          ticketId: draggedTicket,
          newStage: targetStage,
              }),
            });
          } catch (error) {
      console.error('Error updating ticket:', error);
      fetchKanbanData();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500';
      case 'high': return 'border-orange-500';
      case 'medium': return 'border-yellow-500';
      case 'low': return 'border-green-500';
      default: return 'border-gray-300';
    }
  };

  // Get all tickets as flat list for list view
  const allTickets = Object.values(kanbanData).flat();
  
  // Apply filters
  const filteredTickets = allTickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
    const matchesCategory = filterCategory === 'all' || ticket.category === filterCategory;
    
    return matchesSearch && matchesPriority && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading support tickets...</p>
        </div>
      </div>
    );
  }

  const totalTickets = allTickets.length;
  const criticalCount = allTickets.filter(t => t.priority === 'critical').length;
  const openCount = allTickets.filter(t => t.stage !== 'done').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Support Dashboard</h1>
              <p className="text-gray-600">
                {totalTickets} total • {openCount} open • {criticalCount} critical
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Create Ticket Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Create Ticket
              </button>
              
              {/* View Toggle */}
              <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                <button
                onClick={() => setView('kanban')}
                className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                  view === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Kanban
              </button>
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                  view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <List className="w-4 h-4" />
                List
              </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {STAGES.map((stage) => {
              const Icon = stage.icon;
              const count = kanbanData[stage.id as keyof KanbanData].length;
              return (
                <div key={stage.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 text-${stage.color}-600`} />
                <div>
                      <div className="text-2xl font-bold text-gray-900">{count}</div>
                      <div className="text-xs text-gray-600">{stage.title}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search & Filters (List View Only) */}
          {view === 'list' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Priority Filter */}
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* Category Filter */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  <option value="security">Security</option>
                  <option value="performance">Performance</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="testing">Testing</option>
                  <option value="bug">Bug</option>
                  <option value="feature">Feature</option>
                  <option value="improvement">Improvement</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Kanban View */}
        {view === 'kanban' && (
          <div className="grid grid-cols-5 gap-4">
            {STAGES.map((stage) => {
              const Icon = stage.icon;
              const tickets = kanbanData[stage.id as keyof KanbanData];
              
              return (
                <div
                  key={stage.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200"
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(stage.id)}
                >
                  <div className={`p-4 border-b border-gray-200 bg-${stage.color}-50`}>
              <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 text-${stage.color}-600`} />
                        <h3 className={`font-semibold text-${stage.color}-900`}>
                          {stage.title}
                        </h3>
                      </div>
                      <span className={`text-sm font-medium text-${stage.color}-600 bg-${stage.color}-100 px-2 py-1 rounded-full`}>
                        {tickets.length}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 space-y-3 min-h-[500px]">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        draggable
                        onDragStart={() => handleDragStart(ticket.id)}
                        onClick={() => router.push(`/support/tickets/${ticket.id}`)}
                        className={`
                          bg-white border-2 rounded-lg p-3 cursor-pointer
                          hover:shadow-md transition-all
                          ${draggedTicket === ticket.id ? 'opacity-50 scale-95' : ''}
                          ${getPriorityBorderColor(ticket.priority)}
                        `}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-400">#{ticket.id.slice(0, 6)}</span>
                        </div>

                        <h4 className="font-medium text-sm text-gray-900 mb-2 line-clamp-2">
                          {ticket.title}
                        </h4>

                        <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                          {ticket.description}
                        </p>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {ticket.category}
                          </span>
                          {ticket.metadata?.has_screenshot && (
                            <ImageIcon className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      </div>
                    ))}

                    {tickets.length === 0 && (
                      <div className="text-center text-gray-400 text-sm py-8">
                        No tickets
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div className="space-y-3">
            {filteredTickets.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No tickets found</h3>
                <p className="text-gray-600">Try adjusting your search or filters</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => router.push(`/support/tickets/${ticket.id}`)}
                  className={`bg-white rounded-lg shadow-sm border-l-4 ${getPriorityBorderColor(ticket.priority)} p-6 cursor-pointer hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority.toUpperCase()}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                          {ticket.category}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                          {STAGES.find(s => s.id === ticket.stage)?.title}
                        </span>
                        {ticket.metadata?.has_screenshot && (
                          <ImageIcon className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{ticket.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{ticket.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {ticket.creator.email.split('@')[0]}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </div>
                        {ticket.comments && ticket.comments[0]?.count > 0 && (
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {ticket.comments[0].count} comments
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Ticket Detail Modal - Removed, now goes directly to full detail page */}
      {false && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getPriorityColor(selectedTicket.priority)}`}>
                    {selectedTicket.priority.toUpperCase()}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                    {selectedTicket.category}
                  </span>
                  <span className="text-xs text-gray-500">#{selectedTicket.id.slice(0, 8)}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedTicket.title}</h2>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {selectedTicket.description}
                </div>
              </div>

              {selectedTicket.metadata?.screenshot_url && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Screenshot</h3>
                  <img 
                    src={selectedTicket.metadata.screenshot_url} 
                    alt="Ticket screenshot" 
                    className="rounded-lg border border-gray-200 max-w-full"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Created By</h3>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{selectedTicket.creator.email}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Created</h3>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {new Date(selectedTicket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Status</h3>
                <div className="flex items-center gap-2">
                  {STAGES.find(s => s.id === selectedTicket.stage)?.icon && (
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded">
                      {(() => {
                        const StageIcon = STAGES.find(s => s.id === selectedTicket.stage)!.icon;
                        return <StageIcon className="w-4 h-4 text-gray-600" />;
                      })()}
                      <span className="text-sm font-medium text-gray-700">
                        {STAGES.find(s => s.id === selectedTicket.stage)?.title}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <Link
                  href={`/support/tickets/${selectedTicket.id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Full Details
                </Link>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditTicket(selectedTicket)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTicket(selectedTicket)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchKanbanData();
        }}
      />

      {/* Edit Ticket Modal */}
      {editingTicket && (
        <EditTicketModal
          ticket={editingTicket}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingTicket(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingTicket(null);
            fetchKanbanData();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && ticketToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Ticket</h3>
                <p className="text-gray-600 text-sm">
                  Are you sure you want to delete "<strong>{ticketToDelete.title}</strong>"? 
                  This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setTicketToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={deletingTicket !== null}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTicket}
                disabled={deletingTicket !== null}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 flex items-center gap-2"
              >
                {deletingTicket ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
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

