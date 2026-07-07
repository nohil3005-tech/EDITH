import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Search, Briefcase, Sparkles, User, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

export const Route = createFileRoute('/messages')({
  head: () => ({ meta: [{ title: 'Freelance Messages — EDITH' }] }),
  component: MessagesPage,
});

interface PlatformMessage {
  id: string;
  type: 'message';
  platformAccountId: string | null;
  title: string; // client name
  description: string; // thread conversation text
  isRead: boolean;
  createdAt: string;
}

interface ThreadMessage {
  id: number;
  isMe: boolean;
  sender: string;
  content: string;
}

const getSentiment = (text: string) => {
  const t = text.toLowerCase();
  if (t.includes('urgent') || t.includes('asap') || t.includes('fast') || t.includes('deadline') || t.includes('hurry')) {
    return { name: 'Urgent', color: 'bg-amber-500 shadow-amber-500/50 shadow-sm animate-pulse' };
  }
  if (t.includes('late') || t.includes('delay') || t.includes('waiting') || t.includes('stuck') || t.includes('failed')) {
    return { name: 'Impatient', color: 'bg-rose-500 shadow-rose-500/50 shadow-sm' };
  }
  if (t.includes('thanks') || t.includes('great') || t.includes('good') || t.includes('perfect') || t.includes('awesome') || t.includes('love')) {
    return { name: 'Friendly', color: 'bg-emerald-500 shadow-emerald-500/50 shadow-sm' };
  }
  return { name: 'Neutral', color: 'bg-blue-400 shadow-blue-400/50 shadow-sm' };
};

function MessagesPage() {
  const [messages, setMessages] = useState<PlatformMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.platform.messages() as any;
      if (res?.data) {
        setMessages(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch platform messages:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => fetchMessages(true), 6000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom when selected thread changes or new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedId, messages]);

  const selectedThread = messages.find(m => m.id === selectedId);

  const filteredThreads = messages.filter(m => {
    const term = searchQuery.toLowerCase();
    return m.title.toLowerCase().includes(term) || m.description.toLowerCase().includes(term);
  });

  const getLatestMessage = (desc: string) => {
    const bubbles = desc.split('\n\n');
    const last = bubbles[bubbles.length - 1] || '';
    if (last.startsWith('[Me]:')) {
      return { text: last.replace('[Me]:', '').trim(), isMe: true };
    }
    return { text: last.trim(), isMe: false };
  };

  const getPlatformClass = (clientName: string) => {
    const nameLower = clientName.toLowerCase();
    if (nameLower.includes('upwork')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
    if (nameLower.includes('fiverr')) return 'bg-green-500/15 text-green-400 border-green-500/20';
    if (nameLower.includes('freelancer')) return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
    return 'bg-primary/15 text-primary border-primary/20';
  };

  const parseThread = (desc: string): ThreadMessage[] => {
    if (!desc) return [];
    return desc.split('\n\n').filter(Boolean).map((chunk, idx) => {
      const isMe = chunk.startsWith('[Me]:');
      const sender = isMe ? 'Me' : (selectedThread?.title.split(' ')[0] || 'Client');
      const content = isMe ? chunk.replace('[Me]:', '').trim() : chunk.trim();
      return {
        id: idx,
        isMe,
        sender,
        content
      };
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !replyText.trim()) return;

    setSending(true);
    const originalText = replyText;
    try {
      // Optimistic update
      setMessages(prev => prev.map(m => {
        if (m.id === selectedId) {
          return {
            ...m,
            description: `${m.description}\n\n[Me]: ${originalText}`,
            createdAt: new Date().toISOString()
          };
        }
        return m;
      }));
      setReplyText('');

      await api.platform.reply(selectedId, originalText);
      toast.success('Reply posted successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to post reply.');
      // Revert optimism if error
      fetchMessages();
    } finally {
      setSending(false);
    }
  };

  const handleAIDraft = () => {
    if (!selectedThread) return;
    setDrafting(true);
    
    // Simulate AI drafting a smart, personalized reply after 1.2 seconds
    setTimeout(() => {
      const parsed = parseThread(selectedThread.description);
      const lastMsg = parsed[parsed.length - 1]?.content || '';
      
      let aiSuggestion = `Hi! Thanks for reaching out. Yes, I have extensive experience in this area and would love to assist you. Shall we jump on a quick call to discuss the deliverables?`;
      
      if (lastMsg.toLowerCase().includes('rate') || lastMsg.toLowerCase().includes('cost') || lastMsg.toLowerCase().includes('price')) {
        aiSuggestion = `Hello! My standard rate for this category of work is competitive, and I ensure top-tier quality. I would love to break down the pricing details in a proposal after understanding your specific requirements. Let me know if that works!`;
      } else if (lastMsg.toLowerCase().includes('when') || lastMsg.toLowerCase().includes('time') || lastMsg.toLowerCase().includes('start')) {
        aiSuggestion = `Hi! I can get started on this project immediately. I will align my AI assistants and QC verification framework to deliver the draft in under 48 hours. Let me know if we can proceed!`;
      }
      
      setReplyText(aiSuggestion);
      setDrafting(false);
      toast.success('AI response draft generated.');
    }, 1200);
  };

  const activeBubbles = selectedThread ? parseThread(selectedThread.description) : [];

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] rounded-xl border border-border/60 bg-background overflow-hidden shadow-card">
      <div className="flex flex-1 min-h-0">
        
        {/* Left Side: Threads List */}
        <div className={`w-full md:w-80 flex flex-col border-r border-border/60 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-border/60 space-y-3">
            <h2 className="text-lg font-bold tracking-tight">Client Inbox</h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card/40 text-xs focus:outline-none focus:border-primary/40"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-border/30">
            {loading && messages.length === 0 ? (
              <div className="flex justify-center items-center h-48">
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <MessageSquare className="h-8 w-8 mx-auto opacity-50" />
                <p>No conversations found</p>
              </div>
            ) : (
              filteredThreads.map((m) => {
                const latest = getLatestMessage(m.description);
                const isActiveThread = m.id === selectedId;
                const platform = m.title.split(' ')[0] || 'Platform';
                const sentiment = getSentiment(m.description);
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={`w-full text-left p-4 transition-all hover:bg-card/50 flex flex-col gap-1.5 ${
                      isActiveThread ? 'bg-primary/5 border-r-2 border-r-primary' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getPlatformClass(m.title)}`}>
                        {platform}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!m.isRead && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                      <h4 className="font-semibold text-xs text-foreground truncate flex-1 flex items-center gap-1.5">
                        {m.title}
                        <span className={`h-1.5 w-1.5 rounded-full inline-block ${sentiment.color}`} title={`Sentiment: ${sentiment.name}`} />
                      </h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {latest.isMe ? <span className="text-primary font-medium">You: </span> : ''}
                      {latest.text}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Chat Viewport */}
        <div className={`flex-1 flex flex-col min-w-0 bg-[#07070d]/30 ${!selectedId ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
          {selectedThread ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-border/60 flex items-center justify-between bg-card/30">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="p-1 rounded hover:bg-card md:hidden text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      {selectedThread.title}
                      <span className={`h-2 w-2 rounded-full inline-block ${getSentiment(selectedThread.description).color}`} title={`Sentiment: ${getSentiment(selectedThread.description).name}`} />
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-mono">Sync active</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getPlatformClass(selectedThread.title)}`}>
                    {selectedThread.title.split(' ')[0] || 'Platform'}
                  </span>
                </div>
              </div>

              {/* Message log */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeBubbles.map((b) => (
                  <div key={b.id} className={`flex ${b.isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed border ${
                      b.isMe
                        ? 'bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground border-primary/20 rounded-tr-none'
                        : 'bg-card/85 text-foreground border-border/40 rounded-tl-none'
                    }`}>
                      {!b.isMe && (
                        <div className="text-[9px] font-bold text-primary mb-1 uppercase tracking-wider">
                          {b.sender}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{b.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Footer */}
              <form onSubmit={handleSend} className="p-4 border-t border-border/60 bg-card/25 space-y-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAIDraft}
                      disabled={drafting || sending}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-bold uppercase transition-all disabled:opacity-50"
                    >
                      {drafting ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3 animate-pulse" />
                      )}
                      {drafting ? 'Drafting...' : 'AI Assist Draft'}
                    </button>
                    <span className="text-[10px] text-muted-foreground italic">Use AI helper to craft custom replies</span>
                  </div>

                  {/* Quick templates */}
                  <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-border/10">
                    <button
                      type="button"
                      onClick={() => setReplyText("Hi! I have successfully completed the deliverables and verified them. Could you please review the files and release the milestone funds when you get a chance? Thanks!")}
                      className="rounded bg-muted border border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      💰 Request Payout
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyText("Hi! I would love to help you add this new feature. Since this requirement falls outside the scope of our original agreement, let's add a new milestone to the contract for $250 to cover this work. Let me know if that works!")}
                      className="rounded bg-muted border border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      🛡️ Resolve Scope Creep
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyText("Hi! It was an absolute pleasure working on this project. If you are satisfied with the final deliverables, I would be highly grateful if you could leave a 5-star review. Looking forward to our next project together!")}
                      className="rounded bg-muted border border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      ⭐ Ask feedback
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <textarea
                    placeholder="Type your message reply..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={2}
                    className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:border-primary/40"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="rounded-lg bg-primary text-primary-foreground px-4 flex items-center justify-center transition-all hover:bg-primary/95 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center p-8 space-y-3 max-w-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-card border border-border">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-sm">No thread selected</h3>
              <p className="text-xs text-muted-foreground leading-normal">
                Select a client dialogue card from the sidebar to inspect credentials history, read details, and reply.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
