import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { AppNotification, UserRole } from '../types/campuscare';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/reportService';
import { formatDateTime } from './StatusIndicators';

export function NotificationBell({
  notifications,
  role,
}: {
  notifications: AppNotification[];
  role: UserRole;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleItemClick = async (item: AppNotification) => {
    if (!item.isRead) {
      await markNotificationRead(item.notificationId);
    }
    setOpen(false);
    const base = role === 'admin' ? '/admin/reports' : '/student/reports';
    navigate(`${base}/${item.reportId}`);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-xl border border-emerald-950/10 bg-white/75 backdrop-blur-md text-[#334155] hover:text-[#064E3B] hover:bg-white transition-colors"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#059669] text-white text-[10px] font-semibold flex items-center justify-center tabular-nums shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/90 backdrop-blur-2xl border border-emerald-950/10 rounded-2xl shadow-[0_20px_50px_-14px_rgba(6,78,59,0.2)] z-40 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-emerald-950/10 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#064E3B] font-display">
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllNotificationsRead(notifications)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#059669] hover:text-[#064E3B]"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-emerald-950/5">
              {notifications.length === 0 ? (
                <div className="py-10 px-4 text-center text-xs text-[#52635D]">
                  No notifications yet. Status updates will appear here.
                </div>
              ) : (
                notifications.slice(0, 8).map((item) => (
                  <button
                    key={item.notificationId}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={`w-full text-left px-4 py-3 hover:bg-emerald-50/70 transition-colors flex items-start gap-3 ${
                      !item.isRead ? 'bg-emerald-50/55' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs leading-relaxed ${
                          item.isRead
                            ? 'text-[#52635D]'
                            : 'text-[#0F172A] font-medium'
                        }`}
                      >
                        {item.message}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-[#64748B]">
                        <span className="font-mono text-[#047857]">{item.reportId}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#64748B] shrink-0 mt-0.5" />
                  </button>
                ))
              )}
            </div>

            <div className="px-4 py-2.5 bg-emerald-950/[0.03] border-t border-emerald-950/10 text-center">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate(
                    role === 'admin'
                      ? '/admin/notifications'
                      : '/student/notifications'
                  );
                }}
                className="text-xs font-semibold text-[#059669] hover:underline"
              >
                View all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
