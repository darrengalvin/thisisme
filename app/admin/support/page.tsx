'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BarChart3, Users, Clock, AlertCircle, ChevronRight, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  _count?: { count: number }[];
}

interface KanbanData {
  backlog: Ticket[];
  todo: Ticket[];
  doing: Ticket[];
  testing: Ticket[];
  done: Ticket[];
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500';
      case 'high': return 'border-orange-500';
      case 'medium': return 'border-yellow-500';
      case 'low': return 'border-green-500';
      default: return 'border-gray-300';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white p-3 rounded-lg shadow-sm border-l-4 ${getPriorityColor(ticket.priority)} cursor-move hover:shadow-md transition-shadow`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-sm text-gray-900 line-clamp-2">{ticket.title}</h4>
        <span className={`text-xs px-2 py-1 rounded ${
          ticket.priority === 'critical' ? 'bg-red-100 text-red-700' :
          ticket.priority === 'high' ? 'bg-orange-100 text-orange-700' :
          ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        }`}>
          {ticket.priority}
        </span>
      </div>
      <p className="text-xs text-gray-600 line-clamp-2 mb-2">{ticket.description}</p>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{ticket.category}</span>
          {ticket.assignee && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">{ticket.assignee.email.split('@')[0]}</span>
            </div>
          )}
        </div>
        <span className="text-xs text-gray-400">
          #{ticket.id.slice(0, 6)}
        </span>
      </div>
    </div>
  );
}

function KanbanColumn({ title, tickets, stage }: { title: string; tickets: Ticket[]; stage: string }) {
  const getColumnColor = () => {
    switch (stage) {
      case 'backlog': return 'bg-gray-50';
      case 'todo': return 'bg-blue-50';
      case 'doing': return 'bg-purple-50';
      case 'testing': return 'bg-orange-50';
      case 'done': return 'bg-green-50';
      default: return 'bg-gray-50';
    }
  };

  return (
    <div className={`flex-1 ${getColumnColor()} rounded-lg p-4`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
          {tickets.length}
        </span>
      </div>
      <div className="space-y-3 min-h-[500px]">
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export default function AdminSupportPage() {
  const [kanbanData, setKanbanData] = useState<KanbanData>({
    backlog: [],
    todo: [],
    doing: [],
    testing: [],
    done: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const checkAdminAndFetchData = async () => {
    try {
      const response = await fetch('/api/admin/support/kanban');
      
      if (response.status === 403) {
        router.push('/support');
        return;
      }
      
      const data = await response.json();
      
      if (response.ok) {
        setKanbanData(data.kanban);
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Error fetching kanban data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeStage = Object.keys(kanbanData).find(stage =>
      kanbanData[stage as keyof KanbanData].some(ticket => ticket.id === active.id)
    );
    
    if (activeStage) {
      const ticket = kanbanData[activeStage as keyof KanbanData].find(t => t.id === active.id);
      setActiveTicket(ticket || null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveTicket(null);
      return;
    }

    const activeStage = Object.keys(kanbanData).find(stage =>
      kanbanData[stage as keyof KanbanData].some(ticket => ticket.id === active.id)
    );
    
    const overStage = Object.keys(kanbanData).find(stage =>
      kanbanData[stage as keyof KanbanData].some(ticket => ticket.id === over.id)
    );

    if (activeStage && overStage) {
      if (activeStage !== overStage) {
        const activeTicket = kanbanData[activeStage as keyof KanbanData].find(t => t.id === active.id);
        
        if (activeTicket) {
          const newKanbanData = { ...kanbanData };
          newKanbanData[activeStage as keyof KanbanData] = newKanbanData[activeStage as keyof KanbanData].filter(
            t => t.id !== active.id
          );
          newKanbanData[overStage as keyof KanbanData] = [...newKanbanData[overStage as keyof KanbanData], activeTicket];
          
          setKanbanData(newKanbanData);
          
          try {
            await fetch('/api/admin/support/kanban', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ticketId: active.id,
                newStage: overStage,
              }),
            });
          } catch (error) {
            console.error('Error updating ticket stage:', error);
            checkAdminAndFetchData();
          }
        }
      }
    }
    
    setActiveTicket(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Support Admin Dashboard</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Link
              href="/admin/support/reports"
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Tickets</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.values(kanbanData).flat().length}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </Link>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Open</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {kanbanData.backlog.length + kanbanData.todo.length}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {kanbanData.doing.length + kanbanData.testing.length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{kanbanData.done.length}</p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Kanban Board</h2>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              <KanbanColumn title="Backlog" tickets={kanbanData.backlog} stage="backlog" />
              <KanbanColumn title="Todo" tickets={kanbanData.todo} stage="todo" />
              <KanbanColumn title="Doing" tickets={kanbanData.doing} stage="doing" />
              <KanbanColumn title="Testing" tickets={kanbanData.testing} stage="testing" />
              <KanbanColumn title="Done" tickets={kanbanData.done} stage="done" />
            </div>
            
            <DragOverlay>
              {activeTicket ? <TicketCard ticket={activeTicket} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  );
}