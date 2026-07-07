import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Bell, ArrowRight, DollarSign, Briefcase, MessageSquare, ShieldAlert } from 'lucide-react';
import api from '../lib/api';
import { syncFreelanceData } from '../lib/apiStore';
import { toast } from 'sonner';

export const Route = createFileRoute('/notifications')({
  head: () => ({ meta: [{ title: 'Notifications — EDITH' }] }),
  component: NotificationsPage,
});

interface PlatformNotification {
  id: string;
  type: 'message' | 'proposal' | 'payment' | 'other';
  platformAccountId: string | null;
  title: string;
  description: string;
  externalUrl?: string;
  isRead: boolean;
  createdAt: string;
}

function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'message' | 'proposal' | 'payment' | 'other'>('all');
  const [loading, setLoading] = useState(true);

  const handleAcceptContract = async (n: PlatformNotification) => {
    try {
      let jobId = '';
      let proposalId = '';
      
      if (n.externalUrl && n.externalUrl.includes('sim-job:')) {
        const parts = n.externalUrl.split(';');
        jobId = (parts[0] || '').replace('sim-job:', '').trim();
        proposalId = (parts[1] || '').replace('sim-prop:', '').trim();
      }
      
      if (jobId && proposalId) {
        await api.freelance.createActiveJob({ jobId, proposalId });
      } else {
        await api.freelance.createManualJob({
          title: n.title.replace(/.*Proposal Accepted:\s*/i, '') || 'Custom React Task',
          category: 'Web Dev',
          description: n.description,
          budget: 850
        });
      }
      
      toast.success('Contract successfully accepted! Initiating Task Processor...');
      await syncFreelanceData();
      navigate({ to: '/processor' });
    } catch (err: any) {
      toast.error('Failed to accept contract: ' + err.message);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.platform.notifications() as any;
      if (res?.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch platform notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="h-4 w-4 text-blue-400" />;
      case 'proposal': return <Briefcase className="h-4 w-4 text-emerald-400" />;
      case 'payment': return <DollarSign className="h-4 w-4 text-success" />;
      default: return <Bell className="h-4 w-4 text-warning" />;
    }
  };

  const getPlatformClass = (title: string) => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('upwork')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (titleLower.includes('fiverr')) return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (titleLower.includes('freelancer')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-primary/10 text-primary border-primary/20';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notification Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">Unified alerts, proposal updates, and payments across connected channels.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 pb-1 border-b border-border/60">
        {(['all', 'message', 'proposal', 'payment', 'other'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
              filter === key ? 'bg-primary/15 text-primary border border-primary/30' : 'border border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {loading && notifications.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center space-y-2">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">All caught up!</p>
          <p className="text-xs text-muted-foreground">No alerts match your current filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card transition-all hover:border-primary/30 ${
                !n.isRead ? 'border-l-4 border-l-primary' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-card p-2.5 border border-border/60 shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getPlatformClass(n.title)}`}>
                      {n.title.split(' ')[0] || 'EDITH'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(n.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold leading-snug text-foreground">{n.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{n.description}</p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {n.externalUrl && (
                    <a
                      href={n.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-primary hover:underline"
                    >
                      View on Platform <ArrowRight className="h-3 w-3" />
                    </a>
                  )}
                  {n.type === 'proposal' && (
                    <button
                      onClick={() => handleAcceptContract(n)}
                      className="rounded bg-primary px-2.5 py-1 text-[10px] font-bold uppercase text-primary-foreground hover:bg-primary/95"
                    >
                      Accept & Process
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
