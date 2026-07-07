import { useEffect, useState } from 'react';
import { checkBackendHealth } from '@/lib/apiStore';

type Status = 'checking' | 'online' | 'offline' | 'degraded';

export function BackendStatus() {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const result = await checkBackendHealth();
      if (!mounted) return;
      setStatus(result.healthy ? 'online' : 'degraded');
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const dot =
    status === 'online'   ? 'bg-success animate-pulse' :
    status === 'degraded' ? 'bg-warning animate-pulse' :
    status === 'offline'  ? 'bg-destructive' :
    'bg-muted animate-pulse';

  const label =
    status === 'online'   ? 'Backend online' :
    status === 'degraded' ? 'Backend degraded' :
    status === 'offline'  ? 'Backend offline' :
    'Checking…';

  return (
    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
