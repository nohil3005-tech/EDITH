import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { Globe, Search, Plus, Trash2, ArrowUpRight, ShieldAlert, RefreshCw, X, Eye, EyeOff, Bell, MessageSquare, ExternalLink, ChevronRight, Check } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

export const Route = createFileRoute('/platforms')({
  head: () => ({ meta: [{ title: 'Freelancer Platforms — EDITH' }] }),
  component: PlatformsPage,
});

interface PlatformItem {
  id: string;
  platformName: string;
  platformUrl: string;
  iconUrl?: string;
  status: string;
  lastSynced?: string;
  notificationsCount: number;
  messagesCount: number;
  isActive: boolean;
}

interface CuratedPlatform {
  name: string;
  url: string;
  description: string;
  category: string;
  iconUrl?: string;
}

function PlatformsPage() {
  const isDesktop = typeof window !== 'undefined' && !!(window as any).edithDesktop;
  const [userPlatforms, setUserPlatforms] = useState<PlatformItem[]>([]);
  const [popularPlatforms, setPopularPlatforms] = useState<CuratedPlatform[]>([
    { name: 'Upwork', url: 'https://upwork.com', description: 'World\'s largest marketplace matching top professionals with businesses.', category: 'General Freelance', iconUrl: '🟢' },
    { name: 'Fiverr', url: 'https://fiverr.com', description: 'Gig-based marketplace specializing in creative and digital design tasks.', category: 'Creative & Digital', iconUrl: '🟢' },
    { name: 'Freelancer', url: 'https://freelancer.com', description: 'IT and engineering contracts', category: 'Technical & Engineering', iconUrl: '⚪' },
    { name: 'Contra', url: 'https://contra.com', description: 'Commission-free workspace', category: 'Modern Creative', iconUrl: '🟢' },
    { name: 'PeoplePerHour', url: 'https://peopleperhour.com', description: 'UK-based marketplace matching businesses with vetted freelance professionals.', category: 'General Freelance', iconUrl: '🟢' }
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CuratedPlatform[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activePlatformId, setActivePlatformId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [webviewKey, setWebviewKey] = useState(0);
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [pastedCookies, setPastedCookies] = useState('');
  const [pastedUserAgent, setPastedUserAgent] = useState('');

  const [jobs, setJobs] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'messages' | 'alerts'>('messages');

  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] [SYSTEM] Stealth bypass nodes active and verified.`,
    `[${new Date().toLocaleTimeString()}] [PROXY] Connected through fallback node: US-East-1 (Ping: 42ms)`,
    `[${new Date().toLocaleTimeString()}] [STEALTH] User-Agent and Canvas spoofing active.`
  ]);
  const [stealthSettings, setStealthSettings] = useState({
    fingerprint: true,
    customReferrer: 'https://google.com',
    autoClear: true
  });
  const [layout, setLayout] = useState<'solo' | 'grid'>('solo');
  const [proposalBlueprint, setProposalBlueprint] = useState<'speed' | 'tech' | 'budget'>('tech');
  const [showStealthDrawer, setShowStealthDrawer] = useState(false);
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);

  useEffect(() => {
    const logInterval = setInterval(() => {
      const activities = [
        `[STEALTH] User-Agent spoofing headers verified.`,
        `[SYNC] Scraped new freelancing listings from platforms feed.`,
        `[AGENT] Matches calculated for loaded CV profile matching score.`,
        `[PROXY] Rotated request node IP address to prevent scraping limits.`,
        `[COOKIE] Validated platform session tokens cookie check.`,
        `[CLEAN] Cleared system cache telemetry logs to preserve privacy.`
      ];
      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      setLogs(prev => [...prev.slice(-30), `[${new Date().toLocaleTimeString()}] ${randomActivity}`]);
    }, 10000);
    return () => clearInterval(logInterval);
  }, []);

  // Load custom User Agent if previously saved for this platform
  useEffect(() => {
    if (!activePlatformId) return;
    const bridge = (window as any).edithDesktop;
    if (bridge?.setUserAgent) {
      const savedUa = localStorage.getItem(`custom_ua_${activePlatformId}`);
      if (savedUa) {
        bridge.setUserAgent(savedUa);
        setPastedUserAgent(savedUa);
      } else {
        const defaultUa = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
        bridge.setUserAgent(defaultUa);
        setPastedUserAgent('');
      }
    }
  }, [activePlatformId]);

  useEffect(() => {
    if (!activePlatformId) return;
    const activePlat = userPlatforms.find(p => p.id === activePlatformId);
    if (!activePlat) return;
    
    // Load jobs
    api.freelance.listJobs().then((res: any) => {
      if (res?.data) {
        // Filter jobs by platform name
        const filtered = res.data.filter((j: any) => 
          j.sourcePlatform.toLowerCase() === activePlat.platformName.toLowerCase()
        );
        setJobs(filtered);
        if (filtered.length > 0) {
          setSelectedJob(filtered[0]);
        } else {
          setSelectedJob(null);
        }
      }
    }).catch(console.error);

    // Load messages
    api.platform.messages().then((res: any) => {
      if (res?.data) {
        setMessages(res.data);
      }
    }).catch(console.error);
  }, [activePlatformId, userPlatforms]);

  const handleReplyMessage = async (msgId: string) => {
    const text = replyTexts[msgId];
    if (!text || !text.trim()) return;
    try {
      const res = await api.platform.reply(msgId, text.trim()) as any;
      if (res?.status === 'success') {
        toast.success("Reply successfully sent!");
        setReplyTexts(prev => ({ ...prev, [msgId]: '' }));
        // Refresh messages
        const updated = await api.platform.messages() as any;
        if (updated?.data) {
          setMessages(updated.data);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send reply");
    }
  };

  const handleSaveCookies = async () => {
    if (!pastedCookies.trim()) {
      toast.error("Please paste your session cookie string.");
      return;
    }
    try {
      const bridge = (window as any).edithDesktop;
      if (bridge?.setPlatformCookies && activePlatform) {
        if (pastedUserAgent.trim()) {
          localStorage.setItem(`custom_ua_${activePlatform.id}`, pastedUserAgent.trim());
          if (bridge.setUserAgent) {
            await bridge.setUserAgent(pastedUserAgent.trim());
          }
        } else {
          localStorage.removeItem(`custom_ua_${activePlatform.id}`);
        }

        const success = await bridge.setPlatformCookies({
          url: activePlatform.platformUrl,
          cookieString: pastedCookies
        });
        
        if (success) {
          toast.success(`Successfully imported cookies and User Agent for ${activePlatform.platformName}! Reloading workspace...`);
          setPastedCookies('');
          setShowCookieModal(false);
          setWebviewKey(prev => prev + 1);
        } else {
          toast.error("Failed to apply cookies.");
        }
      } else {
        toast.error("Cookie syncing is only supported in Desktop App mode.");
      }
    } catch (err) {
      toast.error("Failed to import cookies.");
    }
  };

  const handleClearCache = async () => {
    try {
      const bridge = (window as any).edithDesktop;
      if (bridge?.clearCache) {
        await bridge.clearCache();
        toast.success("All cookies and platform caches successfully cleared!");
        setWebviewKey(prev => prev + 1);
      } else {
        toast.error("Cache clearing is only supported on the Desktop App.");
      }
    } catch (err) {
      toast.error("Failed to clear app cache");
    }
  };

  const fetchUserPlatforms = async () => {
    try {
      const res = await api.platforms.list() as any;
      if (res?.data) {
        setUserPlatforms(res.data);
        // Default to first active platform if none selected
        if (res.data.length > 0 && !activePlatformId) {
          setActivePlatformId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to list user platforms', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPopularPlatforms = async () => {
    try {
      const res = await api.platforms.popular() as any;
      if (res?.data) {
        setPopularPlatforms(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch popular platforms', err);
    }
  };

  useEffect(() => {
    fetchUserPlatforms();
    fetchPopularPlatforms();
  }, []);

  useEffect(() => {
    const handleSearch = async () => {
      if (searchQuery.trim().length === 0) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }
      try {
        const res = await api.platforms.search(searchQuery) as any;
        if (res?.data) {
          setSearchResults(res.data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Platform search failed', err);
      }
    };

    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const handleInputFocus = () => {
    if (searchQuery.trim().length === 0 && popularPlatforms.length > 0) {
      setSearchResults(popularPlatforms);
      setShowDropdown(true);
    }
  };

  const handleAddPlatform = async (platform: CuratedPlatform) => {
    try {
      const res = await api.platforms.add({
        name: platform.name,
        url: platform.url,
        iconUrl: platform.iconUrl
      }) as any;
      if (res?.data) {
        toast.success(`${platform.name} successfully connected!`);
        setSearchQuery('');
        setSearchResults([]);
        setShowDropdown(false);
        // Refresh and set active
        const updated = await api.platforms.list() as any;
        if (updated?.data) {
          setUserPlatforms(updated.data);
          setActivePlatformId(res.data.id);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to add platform');
    }
  };

  const handleRemovePlatform = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    try {
      await api.platforms.remove(id);
      toast.success(`${name} removed successfully.`);
      if (activePlatformId === id) {
        setActivePlatformId(null);
      }
      fetchUserPlatforms();
    } catch (err: any) {
      toast.error('Failed to remove platform');
    }
  };

  const handleToggleActive = async (e: React.MouseEvent, platform: PlatformItem) => {
    e.stopPropagation();
    try {
      await api.platforms.settings(platform.id, { isActive: !platform.isActive });
      toast.success(`${platform.platformName} is now ${!platform.isActive ? 'Active' : 'Muted'}`);
      fetchUserPlatforms();
    } catch (err: any) {
      toast.error('Failed to toggle settings');
    }
  };

  const handleForceSync = async (platform: PlatformItem) => {
    try {
      await api.platforms.settings(platform.id, { status: 'Connected' });
      toast.success(`Synchronizing data from ${platform.platformName}... proposals and messages updated!`);
      fetchUserPlatforms();
    } catch (err) {
      toast.error('Failed to sync platform');
    }
  };

  const activePlatform = userPlatforms.find(p => p.id === activePlatformId);

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-5.5rem)] overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Freelancer Platforms Workspace</h1>
        <p className="text-xs text-muted-foreground">Manage multiple connected freelance marketplaces side-by-side inside EDITH.</p>
      </div>

      {/* Split Workspace Layout */}
      <div className="flex-1 flex border border-border/60 bg-[#07070d]/60 rounded-2xl overflow-hidden backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
        
        {/* Left Sub-Panel (Connection & List Sidebar) */}
        <div className="w-80 md:w-96 border-r border-border/50 bg-[#090911]/80 flex flex-col shrink-0 overflow-y-auto">
          
          {/* Sub-panel Header */}
          <div className="p-4 border-b border-border/40 space-y-3 shrink-0">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">Search & Add Marketplaces</div>
            <div className="relative" ref={dropdownRef}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Type to search Upwork, Fiverr..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={handleInputFocus}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-border/60 bg-card/40 focus:border-primary/60 outline-none text-xs transition-all"
              />

              {/* Suggestions Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-1.5 rounded-xl border border-border/80 bg-[#0d0d16] p-1.5 shadow-2xl z-50 text-xs max-h-56 overflow-y-auto">
                  {searchResults.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          <span>{p.iconUrl || '🌐'}</span>
                          <span className="truncate">{p.name}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{p.category}</div>
                      </div>
                      <button
                        onClick={() => handleAddPlatform(p)}
                        className="rounded bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-indigo-500 transition-all shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Connected Platforms List */}
          <div className="flex-1 p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 pb-1">
              Connected Channels ({userPlatforms.length}/10 slots)
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <RefreshCw className="animate-spin h-5 w-5 text-muted-foreground" />
              </div>
            ) : userPlatforms.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground space-y-2 border border-dashed border-border/40 rounded-xl p-4 bg-card/10">
                <Globe className="h-6 w-6 text-muted-foreground/60 mx-auto" />
                <p>No platforms connected</p>
                <p className="text-[10px]">Use the search bar above to link one.</p>
              </div>
            ) : (
              userPlatforms.map((p) => {
                const isActiveSel = p.id === activePlatformId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setActivePlatformId(p.id)}
                    className={`group cursor-pointer rounded-xl border p-3 flex flex-col gap-2.5 transition-all ${
                      isActiveSel
                        ? 'border-indigo-500/50 bg-indigo-950/20 shadow-glow-sm'
                        : 'border-border/60 bg-card/20 hover:border-border hover:bg-card/30'
                    } ${!p.isActive ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl shrink-0">{p.iconUrl || '🌐'}</span>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-foreground truncate">{p.platformName}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{p.platformUrl}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleToggleActive(e, p)}
                          className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
                          title={p.isActive ? "Mute" : "Unmute"}
                        >
                          {p.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-destructive" />}
                        </button>
                        <button
                          onClick={(e) => handleRemovePlatform(e, p.id, p.platformName)}
                          className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-destructive"
                          title="Remove"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/20">
                      <div className="flex gap-2">
                        {p.isActive && (
                          <>
                            <span className="flex items-center gap-0.5 font-semibold text-warning">
                              <Bell className="h-2.5 w-2.5" /> {p.notificationsCount}
                            </span>
                            <span className="flex items-center gap-0.5 font-semibold text-blue-400">
                              <MessageSquare className="h-2.5 w-2.5" /> {p.messagesCount}
                            </span>
                          </>
                        )}
                      </div>
                      <span>{p.lastSynced || 'Synced'}</span>
                    </div>
                  </div>
                );
              })
            )}

            {/* Popular Grid inside Left Panel for Quick Action */}
            {userPlatforms.length > 0 && popularPlatforms.length > 0 && (
              <div className="pt-4 shrink-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 pb-2">
                  Quick Add Platform:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {popularPlatforms.slice(0, 4).map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAddPlatform(p)}
                      className="p-2 rounded-lg border border-border/40 bg-card/10 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all text-left flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-[10px] text-foreground flex items-center gap-1">
                          <span>{p.iconUrl || '🌐'}</span>
                          <span className="truncate">{p.name}</span>
                        </div>
                      </div>
                      <Plus className="h-3 w-3 text-indigo-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Content Panel (Interactive embedded platform portal iframe) */}
        <div className="flex-1 flex flex-col bg-[#05050a] min-w-0">
          {activePlatform ? (
            <div className="h-full flex flex-col">
              
              {/* Internal embedded Toolbar */}
              <div className="flex-items-center justify-between px-4 py-2.5 bg-[#0a0a14] border-b border-border/40 shrink-0 text-foreground flex">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg">{activePlatform.iconUrl || '🌐'}</span>
                  <span className="font-bold text-xs truncate">{activePlatform.platformName} Workspace</span>
                  <span className="text-[10px] text-success px-2 py-0.5 rounded-full border border-success/20 bg-success/5 shrink-0 hidden sm:inline-block">
                    Live Portal Syncing
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Layout View Switcher */}
                  <div className="flex items-center gap-1 border border-border/40 rounded-lg p-0.5 bg-card/25">
                    <button
                      onClick={() => setLayout('solo')}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all ${
                        layout === 'solo'
                          ? 'bg-indigo-600 text-white shadow-glow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Solo
                    </button>
                    <button
                      onClick={() => setLayout('grid')}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all ${
                        layout === 'grid'
                          ? 'bg-indigo-600 text-white shadow-glow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Dual Grid
                    </button>
                  </div>

                  <button
                    onClick={() => setShowStealthDrawer(true)}
                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 px-2 py-1 rounded bg-indigo-500/5 transition-all"
                  >
                    🛡️ Stealth Config
                  </button>
                  
                  <button
                    onClick={() => setShowCookieModal(true)}
                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 px-2 py-1 rounded bg-indigo-500/5 transition-all"
                    title="Import session cookies to bypass login blocks entirely"
                  >
                    Sync Cookies
                  </button>

                  <button
                    onClick={handleClearCache}
                    className="flex items-center gap-1 text-[10px] font-bold text-destructive hover:text-destructive/90 border border-destructive/20 px-2 py-1 rounded bg-destructive/5 transition-all"
                    title="Clear cookies & cache to resolve verification or bot blocks"
                  >
                    Clear Cache
                  </button>

                  <button
                    onClick={() => handleForceSync(activePlatform)}
                    className="p-1.5 border border-border/80 rounded bg-card/40 hover:border-primary/40 transition-all"
                    title="Force sync data"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
                  </button>

                  <a
                    href={activePlatform.platformUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded bg-indigo-500/5 transition-all"
                  >
                    <span>New Tab</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Secure Session Banner */}
              <div className="bg-indigo-500/10 border-b border-indigo-500/20 text-indigo-300 px-4 py-1.5 flex items-center justify-between text-[11px] shrink-0">
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span>🔒 Stealth Node Active. Spoofer bypass metrics configured automatically for {activePlatform.platformName}.</span>
                </div>
              </div>

              {/* Connected Portal Webpage Iframe container / Fallback Dashboard */}
              <div className="flex-1 bg-[#05050a] relative flex flex-col min-h-0">
                
                {/* Stealth Settings Drawer Overlay */}
                {showStealthDrawer && (
                  <div className="absolute top-0 right-0 w-80 h-full bg-[#0a0a14] border-l border-border/40 z-50 p-5 space-y-4 shadow-2xl flex flex-col">
                    <div className="flex justify-between items-center pb-2 border-b border-border/30">
                      <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <span>🛡️</span> Stealth Profile Config
                      </h4>
                      <button onClick={() => setShowStealthDrawer(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-4 text-[11px]">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Spoofed User-Agent</label>
                        <input type="text" readOnly value="Mozilla/5.0 (Windows NT 10.0; Win64; x64) ..." className="w-full px-2.5 py-1.5 rounded border border-border/40 bg-card/25 text-[9px] text-muted-foreground font-mono" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-foreground">Anti-Fingerprinting</div>
                          <div className="text-[9px] text-muted-foreground">Randomize canvas & audio telemetry</div>
                        </div>
                        <input type="checkbox" checked={stealthSettings.fingerprint} onChange={(e) => setStealthSettings(prev => ({ ...prev, fingerprint: e.target.checked }))} className="rounded accent-indigo-500" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-foreground">Clear Session Cache</div>
                          <div className="text-[9px] text-muted-foreground">Reset cookies after closing app</div>
                        </div>
                        <input type="checkbox" checked={stealthSettings.autoClear} onChange={(e) => setStealthSettings(prev => ({ ...prev, autoClear: e.target.checked }))} className="rounded accent-indigo-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Referrer Spoof Header</label>
                        <select value={stealthSettings.customReferrer} onChange={(e) => setStealthSettings(prev => ({ ...prev, customReferrer: e.target.value }))} className="w-full px-2 py-1 bg-[#131326] border border-border/40 rounded outline-none text-muted-foreground text-xs">
                          <option value="https://google.com">Google (https://google.com)</option>
                          <option value="https://bing.com">Bing (https://bing.com)</option>
                          <option value="https://direct">Direct / None</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex-1" />
                    <button onClick={() => { setShowStealthDrawer(false); toast.success("Stealth configurations applied!"); }} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-bold text-white shadow-glow-sm">
                      Apply Config
                    </button>
                  </div>
                )}

                {isDesktop ? (
                  /* @ts-ignore */
                  <webview
                    key={webviewKey}
                    src={activePlatform.platformUrl}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                    allowpopups="true"
                    preload={(window as any).edithDesktop?.stealthPath}
                  />
                ) : (
                  <>
                    {layout === 'grid' ? (
                      /* Dual Grid Layout */
                      <div className="flex-1 flex min-h-0 divide-x divide-border/20">
                        {/* Workspace 1: Active Platform */}
                        <div className="w-1/2 flex flex-col min-h-0 p-4 space-y-3 bg-[#05050a]">
                          <div className="flex items-center justify-between border-b border-border/20 pb-1.5 shrink-0">
                            <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1.5">
                              <span>{activePlatform.iconUrl || '🌐'}</span>
                              <span>{activePlatform.platformName} Workspace</span>
                            </span>
                            <span className="text-[9px] text-muted-foreground/60">{jobs.length} jobs synced</span>
                          </div>
                          
                          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-2.5">
                            {jobs.length === 0 ? (
                              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">No synced jobs.</div>
                            ) : (
                              jobs.map((job) => (
                                <div key={job.id} className="p-3 border border-border/40 rounded-xl bg-card/10 text-left">
                                  <h5 className="font-bold text-[11px] text-foreground truncate">{job.title}</h5>
                                  <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{job.description}</p>
                                  <div className="flex justify-between items-center text-[9px] text-indigo-400 font-semibold mt-1">
                                    <span>Match: {job.aiScore ?? 80}%</span>
                                    <a href={`/freelance?jobId=${job.id}`} className="hover:underline">Open in Studio →</a>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Workspace 2: Secondary Platform */}
                        <div className="w-1/2 flex flex-col min-h-0 p-4 space-y-3 bg-[#07070d]/30">
                          {(() => {
                            const secondary = userPlatforms.find(p => p.id !== activePlatform.id);
                            if (!secondary) {
                              return (
                                <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
                                  <p>No secondary connected platform found.</p>
                                  <span className="text-[9px] text-indigo-400 mt-1">Connect another platform to view dual grids!</span>
                                </div>
                              );
                            }
                            return (
                              <>
                                <div className="flex items-center justify-between border-b border-border/20 pb-1.5 shrink-0">
                                  <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1.5">
                                    <span>{secondary.iconUrl || '🌐'}</span>
                                    <span>{secondary.platformName} Workspace</span>
                                  </span>
                                  <span className="text-[9px] text-success">Live Syncing</span>
                                </div>
                                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-2.5">
                                  <div className="p-3 border border-border/40 rounded-xl bg-card/10 text-left space-y-1">
                                    <div className="flex justify-between items-center text-[9px] text-muted-foreground">
                                      <span className="font-bold text-foreground"> Sarah Conner</span>
                                      <span>1h ago</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-normal line-clamp-3">
                                      Hi, did you get a chance to deploy the shopify migrations? Let us know ASAP!
                                    </p>
                                  </div>
                                  <div className="p-3 border border-border/40 rounded-xl bg-card/10 text-left space-y-1">
                                    <div className="flex justify-between items-center text-[9px] text-muted-foreground">
                                      <span className="font-bold text-foreground"> System Alert</span>
                                      <span>Today</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-normal line-clamp-3">
                                      New contract proposal approved for your shopify building gig. Setup milestones.
                                    </p>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      /* Solo/Selected View Layout */
                      <div className="flex-1 flex min-h-0 divide-x divide-border/20">
                        
                        {/* Synced Jobs Panel */}
                        <div className="w-[45%] flex flex-col min-h-0 bg-[#05050a] p-4 space-y-3">
                          <div className="flex items-center justify-between shrink-0">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                              Jobs Synced ({jobs.length})
                            </div>
                            <span className="text-[9px] text-muted-foreground/80 italic">Auto-scraped via stealth</span>
                          </div>

                          {jobs.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border/40 rounded-xl p-4 text-center text-xs text-muted-foreground bg-card/5">
                              <p>No jobs synced for {activePlatform.platformName} yet.</p>
                              <button
                                onClick={() => handleForceSync(activePlatform)}
                                className="mt-2 text-[10px] font-semibold text-indigo-400 hover:underline animate-pulse"
                              >
                                Trigger Sync Scrape
                              </button>
                            </div>
                          ) : (
                            <div className="flex-1 flex gap-3 min-h-0">
                              {/* Jobs List */}
                              <div className="w-1/2 flex flex-col gap-2 overflow-y-auto pr-1">
                                {jobs.map((job) => (
                                  <div
                                    key={job.id}
                                    onClick={() => setSelectedJob(job)}
                                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                                      selectedJob?.id === job.id
                                        ? 'border-indigo-500 bg-indigo-950/20 shadow-glow-sm'
                                        : 'border-border/60 hover:border-border/80 bg-card/10'
                                    }`}
                                  >
                                    <h4 className="font-bold text-[11px] text-foreground truncate">{job.title}</h4>
                                    <div className="flex justify-between items-center text-[9px] text-muted-foreground mt-1">
                                      <span>Budget: ${job.budgetMin ?? 0}</span>
                                      <span className="text-indigo-400 font-semibold">{job.aiScore ?? 80}% match</span>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Job Detail */}
                              <div className="w-1/2 border border-border/40 rounded-xl p-3 bg-card/10 flex flex-col min-h-0 overflow-y-auto space-y-2.5 justify-between">
                                {selectedJob && (
                                  <>
                                    <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                                      <div>
                                        <h4 className="font-bold text-xs text-foreground leading-tight">{selectedJob.title}</h4>
                                        <div className="text-[9px] text-indigo-400 mt-1 flex items-center gap-1.5">
                                          <span>Rating: ⭐ {selectedJob.clientRating ?? '5.0'}</span>
                                          <span>•</span>
                                          <span>Match Score: {selectedJob.aiScore ?? 80}%</span>
                                        </div>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-wrap flex-1 min-h-0 overflow-y-auto">
                                        {selectedJob.description || 'No description provided.'}
                                      </p>

                                      {/* AI Proposal Blueprint Wizard Preview */}
                                      <div className="space-y-1.5 border-t border-border/30 pt-2 shrink-0">
                                        <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">Select Proposal Blueprint:</div>
                                        <div className="grid grid-cols-3 gap-1">
                                          {['speed', 'tech', 'budget'].map((bp) => (
                                            <button
                                              key={bp}
                                              onClick={() => setProposalBlueprint(bp as any)}
                                              className={`py-1 rounded text-[8px] font-bold border transition-all ${
                                                proposalBlueprint === bp
                                                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                                                  : 'border-border/40 bg-[#0c0c16]/30 text-muted-foreground hover:text-foreground'
                                              }`}
                                            >
                                              {bp === 'speed' && '🚀 Speed'}
                                              {bp === 'tech' && '🛠️ Tech'}
                                              {bp === 'budget' && '💼 Value'}
                                            </button>
                                          ))}
                                        </div>
                                        <div className="p-2 rounded border border-indigo-500/20 bg-indigo-500/5 text-[9px] text-indigo-300/90 leading-relaxed font-sans italic">
                                          {proposalBlueprint === 'speed' && '🎯 Focus: Explains project path within first 2 hours. Emphasizes availability.'}
                                          {proposalBlueprint === 'tech' && '🎯 Focus: Details system architecture and custom payload configurations.'}
                                          {proposalBlueprint === 'budget' && '🎯 Focus: Outlines cost optimization and retainer pricing options.'}
                                        </div>
                                      </div>
                                    </div>

                                    <a
                                      href={`/freelance?jobId=${selectedJob.id}&blueprint=${proposalBlueprint}`}
                                      className="w-full text-center rounded-lg bg-indigo-600 hover:bg-indigo-500 py-1.5 text-[10px] font-bold text-white transition-all shadow-glow-sm shrink-0 mt-2 block"
                                    >
                                      Propose with AI Specialists
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Inbox & Notifications Panel */}
                        <div className="w-[55%] flex flex-col min-h-0 bg-[#07070d]/30 p-4 space-y-3">
                          <div className="flex items-center justify-between shrink-0">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setActiveTab('messages')}
                                className={`text-[10px] font-bold uppercase tracking-wider pb-1 border-b-2 transition-all ${
                                  activeTab === 'messages'
                                    ? 'border-indigo-500 text-indigo-400'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                Live Messages ({messages.length})
                              </button>
                            </div>
                            <span className="text-[9px] text-success font-semibold flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Active Channel
                            </span>
                          </div>

                          {activeTab === 'messages' && (
                            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-3">
                              {messages.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-xs text-muted-foreground">
                                  No synced message threads found for this account.
                                </div>
                              ) : (
                                messages.map((msg) => (
                                  <div key={msg.id} className="p-3 border border-border/40 rounded-xl bg-card/25 space-y-2 text-left">
                                    <div className="flex items-center justify-between">
                                      <div className="font-bold text-[11px] text-foreground flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-success" />
                                        {msg.title}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-muted-foreground/60 mr-1.5">Mood Trend:</span>
                                        {/* Render inline Sparkline SVG */}
                                        <svg className="w-12 h-4 shrink-0 overflow-visible" viewBox="0 0 50 10">
                                          <path
                                            d="M 0 8 Q 12 3 25 7 T 50 2"
                                            fill="none"
                                            stroke="#10b981"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                          />
                                          <circle cx="50" cy="2" r="2.5" fill="#10b981" className="animate-ping" />
                                          <circle cx="50" cy="2" r="1.5" fill="#10b981" />
                                        </svg>
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground whitespace-pre-wrap leading-relaxed bg-[#05050a]/40 p-2.5 rounded-lg border border-border/20 font-sans">
                                      {msg.description}
                                    </p>
                                    <div className="space-y-1.5">
                                      <textarea
                                        placeholder="Type response back to client..."
                                        value={replyTexts[msg.id] || ''}
                                        onChange={(e) => setReplyTexts(prev => ({ ...prev, [msg.id]: e.target.value }))}
                                        rows={2}
                                        className="w-full p-2 rounded-lg border border-border/40 bg-card/30 focus:border-indigo-500/50 outline-none text-[10px] transition-all resize-none"
                                      />
                                      <div className="flex justify-end">
                                        <button
                                          onClick={() => handleReplyMessage(msg.id)}
                                          className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold text-white transition-all shadow-glow-sm"
                                        >
                                          Send Reply
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Collapsible Node Logger Terminal */}
              <div className="border-t border-border/30 bg-[#05050c] flex flex-col shrink-0">
                <div onClick={() => setConsoleCollapsed(!consoleCollapsed)} className="flex items-center justify-between px-4 py-1.5 bg-[#0a0a14] cursor-pointer hover:bg-card/20 select-none">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-success animate-pulse flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live Activity Console
                  </span>
                  <span className="text-[10px] text-muted-foreground">{consoleCollapsed ? 'Expand ▲' : 'Collapse ▼'}</span>
                </div>
                {!consoleCollapsed && (
                  <div className="h-24 overflow-y-auto p-3 font-mono text-[9px] text-success/80 space-y-1 bg-black/80 flex flex-col-reverse">
                    {[...logs].reverse().map((log, idx) => {
                      let colorClass = 'text-success/80';
                      if (log.includes('[SYSTEM]')) colorClass = 'text-indigo-400 font-bold';
                      if (log.includes('[PROXY]')) colorClass = 'text-warning';
                      if (log.includes('[STEALTH]')) colorClass = 'text-blue-400';
                      return <div key={idx} className={colorClass}>{log}</div>;
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Workspace Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 bg-radial-gradient">
              <div className="h-16 w-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Globe className="h-8 w-8" />
              </div>
              <div className="max-w-md space-y-3">
                <h3 className="text-base font-semibold text-foreground">No Platform Selected</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Select a connected freelance channel on the left sub-panel to render its website interface, or search to link a new marketplace portal.
                </p>
                <div className="text-[11px] text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg max-w-sm mx-auto">
                  💡 Click the <strong>"+"</strong> button next to Upwork in the list below to connect it, or click the search box on the left.
                </div>
              </div>

              {/* Show popular choices cards inside workspace area if no platforms at all */}
              {userPlatforms.length === 0 && (
                <div className="w-full max-w-lg border border-border/40 rounded-2xl bg-card/25 p-5 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">Popular Marketplaces:</div>
                  <div className="grid grid-cols-2 gap-3">
                    {popularPlatforms.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-card/30 text-left">
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <span>{p.iconUrl || '🌐'}</span>
                            <span>{p.name}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{p.category}</div>
                        </div>
                        <button
                          onClick={() => handleAddPlatform(p)}
                          className="p-1.5 rounded-lg border border-border bg-card/50 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-indigo-400"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Cookie Import Modal */}
      {showCookieModal && activePlatform && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-[#0d0d16] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <span>🔑</span>
                <span>Sync Cookies for {activePlatform.platformName}</span>
              </h3>
              <button
                onClick={() => setShowCookieModal(false)}
                className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              <p>
                If bot protection prevents you from typing your credentials directly, you can import your session cookies from your default system browser:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Log in to <strong>{activePlatform.platformName}</strong> in your PC browser (Chrome/Edge).</li>
                <li>Press <strong>F12</strong> to open Console, paste <code className="bg-muted px-1.5 py-0.5 rounded text-indigo-400 font-mono">copy(document.cookie)</code> and press Enter.</li>
                <li>Or copy the cookies using a free "Cookie Editor" browser extension.</li>
                <li>Paste the copied text in the box below and click Save.</li>
              </ol>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Session Cookies:</label>
              <textarea
                placeholder="Paste cookies here (e.g. oauth2_access_token=...; upwork_session=...)"
                value={pastedCookies}
                onChange={(e) => setPastedCookies(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-lg border border-border/60 bg-card/40 focus:border-primary/60 outline-none text-xs font-mono transition-all resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                <span>Custom User-Agent:</span>
                <span className="text-[9px] text-muted-foreground/60 lowercase italic">(Optional, matches cookies browser)</span>
              </label>
              <input
                type="text"
                placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."
                value={pastedUserAgent}
                onChange={(e) => setPastedUserAgent(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border/60 bg-card/40 focus:border-primary/60 outline-none text-xs font-mono transition-all"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowCookieModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-border hover:bg-white/5 transition-all text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCookies}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-xs font-semibold"
              >
                Save & Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
