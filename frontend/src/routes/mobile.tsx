import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { toast } from "sonner";
import { useHydrated, useEdith } from "@/lib/store";
import { revenueData, breakdownData, sparkData } from "@/lib/mockData";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  LayoutDashboard,
  Briefcase,
  CreditCard,
  Users,
  MoreHorizontal,
  Bell,
  LogOut,
  RefreshCw,
  Play,
  CheckCircle,
  Send,
  MessageSquare,
  Activity,
  TrendingUp,
  ChevronRight,
  User,
  FileText,
  Sparkles,
  Search,
  Check,
  X,
  Plus,
  Loader2,
  FileDown,
  DollarSign,
  Store,
  Cpu,
  ArrowUpRight,
  AlertTriangle,
  Info,
  AlertCircle,
  Package,
  Hexagon,
  Zap
} from "lucide-react";

const KANBAN_STAGES = [
  { key: "planning", label: "Planning" },
  { key: "execution", label: "Execution" },
  { key: "qc", label: "QC Review" },
  { key: "delivery", label: "Ready to Deliver" },
];

export const Route = createFileRoute("/mobile")({
  head: () => ({ meta: [{ title: "EDITH Mobile Command" }] }),
  component: MobileDashboard,
});

type TabType = "home" | "tasks" | "payments" | "users" | "more";

function MobileDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Desktop Store Integrations
  const alerts = useHydrated((s) => s.alerts, [] as any[]);
  const activityList = useHydrated((s) => s.activity, [] as any[]);
  const proposalsStore = useHydrated((s) => s.proposals, [] as any[]);
  const productsList = useHydrated((s) => s.products, [] as any[]);
  const dismissAlert = useEdith((s) => s.dismissAlert);

  // Home Period filter
  const [period, setPeriod] = useState("30D");

  // Summary State structure aligned with desktop index.tsx
  const [summary, setSummary] = useState<any>({
    earnings: { total: 0, thisMonth: 0 },
    freelance: { totalJobs: 0, activeJobs: 0, newJobs: 0 },
    dropshipping: { totalStores: 0, activeStores: 0 },
    invoices: { pending: 0, pendingAmount: 0 },
    agents: { totalRuns: 0, errors: 0, avgDurationMs: 0 }
  });

  // Data States
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // Tasks Tab Specific State
  const [taskCategory, setTaskCategory] = useState<"active" | "completed" | "proposals">("active");
  const [activeStageFilter, setActiveStageFilter] = useState<"planning" | "execution" | "qc" | "delivery">("planning");
  const [selectedJob, setSelectedJob] = useState<any>(null);

  // Invoices Tab Specific State
  const [invoiceFilter, setInvoiceFilter] = useState<"unpaid" | "paid">("unpaid");

  // Chat Interface State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "edith"; text: string; time: string }>>([
    { sender: "edith", text: "EDITH Mobile Command initialized. State scanning active. Speak a command.", time: "System" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const prevNotificationsCount = useRef<number>(0);

  // Load cache on mount
  useEffect(() => {
    try {
      const cachedSummary = localStorage.getItem("edith_mobile_summary");
      const cachedActiveJobs = localStorage.getItem("edith_mobile_active_jobs");
      const cachedInvoices = localStorage.getItem("edith_mobile_invoices");

      if (cachedSummary) setSummary(JSON.parse(cachedSummary));
      if (cachedActiveJobs) setActiveJobs(JSON.parse(cachedActiveJobs));
      if (cachedInvoices) setInvoices(JSON.parse(cachedInvoices));
    } catch (e) {
      console.warn("Failed to load local storage cache", e);
    }
  }, []);

  // Request browser notification permissions
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  const refreshAllData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      // 1. Dashboard summary
      const sumRes = await api.dashboard.summary() as any;
      if (sumRes?.data) {
        setSummary(sumRes.data);
        localStorage.setItem("edith_mobile_summary", JSON.stringify(sumRes.data));
      }

      // 2. Active Jobs
      const jobsRes = await api.freelance.listActiveJobs() as any;
      if (jobsRes?.data) {
        setActiveJobs(jobsRes.data);
        localStorage.setItem("edith_mobile_active_jobs", JSON.stringify(jobsRes.data));
      }

      // 3. Completed Jobs
      const compRes = await api.freelance.listCompleted() as any;
      if (compRes?.data) setCompletedJobs(compRes.data);

      // 4. Proposals
      const propRes = await api.freelance.listProposals("draft") as any;
      if (propRes?.data) setProposals(propRes.data);

      // 5. Invoices
      const invRes = await api.payment.listInvoices() as any;
      if (invRes?.data) {
        setInvoices(invRes.data);
        localStorage.setItem("edith_mobile_invoices", JSON.stringify(invRes.data));
      }

      // 6. Users (Admin Only)
      if (user?.role === "admin") {
        const usersRes = await api.admin.listUsers() as any;
        if (usersRes?.data) setSystemUsers(usersRes.data);
      }

      // 7. Notifications
      if (user?.role === "admin") {
        const notifRes = await api.admin.listNotifications() as any;
        if (notifRes?.data) {
          const list = notifRes.data;
          setNotifications(list);

          const unreadCount = list.filter((n: any) => !n.read).length;
          if (unreadCount > prevNotificationsCount.current) {
            const latest = list.find((n: any) => !n.read);
            if (latest && Notification.permission === "granted") {
              new Notification(latest.title, {
                body: latest.message,
                icon: "/icon.svg",
              });
            }
          }
          prevNotificationsCount.current = unreadCount;
        }
      }

      if (!silent) toast.success("Data synced successfully");
    } catch (err: any) {
      console.error(err);
      if (!silent) toast.error("Error refreshing data: " + (err.message || "Connection failure"));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Poll for notifications every 15s
  useEffect(() => {
    refreshAllData(true);
    const interval = setInterval(() => {
      refreshAllData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleMarkPaid = async (id: string) => {
    try {
      await api.payment.markInvoicePaid(id);
      toast.success("Invoice marked as paid");
      refreshAllData(true);
    } catch (err: any) {
      toast.error("Failed to update payment status: " + err.message);
    }
  };

  const handleUserStatusUpdate = async (userId: string, newStatus: "active" | "blocked" | "pending") => {
    try {
      await api.admin.updateUserStatus(userId, newStatus);
      toast.success(`User updated to ${newStatus}`);
      refreshAllData(true);
    } catch (err: any) {
      toast.error("Failed to update user status: " + err.message);
    }
  };

  const handleUserDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      await api.admin.deleteUser(userId);
      toast.success("User deleted");
      refreshAllData(true);
    } catch (err: any) {
      toast.error("Failed to delete user: " + err.message);
    }
  };

  const handleScanJobs = async () => {
    toast.loading("Scanning platforms for job matches...", { id: "scan" });
    try {
      const res = await api.freelance.scanJobs() as any;
      if (res?.newJobs !== undefined) {
        toast.success(`Scan completed. Found ${res.newJobs} new jobs!`, { id: "scan" });
      } else {
        toast.success("Platform scan executed successfully.", { id: "scan" });
      }
      refreshAllData(true);
    } catch (err: any) {
      toast.error("Job scanning failed: " + err.message, { id: "scan" });
    }
  };

  const handleExportSummary = async () => {
    toast.loading("Compiling daily intelligence report...", { id: "report" });
    try {
      await api.analytics.exportReport({ format: "json", period: "24h" });
      toast.success("Report generated and saved to platform system storage.", { id: "report" });
    } catch (err: any) {
      toast.error("Report generation failed: " + err.message, { id: "report" });
    }
  };

  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech Recognition is not supported in this browser.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setIsListening(true);
      toast.info("Listening for voice commands...");
    };
    
    recognition.onerror = (e: any) => {
      console.error("Speech recognition error", e);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      setChatInput(resultText);
      toast.success(`Speech recognized: "${resultText}"`);
    };
    
    recognition.start();
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    const lowerText = userText.toLowerCase().trim();

    if (lowerText === "scan jobs" || lowerText === "job scan" || lowerText === "start scan") {
      setChatMessages(prev => [...prev, { sender: "user", text: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      setChatInput("");
      setChatMessages(prev => [...prev, { sender: "edith", text: "Initiating platform job scan now...", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      await handleScanJobs();
      return;
    }

    if (lowerText === "export report" || lowerText === "generate summary" || lowerText === "summary") {
      setChatMessages(prev => [...prev, { sender: "user", text: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      setChatInput("");
      setChatMessages(prev => [...prev, { sender: "edith", text: "Compiling business reports...", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      await handleExportSummary();
      return;
    }

    if (lowerText.includes("tab") || lowerText === "go to tasks" || lowerText === "go to payments" || lowerText === "go to home") {
      setChatMessages(prev => [...prev, { sender: "user", text: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      setChatInput("");
      let targetTab: TabType = "home";
      if (lowerText.includes("tasks")) targetTab = "tasks";
      else if (lowerText.includes("payments") || lowerText.includes("pay")) targetTab = "payments";
      else if (lowerText.includes("users")) targetTab = "users";
      setActiveTab(targetTab);
      setChatMessages(prev => [...prev, { sender: "edith", text: `Switched view tab to: ${targetTab}`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      return;
    }

    setChatMessages(prev => [...prev, { sender: "user", text: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setChatInput("");
    setChatBusy(true);

    try {
      const response = await api.chat.sendMessage({ message: userText }) as any;
      const responseText = response?.data?.reply || response?.reply || "AI process returned empty content. Verify backend logs.";
      setChatMessages(prev => [...prev, { sender: "edith", text: responseText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { sender: "edith", text: `AI communication error: ${err.message}`, time: "Error" }]);
    } finally {
      setChatBusy(false);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.admin.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      toast.success("Notification marked as read");
    } catch (err) {
      toast.error("Failed to update notification");
    }
  };

  const getStageDisplay = (column: string) => {
    switch (column?.toLowerCase()) {
      case "planning": return { label: "Planning", style: "bg-neutral-900 border-neutral-700 text-neutral-300" };
      case "in execution":
      case "execution": return { label: "Execution", style: "bg-neutral-900 border-neutral-700 text-neutral-300" };
      case "qc review":
      case "qc": return { label: "QC Review", style: "bg-neutral-900 border-neutral-700 text-neutral-300" };
      case "ready to deliver":
      case "delivery": return { label: "Delivery Ready", style: "bg-neutral-200 border-neutral-300 text-black font-semibold" };
      default: return { label: column || "Planning", style: "bg-neutral-950 border-neutral-850 text-neutral-400" };
    }
  };

  const handleMoveJob = async (jobId: string, targetColumn: string) => {
    try {
      await api.freelance.moveJob(jobId, targetColumn);
      toast.success(`Job moved to ${targetColumn}`);
      setSelectedJob(null);
      refreshAllData(true);
    } catch (err: any) {
      toast.error("Failed to move job: " + err.message);
    }
  };

  const handleExecuteJob = async (jobId: string) => {
    try {
      await api.freelance.executeJob(jobId, {});
      toast.success("AI Executing job instructions...");
      setSelectedJob(null);
      refreshAllData(true);
    } catch (err: any) {
      toast.error("AI execution failed: " + err.message);
    }
  };

  const handleQCJob = async (jobId: string) => {
    try {
      await api.freelance.runQC(jobId, {});
      toast.success("AI QC checks initiated...");
      setSelectedJob(null);
      refreshAllData(true);
    } catch (err: any) {
      toast.error("QC run failed: " + err.message);
    }
  };

  const handleDeliverJob = async (jobId: string) => {
    try {
      await api.freelance.deliverJob(jobId, {});
      toast.success("Job outputs delivered to client!");
      setSelectedJob(null);
      refreshAllData(true);
    } catch (err: any) {
      toast.error("Job delivery failed: " + err.message);
    }
  };

  // Recharts Helper Data Mappings (Desktop dashboard logic)
  const periodMap: Record<string, typeof revenueData> = {
    "7D": revenueData.slice(-3),
    "30D": revenueData,
    "90D": [...revenueData, ...revenueData.map((d, i) => ({ ...d, date: `Jun ${i + 1}`, freelance: d.freelance + 600, drop: d.drop + 400 }))],
    "1Y": [...revenueData, ...revenueData.map((d, i) => ({ ...d, date: `Q${i + 1}`, freelance: d.freelance * 3, drop: d.drop * 3 }))],
  };
  const chartsData = periodMap[period] || [];

  const hasRevenue = summary?.earnings?.total > 0;
  const pieData = hasRevenue ? [
    { name: "Freelance", value: summary.earnings.total * 0.65, color: "#FFFFFF" },
    { name: "Dropshipping", value: summary.earnings.total * 0.35, color: "#666666" }
  ] : [
    { name: "Freelance", value: 3200, color: "#FFFFFF" },
    { name: "Dropshipping", value: 1800, color: "#666666" }
  ];

  const autoRate = summary.agents.totalRuns > 0 
    ? Math.round(((summary.agents.totalRuns - summary.agents.errors) / summary.agents.totalRuns) * 100)
    : 92;

  // Metric variables
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  const unpaidInvoices = invoices.filter(inv => inv.status === "sent" || inv.status === "unpaid");
  const paidInvoices = invoices.filter(inv => inv.status === "paid");

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#08080A] via-[#0F0F12] to-[#141417] text-[#ECECED] font-sans pb-20 select-none">
      
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 h-16 bg-[#0B0B0E]/90 border-b border-neutral-850 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg border border-neutral-700 bg-neutral-900 flex items-center justify-center shadow-md shadow-black/60">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-extrabold tracking-widest text-white text-xs uppercase">
            EDITH
          </span>
        </div>
        
        <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-400">
          {activeTab}
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => refreshAllData()}
            className={`p-2 rounded-lg border border-neutral-800 bg-[#121216]/50 text-neutral-400 hover:text-white transition-colors active:scale-95 ${isRefreshing ? "animate-spin text-white border-neutral-600" : ""}`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          
          {user?.role === "admin" && (
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2 rounded-lg border border-neutral-800 bg-[#121216]/50 text-neutral-400 hover:text-white transition-colors active:scale-95"
            >
              <Bell className="h-3.5 w-3.5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-white shadow-lg" />
              )}
            </button>
          )}
        </div>
      </header>

      {/* ─── Scrollable Viewport ────────────────────────────────── */}
      <main className="flex-1 p-5 overflow-y-auto max-w-md mx-auto w-full">
        
        {/* ─── HOME TAB (Synced with desktop index.tsx dashboard) ──── */}
        {activeTab === "home" && (
          <div className="space-y-6">
            
            {/* Hero Card Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-gradient-to-br from-[#121216] to-[#0A0A0C] p-6 shadow-xl">
              <div className="absolute top-0 right-0 h-32 w-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              <div className="space-y-3 relative">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-black/40 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-300">
                  <Hexagon className="h-2.5 w-2.5" /> EDITH MOBILE COMMAND · v2.4
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Welcome back, <span className="text-neutral-300">{user?.name || "NSB"}</span>
                </h1>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  Your AI swarm executed <span className="font-semibold text-white">{summary.agents.totalRuns} tasks</span> overnight and generated <span className="font-semibold text-white">${summary.earnings.thisMonth.toLocaleString()}</span> in monthly revenue.
                </p>
                
                <div className="flex items-center gap-2 pt-1">
                  <button 
                    onClick={() => toast.success("Morning brief generated", { description: "Brief records matching feed metrics." })}
                    className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-black active:scale-[0.98]"
                  >
                    <Zap className="h-3 w-3 fill-current" /> Morning Brief
                  </button>
                  <button 
                    onClick={() => setActiveTab("more")}
                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-850 bg-black/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-300"
                  >
                    <Activity className="h-3 w-3" /> Swarm Chat
                  </button>
                </div>
              </div>

              {/* Dynamic Live Clock */}
              <div className="mt-4 pt-3 border-t border-neutral-900 flex justify-between items-end">
                <span className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-neutral-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Local Synchronization
                </span>
                <div className="text-right">
                  <span className="text-xs font-bold text-white font-mono">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-[9px] text-neutral-500 uppercase tracking-widest block font-mono mt-0.5">{new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Needs Your Attention (Alerts list from store) */}
            {alerts.length > 0 && (
              <div className="rounded-2xl border border-neutral-850 bg-[#111115]/80 p-5 space-y-3">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-300">
                  <AlertTriangle className="h-4 w-4 text-white" /> Needs Your Attention
                  <span className="ml-1 rounded-full bg-white text-black text-[9px] px-1.5 py-0.2 font-extrabold">{alerts.length}</span>
                </h2>
                <div className="space-y-2">
                  {alerts.map((a: any) => {
                    const Icon = a.level === "urgent" ? AlertCircle : a.level === "warning" ? AlertTriangle : Info;
                    return (
                      <div key={a.id} className="p-3 rounded-lg border border-neutral-850 bg-black/40 flex items-center justify-between gap-3 text-xs">
                        <Icon className="h-4 w-4 text-white shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{a.title}</p>
                          <p className="text-[10px] text-neutral-400 truncate mt-0.5 font-sans">{a.desc}</p>
                        </div>
                        <button 
                          onClick={() => {
                            if (a.category === "Freelance") {
                              setActiveTab("tasks");
                            } else {
                              setActiveTab("more");
                            }
                          }}
                          className="px-2.5 py-1 rounded border border-neutral-800 bg-[#121216]/50 text-[10px] font-bold text-white uppercase shrink-0"
                        >
                          {a.action || "Fix"}
                        </button>
                        <button onClick={() => dismissAlert(a.id)} className="text-neutral-500 hover:text-white px-1">×</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Replicated Stat Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Card 1: Revenue */}
              <div 
                onClick={() => { setActiveTab("payments"); }}
                className="rounded-xl border border-neutral-850 bg-[#111115]/80 p-4.5 flex flex-col justify-between h-28 cursor-pointer hover:border-neutral-700 transition-all shadow-md relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold">Revenue</p>
                  <DollarSign className="h-4.5 w-4.5 text-neutral-500" />
                </div>
                <div>
                  <p className="text-2xl font-black leading-none text-white">${summary.earnings.total.toLocaleString()}</p>
                  <p className="text-[9px] text-neutral-400 mt-1 flex items-center gap-0.5 leading-none">
                    <ArrowUpRight className="h-2.5 w-2.5" /> 0% vs last month
                  </p>
                </div>
                {/* Mini area chart trend representation */}
                <div className="absolute bottom-0 inset-x-0 h-6 opacity-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData}>
                      <Area dataKey="v" stroke="#ECECED" strokeWidth={1} fill="none" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card 2: Active Jobs */}
              <div 
                onClick={() => { setActiveTab("tasks"); }}
                className="rounded-xl border border-neutral-850 bg-[#111115]/80 p-4.5 flex flex-col justify-between h-28 cursor-pointer hover:border-neutral-700 transition-all shadow-md"
              >
                <div className="flex items-start justify-between">
                  <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold">Active Jobs</p>
                  <Briefcase className="h-4.5 w-4.5 text-neutral-500" />
                </div>
                <div>
                  <p className="text-2xl font-black leading-none text-white">{summary.freelance.activeJobs}</p>
                  <p className="text-[9px] text-neutral-400 mt-1 truncate leading-none">
                    {summary.freelance.activeJobs} in prog · {summary.freelance.newJobs} new
                  </p>
                </div>
              </div>

              {/* Card 3: Stores */}
              <div 
                onClick={() => { setActiveTab("more"); }}
                className="rounded-xl border border-neutral-850 bg-[#111115]/80 p-4.5 flex flex-col justify-between h-28 cursor-pointer hover:border-neutral-700 transition-all shadow-md"
              >
                <div className="flex items-start justify-between">
                  <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold">Stores</p>
                  <Store className="h-4.5 w-4.5 text-neutral-500" />
                </div>
                <div>
                  <p className="text-2xl font-black leading-none text-white">{summary.dropshipping.totalStores}</p>
                  <p className="text-[9px] text-neutral-400 mt-1 flex items-center gap-1.5 leading-none">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> {summary.dropshipping.activeStores} active nodes
                  </p>
                </div>
              </div>

              {/* Card 4: Automation Rate */}
              <div 
                onClick={() => { setActiveTab("more"); }}
                className="rounded-xl border border-neutral-850 bg-[#111115]/80 p-4.5 flex flex-col justify-between h-28 cursor-pointer hover:border-neutral-700 transition-all shadow-md relative"
              >
                <div className="flex items-start justify-between">
                  <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold">Auto-Rate</p>
                  <Cpu className="h-4.5 w-4.5 text-neutral-500" />
                </div>
                <div>
                  <p className="text-2xl font-black leading-none text-white">{autoRate}%</p>
                  <p className="text-[9px] text-neutral-400 mt-1 leading-none">{summary.agents.totalRuns} auto runs</p>
                </div>
                {/* SVG circular indicator progress */}
                <div className="absolute right-4.5 bottom-4 h-10 w-10">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#222" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#ECECED" strokeWidth="2.5"
                      strokeDasharray={`${(autoRate / 100) * 97.4} 97.4`} strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Recharts Area Chart: Revenue Overview */}
            <div className="rounded-xl border border-neutral-850 bg-[#111115]/80 p-5 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Revenue Overview</h3>
                  <p className="text-[9px] text-neutral-500 uppercase tracking-widest mt-0.5">Freelance vs Dropshipping</p>
                </div>
                <div className="flex rounded-md border border-neutral-800 bg-[#0F0F12] p-0.5 text-[9px] font-bold">
                  {["7D", "30D", "90D", "1Y"].map((t) => (
                    <button key={t} onClick={() => setPeriod(t)}
                      className={`px-2 py-0.5 rounded ${period === t ? "bg-white text-black" : "text-neutral-400"}`}>{t}</button>
                  ))}
                </div>
              </div>
              
              <div className="h-44 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartsData}>
                    <defs>
                      <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#888888" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#888888" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="date" stroke="#555" fontSize={9} />
                    <YAxis stroke="#555" fontSize={9} />
                    <Tooltip contentStyle={{ background: "#0F0F12", border: "1px solid #333", borderRadius: 8, fontSize: 10, color: "#FFF" }} />
                    <Area dataKey="freelance" stroke="#FFFFFF" strokeWidth={1.5} fill="url(#gp)" />
                    <Area dataKey="drop" stroke="#888888" strokeWidth={1.5} fill="url(#ga)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recharts Pie Chart: Revenue Breakdown */}
            <div className="rounded-xl border border-neutral-850 bg-[#111115]/80 p-5 shadow-md flex items-center gap-4">
              <div className="flex-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">Breakdown</h3>
                <p className="text-[9px] text-neutral-500 uppercase tracking-widest mt-0.5">Share breakdown</p>
                <div className="mt-4 space-y-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-[10px] font-medium">
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded" style={{ background: d.color }} />{d.name}</span>
                      <span className="font-mono text-neutral-300 font-semibold">${d.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-28 w-28 shrink-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius={22} outerRadius={42} paddingAngle={4} stroke="none">
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Double Engine Status Overview */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 px-1">Engine Controls</h3>
              
              <div className="space-y-3">
                {/* Freelance Engine */}
                <div className="p-4 rounded-xl border border-neutral-850 bg-[#111115]/80 relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-1 bg-white" />
                  <div className="mb-3.5 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase text-white">Freelance Engine</h3>
                    <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
                      <span className="h-1 w-1 rounded-full bg-white animate-pulse" /> Operating
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border border-neutral-900 bg-black/40 p-2.5">
                      <p className="text-[8px] uppercase tracking-wider text-neutral-500 font-bold">Scanned Today</p>
                      <p className="mt-0.5 font-bold text-white font-mono text-[11px]">{summary.freelance.totalJobs}</p>
                    </div>
                    <div className="rounded border border-neutral-900 bg-black/40 p-2.5">
                      <p className="text-[8px] uppercase tracking-wider text-neutral-500 font-bold">Proposals Sent</p>
                      <p className="mt-0.5 font-bold text-white font-mono text-[11px]">{proposalsStore.length}</p>
                    </div>
                    <div className="rounded border border-neutral-900 bg-black/40 p-2.5">
                      <p className="text-[8px] uppercase tracking-wider text-neutral-500 font-bold">Win Rate</p>
                      <p className="mt-0.5 font-bold text-white font-mono text-[11px]">0%</p>
                    </div>
                    <div className="rounded border border-neutral-900 bg-black/40 p-2.5">
                      <p className="text-[8px] uppercase tracking-wider text-neutral-500 font-bold">Active Projects</p>
                      <p className="mt-0.5 font-bold text-white font-mono text-[11px]">{summary.freelance.activeJobs}</p>
                    </div>
                    <div className="rounded border border-neutral-900 bg-black/40 p-2.5 col-span-2">
                      <p className="text-[8px] uppercase tracking-wider text-neutral-500 font-bold">Top Domain</p>
                      <p className="mt-0.5 font-bold text-white font-mono text-[11px]">None</p>
                    </div>
                  </div>
                </div>

                {/* Dropshipping Engine */}
                <div className="p-4 rounded-xl border border-neutral-850 bg-[#111115]/80 relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-1 bg-neutral-600" />
                  <div className="mb-3.5 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase text-white">Dropshipping Engine</h3>
                    <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
                      <span className="h-1 w-1 rounded-full bg-white animate-pulse" /> Operating
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border border-neutral-900 bg-black/40 p-2.5">
                      <p className="text-[8px] uppercase tracking-wider text-neutral-500 font-bold">Products Discovered</p>
                      <p className="mt-0.5 font-bold text-white font-mono text-[11px]">{productsList.length}</p>
                    </div>
                    <div className="rounded border border-neutral-900 bg-black/40 p-2.5">
                      <p className="text-[8px] uppercase tracking-wider text-neutral-500 font-bold">In Validation</p>
                      <p className="mt-0.5 font-bold text-white font-mono text-[11px]">0</p>
                    </div>
                    <div className="rounded border border-neutral-900 bg-black/40 p-2.5">
                      <p className="text-[8px] uppercase tracking-wider text-neutral-500 font-bold">Live Stores</p>
                      <p className="mt-0.5 font-bold text-white font-mono text-[11px]">{summary.dropshipping.totalStores}</p>
                    </div>
                    <div className="rounded border border-neutral-900 bg-black/40 p-2.5">
                      <p className="text-[8px] uppercase tracking-wider text-neutral-500 font-bold">Orders Today</p>
                      <p className="mt-0.5 font-bold text-white font-mono text-[11px]">0</p>
                    </div>
                    <div className="rounded border border-neutral-900 bg-black/40 p-2.5 col-span-2">
                      <p className="text-[8px] uppercase tracking-wider text-neutral-500 font-bold">ROAS Average</p>
                      <p className="mt-0.5 font-bold text-white font-mono text-[11px]">0.0x</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recharts / Activity Log */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2 px-1">
                <Activity className="h-4 w-4 text-white" /> Live Swarm Feed
              </h3>
              
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {activityList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-800 p-6 text-center text-xs text-neutral-500">
                    No activity entries matching logs
                  </div>
                ) : (
                  activityList.map((e: any, i: number) => (
                    <div key={e.id || i} className={`p-3 rounded-xl border border-neutral-850 bg-[#111115]/50 flex gap-3 text-xs border-l-2 ${e.cat === "freelance" ? "border-l-white" : "border-l-neutral-600"}`}>
                      <div className="flex-1">
                        <div className="flex justify-between items-center text-neutral-500 text-[9px] font-mono mb-1">
                          <span>{e.time}</span>
                          <span className="uppercase">{e.cat}</span>
                        </div>
                        <p className="text-neutral-300 font-normal leading-relaxed">{e.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* ─── TASKS TAB ────────────────────────────────────────── */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            {/* Category tabs */}
            <div className="flex rounded-xl border border-neutral-800 bg-[#0F0F12] p-1 shadow-inner">
              {(["active", "completed", "proposals"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setTaskCategory(cat)}
                  className={`flex-1 rounded-lg py-2 text-[10px] uppercase font-bold tracking-widest transition-all ${taskCategory === cat ? "bg-[#1C1C22] text-white border border-neutral-700/80 shadow-md" : "text-neutral-400 hover:text-neutral-200"}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* ACTIVE JOBS */}
            {taskCategory === "active" && (
              <div className="space-y-4">
                {/* Horizontal Kanban Filter */}
                <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                  {KANBAN_STAGES.map((col) => {
                    const count = activeJobs.filter(j => j.column?.toLowerCase() === col.key || (col.key === "planning" && !j.column)).length;
                    return (
                      <button
                        key={col.key}
                        onClick={() => setActiveStageFilter(col.key as any)}
                        className={`px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase whitespace-nowrap transition-all ${activeStageFilter === col.key ? "bg-neutral-100 border-neutral-200 text-neutral-900" : "border-neutral-850 bg-[#111115]/50 text-neutral-400 hover:text-white"}`}
                      >
                        {col.label} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Jobs list */}
                <div className="space-y-3">
                  {activeJobs.filter(j => {
                    const colKey = j.column?.toLowerCase();
                    if (activeStageFilter === "planning") return !colKey || colKey === "planning";
                    if (activeStageFilter === "execution") return colKey === "execution" || colKey === "in execution";
                    if (activeStageFilter === "qc") return colKey === "qc" || colKey === "qc review";
                    if (activeStageFilter === "delivery") return colKey === "delivery" || colKey === "ready to deliver";
                    return false;
                  }).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-800 py-12 text-center text-xs text-neutral-500">
                      No jobs recorded in this stage.
                    </div>
                  ) : (
                    activeJobs
                      .filter(j => {
                        const colKey = j.column?.toLowerCase();
                        if (activeStageFilter === "planning") return !colKey || colKey === "planning";
                        if (activeStageFilter === "execution") return colKey === "execution" || colKey === "in execution";
                        if (activeStageFilter === "qc") return colKey === "qc" || colKey === "qc review";
                        if (activeStageFilter === "delivery") return colKey === "delivery" || colKey === "ready to deliver";
                        return false;
                      })
                      .map((job) => (
                        <div
                          key={job.id}
                          onClick={() => setSelectedJob(job)}
                          className="p-4 rounded-xl border border-neutral-850 bg-[#111115]/80 hover:bg-[#15151A]/90 hover:border-neutral-700 cursor-pointer transition-all active:scale-[0.98] flex justify-between items-center gap-3 shadow-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white text-xs tracking-wider uppercase truncate">{job.title}</h4>
                            <p className="text-[10px] text-neutral-400 mt-1">Client: {job.clientName || "NSB Hub"}</p>
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-[9px] font-bold text-white bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-md">
                                ${job.budget || 250}
                              </span>
                              <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">Due: {job.deadline ? new Date(job.deadline).toLocaleDateString() : "Immediate"}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4.5 w-4.5 text-neutral-600 shrink-0" />
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* COMPLETED JOBS */}
            {taskCategory === "completed" && (
              <div className="space-y-2.5">
                {completedJobs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-800 py-12 text-center text-xs text-slate-500">
                    No completed contracts recorded.
                  </div>
                ) : (
                  completedJobs.map((job) => (
                    <div key={job.id} className="p-3.5 rounded-xl border border-neutral-850 bg-[#111115]/50 flex justify-between items-center text-xs">
                      <div>
                        <h4 className="font-bold text-white tracking-wider uppercase">{job.title}</h4>
                        <p className="text-[9px] text-neutral-500 mt-0.5 uppercase tracking-widest font-mono">Completed: {new Date(job.updatedAt || job.completedAt || Date.now()).toLocaleDateString()}</p>
                      </div>
                      <span className="bg-neutral-800 text-white border border-neutral-750 px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-md">
                        Done
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* PROPOSALS */}
            {taskCategory === "proposals" && (
              <div className="space-y-3.5">
                {proposals.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-800 py-12 text-center text-xs text-slate-500">
                    No active proposals logged.
                  </div>
                ) : (
                  proposals.map((prop) => (
                    <div key={prop.id} className="p-4 rounded-xl border border-neutral-850 bg-[#111115]/80 space-y-3.5 text-xs shadow-sm">
                      <div>
                        <span className="text-[8px] uppercase font-bold text-white bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-md tracking-widest">
                          {prop.status}
                        </span>
                        <h4 className="font-bold text-white text-xs mt-3 uppercase tracking-wider">{prop.jobTitle || "Match Proposal"}</h4>
                        <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed line-clamp-3 italic">"{prop.coverLetter || "Analyzing specifications..."}"</p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await api.freelance.sendProposal(prop.id, {});
                            toast.success("Proposal transmitted");
                            refreshAllData(true);
                          } catch (e: any) {
                            toast.error(e.message);
                          }
                        }}
                        className="w-full py-2 bg-neutral-100 text-[10px] font-bold uppercase tracking-widest text-black hover:bg-neutral-200 rounded-lg shadow transition-all active:scale-[0.98]"
                      >
                        Transmit Proposal
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── PAYMENTS TAB ─────────────────────────────────────── */}
        {activeTab === "payments" && (
          <div className="space-y-4">
            {/* Filter Toggle */}
            <div className="flex rounded-xl border border-neutral-800 bg-[#0F0F12] p-1 shadow-inner">
              <button
                onClick={() => setInvoiceFilter("unpaid")}
                className={`flex-1 rounded-lg py-2 text-[10px] uppercase font-bold tracking-widest transition-all ${invoiceFilter === "unpaid" ? "bg-[#1C1C22] text-white border border-neutral-700/80 shadow-md" : "text-neutral-400 hover:text-white"}`}
              >
                Unpaid ({unpaidInvoices.length})
              </button>
              <button
                onClick={() => setInvoiceFilter("paid")}
                className={`flex-1 rounded-lg py-2 text-[10px] uppercase font-bold tracking-widest transition-all ${invoiceFilter === "paid" ? "bg-[#1C1C22] text-white border border-neutral-700/80 shadow-md" : "text-neutral-400 hover:text-white"}`}
              >
                Paid ({paidInvoices.length})
              </button>
            </div>

            {/* Invoices List */}
            <div className="space-y-3.5">
              {(invoiceFilter === "unpaid" ? unpaidInvoices : paidInvoices).length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-800 py-12 text-center text-xs text-slate-500">
                  No matching invoice records.
                </div>
              ) : (
                (invoiceFilter === "unpaid" ? unpaidInvoices : paidInvoices).map((inv) => (
                  <div key={inv.id} className="p-4 rounded-xl border border-neutral-850 bg-[#111115]/80 space-y-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider font-mono">#{inv.invoiceNumber || inv.id.slice(0,8)}</p>
                        <h4 className="font-bold text-white mt-1 uppercase tracking-wider">{inv.clientName}</h4>
                        <p className="text-[10px] text-neutral-400 mt-0.5">{inv.clientEmail}</p>
                      </div>
                      <span className="text-lg font-extrabold text-white">
                        ${inv.amount}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-neutral-500 font-medium">
                      <span>Issued: {new Date(inv.createdAt).toLocaleDateString()}</span>
                      <span className={`px-2.5 py-0.5 border border-neutral-800 rounded-full capitalize font-bold ${inv.status === "paid" ? "bg-neutral-900 text-neutral-200" : "bg-black text-neutral-400"}`}>
                        {inv.status}
                      </span>
                    </div>

                    {inv.status !== "paid" && (
                      <button
                        onClick={() => handleMarkPaid(inv.id)}
                        className="w-full py-2 bg-neutral-100 text-black text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 rounded-lg shadow-md transition-all active:scale-[0.98]"
                      >
                        Confirm Payment Received
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── USERS TAB (ADMIN ONLY) ───────────────────────────── */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {user?.role !== "admin" ? (
              <div className="rounded-xl border border-dashed border-neutral-800 p-6 text-center text-xs text-neutral-400 uppercase tracking-widest font-bold">
                Access Restriction Enforced.
              </div>
            ) : (
              <>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 px-1">
                  OAuth Accounts Whitelist ({systemUsers.length})
                </h3>

                <div className="space-y-3">
                  {systemUsers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-800 py-12 text-center text-xs text-slate-500">
                      No Google accounts whitelisted.
                    </div>
                  ) : (
                    systemUsers.map((u) => (
                      <div key={u.id} className="p-4 rounded-xl border border-neutral-850 bg-[#111115]/80 space-y-3.5 shadow-sm">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h4 className="font-bold text-white truncate uppercase tracking-wider">{u.name || "OAuth Account"}</h4>
                            <p className="text-[10px] text-neutral-400 truncate mt-0.5">{u.email}</p>
                            <p className="text-[9px] text-neutral-500 mt-1 uppercase tracking-widest font-mono">Role: {u.role}</p>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-wider shrink-0 ${
                            u.status === "active" ? "bg-neutral-900 border-neutral-750 text-white" : "border-neutral-900 text-neutral-500 bg-neutral-950"
                          }`}>
                            {u.status}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-neutral-900">
                          {u.status !== "active" && (
                            <button
                              onClick={() => handleUserStatusUpdate(u.id, "active")}
                              className="flex-1 py-1 bg-neutral-100 hover:bg-neutral-200 text-black text-[9px] font-bold uppercase tracking-widest rounded-md shadow transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {u.status === "active" && (
                            <button
                              onClick={() => handleUserStatusUpdate(u.id, "blocked")}
                              className="flex-1 py-1 border border-neutral-800 text-neutral-400 hover:text-white text-[9px] font-bold uppercase tracking-widest rounded-md hover:bg-[#1C1C22] transition-colors"
                            >
                              Block
                            </button>
                          )}
                          {u.status === "blocked" && (
                            <button
                              onClick={() => handleUserStatusUpdate(u.id, "active")}
                              className="flex-1 py-1 border border-neutral-800 text-neutral-400 hover:text-white text-[9px] font-bold uppercase tracking-widest rounded-md hover:bg-[#1C1C22] transition-colors"
                            >
                              Unblock
                            </button>
                          )}
                          <button
                            onClick={() => handleUserDelete(u.id)}
                            className="px-3 py-1 border border-neutral-800 text-neutral-500 hover:text-white text-[9px] font-bold uppercase tracking-widest rounded-md hover:bg-[#1C1C22] transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── MORE TAB ─────────────────────────────────────────── */}
        {activeTab === "more" && (
          <div className="space-y-6">
            
            {/* Minimal Profile info */}
            <div className="p-4 rounded-xl border border-neutral-850 bg-[#111115]/80 flex items-center justify-between text-xs shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg border border-neutral-800 bg-[#121216] flex items-center justify-center text-white font-bold uppercase text-xs">
                  {user?.name?.slice(0,2) || user?.email?.slice(0,2) || "NS"}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-white uppercase tracking-wider">{user?.name || "NSB Operator"}</h4>
                  <p className="text-[10px] text-neutral-400 truncate max-w-[170px] font-medium">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2 border border-neutral-800 rounded-lg hover:border-neutral-500 hover:text-white text-neutral-400 transition-all active:scale-95"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Actions grid */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 px-1">
                Quick Actions
              </h3>
              
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  onClick={handleScanJobs}
                  className="p-3.5 rounded-xl border border-neutral-850 bg-[#111115]/80 hover:border-neutral-700 flex items-center gap-3 active:scale-95 transition-all text-left shadow-sm"
                >
                  <div className="h-7 w-7 rounded-lg border border-neutral-850 bg-[#1C1C22] text-neutral-300 flex items-center justify-center shrink-0">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white uppercase tracking-wider leading-none">Scan Jobs</p>
                    <p className="text-[8px] text-neutral-500 mt-1 leading-none">Poll platforms</p>
                  </div>
                </button>

                <button
                  onClick={handleExportSummary}
                  className="p-3.5 rounded-xl border border-neutral-850 bg-[#111115]/80 hover:border-neutral-700 flex items-center gap-3 active:scale-95 transition-all text-left shadow-sm"
                >
                  <div className="h-7 w-7 rounded-lg border border-neutral-850 bg-[#1C1C22] text-neutral-300 flex items-center justify-center shrink-0">
                    <FileDown className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white uppercase tracking-wider leading-none">Summary</p>
                    <p className="text-[8px] text-neutral-500 mt-1 leading-none">Export reports</p>
                  </div>
                </button>
              </div>
            </div>

            {/* AI Assistant Chatbox */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2 px-1">
                <MessageSquare className="h-3.5 w-3.5 text-white" /> Query Swarm
              </h3>

              <div className="rounded-xl border border-neutral-855 bg-[#111115]/80 overflow-hidden flex flex-col h-76 shadow-md">
                <div className="flex-1 p-3 overflow-y-auto space-y-4 max-h-56">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        msg.sender === "user" ? "bg-neutral-200 text-black font-semibold rounded-tr-none" : "bg-[#09090C] text-neutral-300 border border-neutral-850 rounded-tl-none"
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[8px] text-neutral-500 mt-1 px-1 font-mono">{msg.time}</span>
                    </div>
                  ))}
                  {chatBusy && (
                    <div className="flex items-center gap-2 text-[10px] text-neutral-500 italic pl-1 font-mono">
                      <Loader2 className="h-3 w-3 animate-spin text-white" />
                      EDITH processing command...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleChatSubmit} className="p-2.5 border-t border-neutral-900 bg-black/40 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Enter command instruction..."
                    className="flex-1 bg-black/60 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-500"
                  />
                  <button
                    type="button"
                    onClick={startListening}
                    className={`p-1.5 rounded-lg border flex items-center justify-center transition-all ${
                      isListening ? 'border-rose-500 text-rose-500 bg-rose-500/10 animate-pulse' : 'border-neutral-700 text-neutral-300 hover:border-white hover:text-white'
                    }`}
                    title="Voice command mic"
                  >
                    🎙️
                  </button>
                  <button
                    type="submit"
                    disabled={chatBusy || !chatInput.trim()}
                    className="p-1.5 rounded-lg border border-neutral-700 text-neutral-300 hover:border-white hover:text-white disabled:opacity-30 active:scale-90 transition-all"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {/* Desktop link */}
            <div className="text-center pt-1">
              <button 
                onClick={() => {
                  localStorage.setItem("prefer_desktop", "true");
                  navigate({ to: "/" });
                }}
                className="text-[10px] text-neutral-500 hover:text-white uppercase tracking-wider font-bold"
              >
                Go to Full Desktop View
              </button>
            </div>
          </div>
        )}

      </main>

      {/* ─── JOB DETAILS MODAL ──────────────────────────────────── */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0F0F12] rounded-t-2xl border-t border-neutral-855 p-6 space-y-4.5 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] animate-slide-up">
            <div className="flex justify-between items-start">
              <div>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${getStageDisplay(selectedJob.column).style}`}>
                  {getStageDisplay(selectedJob.column).label}
                </span>
                <h3 className="text-sm font-bold text-white mt-3 uppercase tracking-wider leading-snug">{selectedJob.title}</h3>
                <p className="text-[10px] text-neutral-400 mt-1">Client: {selectedJob.clientName || "NSB Hub"}</p>
              </div>
              <button 
                onClick={() => setSelectedJob(null)}
                className="p-1.5 rounded-full bg-[#1C1C22]/50 text-neutral-400 hover:text-white"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Project Description</p>
              <p className="text-xs text-neutral-300 leading-relaxed max-h-36 overflow-y-auto pr-1">
                {selectedJob.description || "No manual description logged. AI node instructions are operating matches automatically."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-[#08080A] p-3 rounded-xl border border-neutral-850">
              <div>
                <p className="text-[8px] uppercase font-bold text-neutral-500">Budget</p>
                <p className="text-xs font-bold text-white mt-0.5">${selectedJob.budget || 250}</p>
              </div>
              <div>
                <p className="text-[8px] uppercase font-bold text-neutral-500">Deadline</p>
                <p className="text-[10px] text-neutral-300 mt-0.5 font-mono">{selectedJob.deadline ? new Date(selectedJob.deadline).toLocaleDateString() : "Immediate"}</p>
              </div>
            </div>

            {/* Stage Actions */}
            <div className="space-y-2 pt-2 border-t border-neutral-850">
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Actions</p>
              <div className="flex gap-2">
                {(!selectedJob.column || selectedJob.column.toLowerCase() === "planning") && (
                  <>
                    <button
                      onClick={() => handleExecuteJob(selectedJob.id)}
                      className="flex-1 py-2.5 bg-neutral-100 text-black text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-all hover:bg-neutral-200 active:scale-95"
                    >
                      Execute (AI Run)
                    </button>
                    <button
                      onClick={() => handleMoveJob(selectedJob.id, "execution")}
                      className="px-3.5 py-2.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white text-xs font-bold uppercase"
                    >
                      Skip
                    </button>
                  </>
                )}

                {(selectedJob.column?.toLowerCase() === "execution" || selectedJob.column?.toLowerCase() === "in execution") && (
                  <>
                    <button
                      onClick={() => handleQCJob(selectedJob.id)}
                      className="flex-1 py-2.5 bg-neutral-100 text-black text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-all hover:bg-neutral-200 active:scale-95"
                    >
                      Run AI QC Check
                    </button>
                    <button
                      onClick={() => handleMoveJob(selectedJob.id, "qc")}
                      className="px-3.5 py-2.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white text-xs font-bold uppercase"
                    >
                      Skip
                    </button>
                  </>
                )}

                {(selectedJob.column?.toLowerCase() === "qc" || selectedJob.column?.toLowerCase() === "qc review") && (
                  <>
                    <button
                      onClick={() => handleDeliverJob(selectedJob.id)}
                      className="flex-1 py-2.5 bg-neutral-100 text-black text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-all hover:bg-neutral-200 active:scale-95"
                    >
                      Deliver Output
                    </button>
                    <button
                      onClick={() => handleMoveJob(selectedJob.id, "delivery")}
                      className="px-3.5 py-2.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white text-xs font-bold uppercase"
                    >
                      Skip
                    </button>
                  </>
                )}

                {(selectedJob.column?.toLowerCase() === "delivery" || selectedJob.column?.toLowerCase() === "ready to deliver") && (
                  <button
                    onClick={() => handleMoveJob(selectedJob.id, "completed")}
                    className="w-full py-2.5 bg-neutral-100 text-black text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-neutral-200 transition-all active:scale-95 shadow-md"
                  >
                    Finish Contract
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SYSTEM ALERTS SHEET ────────────────────────────────── */}
      {notificationsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0F0F12] border-t border-neutral-850 p-6 space-y-4.5 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] max-h-[75vh] flex flex-col rounded-t-2xl animate-slide-up">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-850">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Bell className="h-4.5 w-4.5" /> System Alerts
              </h3>
              <button 
                onClick={() => setNotificationsOpen(false)}
                className="p-1 rounded-full bg-[#1C1C22]/50 text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 py-1 pr-1 font-sans">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-500 uppercase tracking-widest font-mono">
                  Alert logs empty.
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={`p-4 border rounded-xl text-xs space-y-2 transition-colors ${n.read ? "border-neutral-900 bg-neutral-950/20 opacity-55" : "border-neutral-800 bg-[#111115]/50"}`}>
                    <div className="flex justify-between items-start gap-2 font-mono">
                      <span className="font-bold text-white uppercase tracking-wider text-[11px]">{n.title}</span>
                      <span className="text-[9px] text-neutral-500">{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-neutral-300 leading-relaxed text-[11px]">{n.message}</p>
                    
                    {!n.read && (
                      <button
                        onClick={() => handleMarkNotificationRead(n.id)}
                        className="text-[9px] text-white hover:text-neutral-300 font-bold uppercase tracking-widest font-mono"
                      >
                        Dismiss Alert
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── BOTTOM NAVIGATION TAB BAR ─────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0B0B0E]/95 border-t border-neutral-850 flex items-center justify-around z-40 max-w-md mx-auto shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded transition-all active:scale-90 ${activeTab === "home" ? "text-white scale-105 font-bold" : "text-neutral-500 hover:text-neutral-300"}`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[8px] tracking-wider uppercase mt-1.5 font-bold">Home</span>
        </button>

        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded transition-all active:scale-90 ${activeTab === "tasks" ? "text-white scale-105 font-bold" : "text-neutral-500 hover:text-neutral-300"}`}
        >
          <Briefcase className="h-5 w-5" />
          <span className="text-[8px] tracking-wider uppercase mt-1.5 font-bold">Tasks</span>
        </button>

        <button
          onClick={() => setActiveTab("payments")}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded transition-all active:scale-90 ${activeTab === "payments" ? "text-white scale-105 font-bold" : "text-neutral-500 hover:text-neutral-300"}`}
        >
          <CreditCard className="h-5 w-5" />
          <span className="text-[8px] tracking-wider uppercase mt-1.5 font-bold">Pay</span>
        </button>

        {user?.role === "admin" && (
          <button
            onClick={() => setActiveTab("users")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded transition-all active:scale-90 ${activeTab === "users" ? "text-white scale-105 font-bold" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            <Users className="h-5 w-5" />
            <span className="text-[8px] tracking-wider uppercase mt-1.5 font-bold">Users</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("more")}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded transition-all active:scale-90 ${activeTab === "more" ? "text-white scale-105 font-bold" : "text-neutral-500 hover:text-neutral-300"}`}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[8px] tracking-wider uppercase mt-1.5 font-bold">More</span>
        </button>

      </nav>

    </div>
  );
}
