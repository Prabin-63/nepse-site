import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PriceAlertManager from '../shared/PriceAlertManager';
import { useSystemNotifications } from '../../hooks/useSystemNotifications';
import { useAlertStore } from '../../store/alertStore';

interface NotificationDropdownProps {
  onClose: () => void;
}

export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const [activeTab, setActiveTab] = useState<'SYSTEM' | 'ALERTS'>('SYSTEM');
  const systemNotifications = useSystemNotifications();
  const activeAlerts = useAlertStore((s) => s.alerts.filter((a) => a.isActive).length);
  const navigate = useNavigate();

  const handleNotifClick = (href?: string) => {
    if (href) {
      navigate(href);
      onClose();
    }
  };

  return (
    <div className="bg-bg-surface border border-bg-border rounded-xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-bg-border bg-bg-elevated/30">
        <div className="flex gap-1 p-0.5 bg-bg-base rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('SYSTEM')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors
              ${activeTab === 'SYSTEM' ? 'bg-bg-elevated text-brand-cyan shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
          >
            System
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ALERTS')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5
              ${activeTab === 'ALERTS' ? 'bg-bg-elevated text-brand-cyan shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
          >
            Price Alerts
            {activeAlerts > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan text-[9px]">
                {activeAlerts}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'ALERTS' ? (
        <PriceAlertManager onClose={onClose} embedded />
      ) : (
        <>
          <div className="max-h-[min(400px,60vh)] overflow-y-auto">
            {systemNotifications.length > 0 ? (
              systemNotifications.map((notif) => {
                const Icon = notif.icon;
                return (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => handleNotifClick(notif.href)}
                    className={`w-full text-left p-4 border-b border-bg-border/50 hover:bg-bg-elevated/50 transition-colors group
                      ${notif.href ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg ${notif.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
                      >
                        <Icon size={16} className={notif.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5 gap-2">
                          <p className="text-[13px] font-semibold text-text-primary">{notif.title}</p>
                          <span className="text-[10px] text-text-muted whitespace-nowrap shrink-0">
                            {notif.time}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                          {notif.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-12 text-center">
                <Bell size={32} className="mx-auto text-bg-border mb-3" />
                <p className="text-sm text-text-muted font-medium">Loading market updates…</p>
              </div>
            )}
          </div>

          <Link
            to="/news-alerts"
            onClick={onClose}
            className="block p-3 text-center text-xs font-medium text-brand-cyan hover:bg-brand-cyan/5 transition-colors border-t border-bg-border"
          >
            View all news & alerts
          </Link>
        </>
      )}
    </div>
  );
}
