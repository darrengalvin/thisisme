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
  Archive
} from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  stage: string;
  created_at: string;
  creator: { email: string };
  assignee?: { email: string };
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

export default function ImprovedSupportPage() {
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
  const router = useRouter();

  useEffect(() => {
    fetchKanbanData();
  }, []);

  const fetchKanbanData = async () => {
    try {
      console.log('🔍 Fetching kanban data...');
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
      console.error('❌ Error fetching kanban data:', error);
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

    // Find the ticket and its current stage
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

    // Optimistic update
    const newKanbanData = { ...kanbanData };
    newKanbanData[sourceStage as keyof KanbanData] = newKanbanData[sourceStage as keyof KanbanData]
      .filter(t => t.id !== draggedTicket);
    newKanbanData[targetStage as keyof KanbanData] = [
      ...newKanbanData[targetStage as keyof KanbanData],
      { ...ticket, stage: targetStage }
    ];
    
    setKanbanData(newKanbanData);
    setDraggedTicket(null);

    // Update server
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
      // Revert on error
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

  const totalTickets = Object.values(kanbanData).flat().length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Support Tickets</h1>
          <p className="text-gray-600">
            {totalTickets} total tickets • Drag tickets between columns to update status
          </p>
        </div>

        {/* Kanban Board */}
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
                {/* Column Header */}
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

                {/* Tickets */}
                <div className="p-3 space-y-3 min-h-[500px]">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      draggable
                      onDragStart={() => handleDragStart(ticket.id)}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`
                        bg-white border-2 rounded-lg p-3 cursor-pointer
                        hover:shadow-md transition-all
                        ${draggedTicket === ticket.id ? 'opacity-50 scale-95' : ''}
                        ${ticket.priority === 'critical' ? 'border-red-500' : 'border-gray-200'}
                      `}
                    >
                      {/* Priority Badge */}
                      <div className="flex items-start justify-between mb-2">
                        <span className={`text-xs px-2 py-1 rounded font-semibold ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400">#{ticket.id.slice(0, 6)}</span>
                      </div>

                      {/* Title */}
                      <h4 className="font-medium text-sm text-gray-900 mb-2 line-clamp-2">
                        {ticket.title}
                      </h4>

                      {/* Description Preview */}
                      <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                        {ticket.description}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {ticket.category}
                        </span>
                        {ticket.assignee && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{ticket.assignee.email.split('@')[0]}</span>
                          </div>
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
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
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

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Metadata */}
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

              {/* Current Stage */}
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

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Drag ticket to different column to change status
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

