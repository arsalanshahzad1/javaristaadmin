import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi, type AdminNotification, type NotificationSeverity } from '../../api/notifications.api';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const severityStyles: Record<NotificationSeverity, { bg: string; text: string }> = {
  low:      { bg: 'bg-[#333]',            text: 'text-[#aaa]' },
  medium:   { bg: 'bg-yellow-900/40',     text: 'text-yellow-400' },
  high:     { bg: 'bg-orange-900/40',     text: 'text-orange-400' },
  critical: { bg: 'bg-red-900/40',        text: 'text-red-400' },
};

function SeverityBadge({ severity }: { severity?: NotificationSeverity }) {
  if (!severity) return null;
  const s = severityStyles[severity];
  return (
    <span className={`ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${s.bg} ${s.text}`}>
      {severity}
    </span>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const data = await notificationsApi.getNotifications({ limit: 10 });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silently ignore fetch errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleClickNotification = async (n: AdminNotification) => {
    if (!n.isRead) {
      await notificationsApi.markAsRead(n._id);
      setNotifications((prev) =>
        prev.map((item) => (item._id === n._id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);

    // Navigate to submission detail if available, otherwise fall back to link.
    if (n.submissionId) {
      navigate(`/checklists/submissions/${n.submissionId}`);
    } else if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative text-[#666] hover:text-white transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-[#D62B2B] rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-80 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A]">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-[#D62B2B] hover:text-red-400 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#666]">No notifications</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleClickNotification(n)}
                  className={`w-full text-left px-4 py-3 border-b border-[#2A2A2A] last:border-0 hover:bg-[#242424] transition-colors ${
                    !n.isRead ? 'bg-[#1E1E1E]' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && (
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#4A9EFF] flex-shrink-0" />
                    )}
                    <div className={!n.isRead ? '' : 'ml-3.5'}>
                      <div className="flex items-center flex-wrap gap-1 leading-tight">
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        <SeverityBadge severity={n.severity} />
                      </div>
                      <p className="text-xs text-[#999] mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[11px] text-[#555] mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
