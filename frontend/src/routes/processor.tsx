import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { Cpu, Play, Pause, XCircle, CheckCircle, RefreshCw, Download, Clipboard, Check, Activity, ArrowRight, ShieldCheck, ListTodo, AlertCircle, Sparkles } from 'lucide-react';
import { useHydrated } from '@/lib/store';
import { syncFreelanceData } from '@/lib/apiStore';
import api, { API_KEY } from '../lib/api';
import { toast } from 'sonner';

function PlatformBadge({ platform }: { platform: string }) {
  const normalized = platform.toLowerCase();
  const colors: Record<string, string> = {
    upwork: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    fiverr: "bg-green-500/10 text-green-500 border-green-500/20",
    toptal: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    contra: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    peopleperhour: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    freelancer: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  };
  const colorClass = colors[normalized] || "bg-muted text-muted-foreground border-border/40";
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${colorClass}`}>
      {platform}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--destructive)";
  return (
    <div className="relative h-14 w-14 shrink-0 font-mono">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--muted)" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${(score / 100) * 97.4} 97.4`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold text-foreground">{score}</div>
    </div>
  );
}

export const Route = createFileRoute('/processor')({
  head: () => ({ meta: [{ title: 'Live Task Processor — EDITH' }] }),
  component: ProcessorPage,
});

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
}

interface OutputFile {
  fileId: string;
  filename: string;
  url: string;
}

interface ProcessorSession {
  id: string;
  jobId: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  currentStep: 'planning' | 'execution' | 'qc' | 'delivery';
  progressPercent: number;
  logs: LogEntry[];
  outputFiles: OutputFile[];
}

function ProcessorPage() {
  const activeJobs = useHydrated((s) => s.activeJobs, [] as any[]);
  const jobs = useHydrated((s) => s.jobs, [] as any[]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<ProcessorSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [delivering, setDelivering] = useState(false);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Poll session status if a session is selected and running/paused
  useEffect(() => {
    if (!selectedSessionId) return;

    let active = true;
    const fetchStatus = async () => {
      try {
        const res = await api.processor.status(selectedSessionId) as any;
        if (res?.data && active) {
          setSession(res.data);
          
          // Stop polling if completed or failed
          if (res.data.status === 'completed' || res.data.status === 'failed') {
            syncFreelanceData(); // Refresh active jobs data
          }
        }
      } catch (err) {
        console.error('Failed to poll processor status:', err);
      }
    };

    fetchStatus();
    const interval = setInterval(() => {
      if (session?.status === 'running' || session?.status === 'paused' || !session) {
        fetchStatus();
      }
    }, 1500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedSessionId, session?.status]);

  // Scroll terminal logs to bottom
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.logs]);

  // Re-sync freelance active jobs on mount
  useEffect(() => {
    syncFreelanceData();
  }, []);

  const handleStart = async (jobId: string) => {
    try {
      const res = await api.processor.start(jobId) as any;
      if (res?.data) {
        setSession(res.data);
        setSelectedSessionId(res.data.id);
        toast.success('Task execution pipeline initialized.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start execution pipeline.');
    }
  };

  const handlePause = async () => {
    if (!selectedSessionId) return;
    try {
      await api.processor.pause(selectedSessionId);
      toast.info('Pipeline execution paused.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to pause.');
    }
  };

  const handleResume = async () => {
    if (!selectedSessionId) return;
    try {
      await api.processor.resume(selectedSessionId);
      toast.success('Pipeline execution resumed.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resume.');
    }
  };

  const handleCancel = async () => {
    if (!selectedSessionId) return;
    try {
      await api.processor.cancel(selectedSessionId);
      toast.warning('Pipeline execution cancelled.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel.');
    }
  };

  const handleCopyMessage = (msg: string) => {
    navigator.clipboard.writeText(msg);
    setCopied(true);
    toast.success('Delivery message copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeliver = async (jobId: string, outputFiles: OutputFile[], deliveryMessage?: string) => {
    setDelivering(true);
    try {
      // In activeJobs list, find current activeJob's details
      const activeJob = activeJobs.find(aj => aj.id === jobId);
      const msg = deliveryMessage || activeJob?.deliveryMessage || 'Please find the completed deliverables attached.';
      
      await api.freelance.deliverJob(jobId, {
        files: outputFiles,
        deliveryMessage: msg
      });
      
      toast.success('Job marked as DELIVERED successfully!');
      setSelectedSessionId(null);
      setSession(null);
      syncFreelanceData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete delivery.');
    } finally {
      setDelivering(false);
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'planning': return <ListTodo className="h-5 w-5" />;
      case 'execution': return <Cpu className="h-5 w-5" />;
      case 'qc': return <ShieldCheck className="h-5 w-5" />;
      case 'delivery': return <CheckCircle className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const getLogColorClass = (type: string) => {
    switch (type) {
      case 'success': return 'text-emerald-400';
      case 'warn': return 'text-amber-400';
      case 'error': return 'text-rose-500';
      default: return 'text-slate-300';
    }
  };

  // Filter activeJobs to only show ones currently in planning, execution, qc, or ready
  const processableJobs = activeJobs.filter(aj => {
    const col = aj.column || aj.status;
    return col === 'planning' || col === 'in_execution' || col === 'execution' || col === 'qc_review' || col === 'qc' || col === 'ready_to_deliver' || col === 'ready';
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Task Processor</h1>
        <p className="mt-1 text-sm text-muted-foreground">Run and monitor real-time AI swarms executing active freelance contracts.</p>
      </div>

      {processableJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 py-20 text-center space-y-3 bg-gradient-card">
          <Cpu className="h-10 w-10 text-muted-foreground opacity-60" />
          <p className="text-sm font-medium">No jobs ready for processing</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            To execute a contract, manually accept a proposal in the proposals tab, move the job card to the Kanban board, and it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {processableJobs.map((job, idx) => {
            const parentJob = jobs.find(j => j.title === job.title);
            const category = parentJob?.category || 'Content';
            const platform = parentJob?.platform || 'Upwork';
            const score = parentJob?.score || 78;
            const desc = parentJob?.desc || 'Active contract execution in progress.';
            const tags = parentJob?.tags || ['#Contract', '#Active'];
            const insight = parentJob?.insight || 'Swarm execution pipeline ready to run tasks.';
            const budget = parentJob?.budget || `$${job.budget}`;
            const rating = parentJob?.rating || 4.9;
            const days = parentJob?.days || 7;

            const handleCardClick = () => {
              setSelectedSessionId(job.id);
              // Setup default/current session status based on job progress
              setSession({
                id: job.id,
                jobId: job.id,
                status: job.progress >= 100 ? 'completed' : 'running',
                currentStep: job.status === 'planning' ? 'planning' : job.status === 'execution' ? 'execution' : job.status === 'qc' ? 'qc' : 'delivery',
                progressPercent: job.progress,
                logs: [
                  { time: new Date().toLocaleTimeString(), message: '⚙️ Pipeline loaded from active contract status.', type: 'info' }
                ],
                outputFiles: job.deliveryFiles || []
              });
            };

            return (
              <div
                key={job.id}
                onClick={handleCardClick}
                className="group rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow flex flex-col justify-between space-y-4 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <span className="font-mono text-xs text-muted-foreground">#{String(idx + 1).padStart(2, "0")}</span>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">{category}</span>
                          <PlatformBadge platform={platform} />
                        </div>
                        <h3 className="mt-1.5 text-base font-semibold leading-snug text-foreground">{job.title}</h3>
                      </div>
                      <ScoreBadge score={score} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>💰 Budget: <span className="text-foreground font-medium">{budget}</span></span>
                      <span>⭐ Rating: <span className="text-foreground font-medium">{rating}</span></span>
                      <span>📅 <span className="text-foreground font-medium">{days} days</span></span>
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">{desc}</p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tags.map((t: string) => (
                        <span key={t} className="rounded-md border border-border bg-card/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                      ))}
                    </div>

                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">AI Analysis</p>
                        <p className="text-xs text-foreground/90">{insight}</p>
                      </div>
                    </div>

                    {/* Stepper Progress bar inside card */}
                    <div className="mt-4 pt-3 border-t border-border/30 space-y-1.5">
                      <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                        <span>Swarm Stage: <span className="text-foreground capitalize">{(job.column || job.status || 'planning').replace(/_/g, ' ')}</span></span>
                        <span>{Math.round(job.progress)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-card border border-border/40 overflow-hidden">
                        <div className="h-full bg-gradient-primary rounded-full transition-all duration-500" style={{ width: `${job.progress}%` }} />
                      </div>
                    </div>

                    <div className="mt-4 pt-2 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStart(job.id);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition-all"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Process
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/65 px-3 py-1.5 text-xs font-semibold hover:bg-card transition-all"
                      >
                        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                        View Live Swarm
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Pipeline Modal Overlay */}
      {selectedSessionId && session && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0b12] border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Cpu className="h-4 w-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Task execution pipeline</h3>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      session.status === 'running' ? 'bg-success animate-pulse' :
                      session.status === 'paused' ? 'bg-amber-400' :
                      session.status === 'completed' ? 'bg-indigo-400' : 'bg-rose-500'
                    }`} />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                      Status: {session.status}
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setSelectedSessionId(null);
                  setSession(null);
                }}
                className="p-1 rounded-lg border border-border/60 hover:bg-card text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
              
              {/* Progress Stepper */}
              <div className="grid grid-cols-4 gap-2 relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border/40 -translate-y-1/2 z-0" />
                
                {(['planning', 'execution', 'qc', 'delivery'] as const).map((step, idx) => {
                  const stepsOrder = ['planning', 'execution', 'qc', 'delivery'];
                  const currentIdx = stepsOrder.indexOf(session.currentStep);
                  const isCompleted = idx < currentIdx || session.status === 'completed';
                  const isActive = idx === currentIdx && session.status === 'running';
                  const isPending = idx > currentIdx && session.status !== 'completed';

                  return (
                    <div key={step} className="flex flex-col items-center text-center space-y-2 relative z-10">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center border transition-all ${
                        isCompleted ? 'bg-emerald-500 border-emerald-400 text-white' :
                        isActive ? 'bg-primary border-primary text-white shadow-glow' :
                        'bg-[#0d0d16] border-border text-muted-foreground'
                      }`}>
                        {isActive ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          getStepIcon(step)
                        )}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        isActive ? 'text-primary' : isCompleted ? 'text-emerald-400' : 'text-muted-foreground'
                      }`}>
                        {step === 'qc' ? 'Quality Check' : step}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>Pipeline Progress</span>
                  <span>{session.progressPercent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-card border border-border/40 overflow-hidden">
                  <div className="h-full bg-gradient-primary rounded-full transition-all duration-300" style={{ width: `${session.progressPercent}%` }} />
                </div>
              </div>

              {/* Console Logs */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Typewriter Log Console</span>
                <div className="bg-[#07070c] border border-border rounded-xl p-4 font-mono text-[11px] h-60 overflow-y-auto shadow-inner text-slate-300 space-y-1.5 scrollbar-thin">
                  {(Array.isArray(session.logs) ? session.logs : (typeof session.logs === 'string' ? (() => { try { return JSON.parse(session.logs); } catch { return []; } })() : [])).map((l: any, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-muted-foreground shrink-0 select-none font-mono">[{l.time}]</span>
                      <span className={`${getLogColorClass(l.type)} flex-1 leading-normal whitespace-pre-wrap`}>
                        {l.message}
                      </span>
                    </div>
                  ))}
                  <div ref={consoleEndRef} />
                </div>
              </div>

              {/* Deliverables Outcomes & Packages */}
              {session.status === 'completed' && (
                <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Outcome Compiled Successfully</span>
                  </div>

                  {/* Output files list */}
                  {(() => {
                    const files = Array.isArray(session.outputFiles) ? session.outputFiles : (typeof session.outputFiles === 'string' ? (() => { try { return JSON.parse(session.outputFiles); } catch { return []; } })() : []);
                    return files.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Downloads</label>
                        <div className="flex flex-wrap gap-2">
                          {files.map((f: any, i: number) => (
                            <a
                              key={i}
                              href={f.url.startsWith('http') ? `${f.url}?apiKey=${API_KEY}` : `${api.processor.downloadUrl(session.id).split('/api/v1/processor')[0]}${f.url}?apiKey=${API_KEY}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs hover:border-primary/40 hover:bg-card/90 transition-all font-semibold"
                            >
                              <Download className="h-3 w-3 text-muted-foreground" />
                              {f.filename}
                            </a>
                          ))}
                          
                          {/* Download Bundle ZIP */}
                          <a
                            href={`${api.processor.downloadUrl(session.id)}?apiKey=${API_KEY}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20 transition-all font-bold"
                          >
                            <Download className="h-3 w-3" />
                            Download ZIP Bundle
                          </a>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Auto-generated Delivery Message */}
                  {activeJobs.find(aj => aj.id === session.jobId)?.deliveryMessage && (
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Generated Delivery Message</label>
                        <button
                          onClick={() => handleCopyMessage(activeJobs.find(aj => aj.id === session.jobId)?.deliveryMessage || '')}
                          className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                          {copied ? 'Copied' : 'Copy Message'}
                        </button>
                      </div>
                      <div className="rounded-lg bg-card/60 border border-border/40 p-3 text-[11px] leading-relaxed text-muted-foreground italic max-h-24 overflow-y-auto">
                        {activeJobs.find(aj => aj.id === session.jobId)?.deliveryMessage}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="p-4 border-t border-border bg-card/20 flex gap-2 justify-end">
              {session.status === 'running' && (
                <>
                  <button
                    onClick={handlePause}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-bold uppercase hover:bg-card transition-all"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Pause
                  </button>
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-500 px-4 py-2 text-xs font-bold uppercase hover:bg-rose-500/20 transition-all"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSessionId(null);
                      setSession(null);
                    }}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-bold uppercase hover:bg-card transition-all"
                  >
                    Close
                  </button>
                </>
              )}

              {session.status === 'paused' && (
                <>
                  <button
                    onClick={handleResume}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase text-primary-foreground shadow-glow hover:bg-primary/95 transition-all"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Resume
                  </button>
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-500 px-4 py-2 text-xs font-bold uppercase hover:bg-rose-500/20 transition-all"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSessionId(null);
                      setSession(null);
                    }}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-bold uppercase hover:bg-card transition-all"
                  >
                    Close
                  </button>
                </>
              )}

              {session.status === 'completed' && (
                <>
                  <button
                    onClick={() => handleDeliver(session.jobId, session.outputFiles)}
                    disabled={delivering}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase text-primary-foreground shadow-glow hover:bg-primary/95 transition-all disabled:opacity-50"
                  >
                    {delivering ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5" />
                    )}
                    {delivering ? 'Delivering...' : 'Deliver to Client'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSessionId(null);
                      setSession(null);
                    }}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-bold uppercase hover:bg-card transition-all"
                  >
                    Close
                  </button>
                </>
              )}

              {(session.status === 'failed' || session.status === 'completed' === false) && session.status !== 'running' && session.status !== 'paused' && (
                <button
                  onClick={() => {
                    setSelectedSessionId(null);
                    setSession(null);
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-bold uppercase hover:bg-card transition-all"
                >
                  Close
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
