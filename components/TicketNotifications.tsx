'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, MessageSquare, UserPlus } from 'lucide-react';

interface Notification {
  id: string;
  ticket_id: string;
  type: string;
  read: boolean;
  created_at: string;
  ticket?: {
    title: string;
  };
}

export default function TicketNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/support/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.filter((n: Notification) => !n.read).length || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/support/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/support/notifications/mark-all-read', {
        method: 'PUT',
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'created': return <AlertCircle className="w-4 h-4" />;
      case 'commented': return <MessageSquare className="w-4 h-4" />;
      case 'assigned': return <UserPlus className="w-4 h-4" />;
      case 'resolved': return <Check className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    const messages = {
      created: 'New ticket created',
      commented: 'New comment on ticket',
      status_changed: 'Ticket status changed',
      assigned: 'Ticket assigned to you',
      resolved: 'Ticket resolved',
    };
    return messages[notification.type as keyof typeof messages] || 'Ticket updated';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No notifications</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id);
                      }
                      window.location.href = `/support/tickets/${notification.ticket_id}`;
                    }}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-1 ${!notification.read ? 'text-blue-600' : 'text-gray-400'}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {getNotificationMessage(notification)}
                        </p>
                        {notification.ticket && (
                          <p className="text-xs text-gray-500 mt-1">
                            {notification.ticket.title}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.created_at).toRelativeTimeString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 10 && (
              <div className="p-3 text-center border-t border-gray-200">
                <a
                  href="/support/notifications"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View all notifications
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

declare global {
  interface Date {
    toRelativeTimeString(): string;
  }
}

Date.prototype.toRelativeTimeString = function() {
  const now = new Date();
  const diff = now.getTime() - this.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};