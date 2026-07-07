import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { Upload, FolderOpen, FileText, Image as ImageIcon, Trash2, Download, Search, FolderPlus, Edit2, Move, X, Send, Sparkles, Loader2 } from "lucide-react";
import { fmtBytes, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { useEdith, useHydrated } from "@/lib/store";
import { useConfirm } from "@/components/edith/ConfirmDialog";
import type { StoredFile } from "@/lib/mockData";
import api from "@/lib/api";
import { syncFilesFromBackend } from "@/lib/apiStore";

export const Route = createFileRoute("/files")({
  head: () => ({ meta: [{ title: "Files — EDITH" }] }),
  component: FilesPage,
});

function FilesPage() {
  const folders = useHydrated((s) => s.folders, ["Deliverables"] as string[]);
  const files = useHydrated((s) => s.files, [] as StoredFile[]);
  const addFile = useEdith((s) => s.addFile);
  const removeFile = useEdith((s) => s.removeFile);
  const renameFile = useEdith((s) => s.renameFile);
  const moveFile = useEdith((s) => s.moveFile);
  const addFolder = useEdith((s) => s.addFolder);
  const confirm = useConfirm();

  const [folder, setFolder] = useState("Deliverables");
  const [q, setQ] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [movingFile, setMovingFile] = useState<StoredFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [previewingFile, setPreviewingFile] = useState<StoredFile | null>(null);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [aiInstruction, setAiInstruction] = useState<string>("");
  const [applyingAi, setApplyingAi] = useState<boolean>(false);
  const [showAiChat, setShowAiChat] = useState<boolean>(false);

  useEffect(() => {
    syncFilesFromBackend();
  }, []);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const toastId = toast.loading(`Uploading ${e.target.files.length} file(s)...`);
    try {
      for (const f of Array.from(e.target.files)) {
        await api.files.upload(f, folder);
      }
      await syncFilesFromBackend();
      toast.success(`Uploaded ${e.target.files.length} file(s)`, { id: toastId });
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message || err}`, { id: toastId });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onRemove = async (f: StoredFile) => {
    if (await confirm({ title: "Delete file?", message: `"${f.name}" will be permanently removed.`, variant: "danger", confirmText: "Delete" })) {
      try {
        await api.files.delete(f.id);
        await syncFilesFromBackend();
        toast.success("Deleted");
      } catch (err: any) {
        toast.error(`Failed to delete: ${err.message || err}`);
      }
    }
  };

  const onDownload = (f: StoredFile) => {
    if (f.dataUrl) {
      const a = document.createElement("a");
      a.href = f.dataUrl;
      a.download = f.name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } else {
      toast("Demo file — download simulated", { description: f.name });
    }
  };

  const onShare = async (f: StoredFile) => {
    const link = `https://files.edith.ai/share/${f.id}?expires=24h`;
    await navigator.clipboard.writeText(link).catch(() => {});
    toast.success("Share link copied", { description: link });
  };

  const onPreviewFile = async (f: StoredFile) => {
    setPreviewingFile(f);
    setShowAiChat(false);
    setAiInstruction("");
    
    const isText = (f.mime || "").startsWith("text/") || 
                   f.mime === "application/json" ||
                   f.name.endsWith(".txt") || 
                   f.name.endsWith(".md") || 
                   f.name.endsWith(".html") || 
                   f.name.endsWith(".css") || 
                   f.name.endsWith(".js") || 
                   f.name.endsWith(".ts") || 
                   f.name.endsWith(".json");

    if (isText) {
      setLoadingContent(true);
      setPreviewContent("");
      try {
        const res = await api.files.getContent(f.id) as any;
        if (res?.data?.content !== undefined) {
          setPreviewContent(res.data.content);
        } else {
          setPreviewContent("Error: Could not read file content.");
        }
      } catch (err: any) {
        setPreviewContent(`Failed to load file content: ${err.message || err}`);
      } finally {
        setLoadingContent(false);
      }
    } else {
      setPreviewContent("");
    }
  };

  const handleApplyAiEdit = async () => {
    if (!aiInstruction.trim() || !previewingFile) return;
    setApplyingAi(true);
    try {
      const res = await api.files.editWithAI(previewingFile.id, aiInstruction) as any;
      if (res?.success && res?.data?.content !== undefined) {
        setPreviewContent(res.data.content);
        toast.success("AI Edit completed successfully!");
        setAiInstruction("");
        setShowAiChat(false);
        await syncFilesFromBackend();
      } else {
        toast.error(res?.error?.message || "Failed to edit file with AI.");
      }
    } catch (err: any) {
      toast.error(`AI edit failed: ${err.message || err}`);
    } finally {
      setApplyingAi(false);
    }
  };

  const onNewFolder = () => {
    const name = prompt("Folder name?")?.trim();
    if (name) { addFolder(name); toast.success(`Folder "${name}" created`); }
  };

  const filtered = files.filter((f) => f.folder === folder && (!q || f.name.toLowerCase().includes(q.toLowerCase())));
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const cap = 5 * 1024 * 1024 * 1024;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Files</h1>
          <p className="mt-1 text-sm text-muted-foreground">Organized storage for deliverables, assets, and portfolio.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">
            {fmtBytes(totalSize)} / {fmtBytes(cap)}
            <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-gradient-primary" style={{ width: `${Math.min(100, (totalSize / cap) * 100)}%` }} />
            </div>
          </div>
          <input ref={inputRef} type="file" multiple hidden onChange={onUpload} />
          <button onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
            <Upload className="h-3.5 w-3.5" /> Upload
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="rounded-xl border border-border/60 bg-gradient-card p-3 shadow-card">
          <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Folders</span>
            <button onClick={onNewFolder} className="rounded p-1 hover:bg-card hover:text-foreground" title="New folder"><FolderPlus className="h-3.5 w-3.5" /></button>
          </div>
          {folders.map((f) => {
            const count = files.filter((x) => x.folder === f).length;
            return (
              <button key={f} onClick={() => setFolder(f)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${folder === f ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}>
                <FolderOpen className="h-4 w-4" /> <span className="flex-1">{f}</span>
                <span className="text-[10px] text-muted-foreground">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-border/60 bg-gradient-card p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-semibold">{folder}</h2>
            <span className="rounded-full bg-card px-2 py-0.5 text-[10px] text-muted-foreground">{filtered.length}</span>
            <div className="relative ml-auto w-56">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files…"
                className="w-full rounded-lg border border-border bg-background/40 pl-8 pr-3 py-1.5 text-sm" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16 text-center cursor-pointer hover:border-primary/40">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Drop files here or click to upload</p>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((f) => {
                const isImg = (f.mime || "").startsWith("image/");
                const isRenaming = renaming === f.id;
                return (
                  <div key={f.id} onClick={() => onPreviewFile(f)} className="group flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 hover:border-primary/40 cursor-pointer">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      {isImg ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      {isRenaming ? (
                        <input autoFocus value={renameVal} onChange={(e) => { e.stopPropagation(); setRenameVal(e.target.value); }}
                          onBlur={() => { renameFile(f.id, renameVal); setRenaming(null); toast.success("Renamed"); }}
                          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") { renameFile(f.id, renameVal); setRenaming(null); toast.success("Renamed"); }}}
                          className="w-full rounded border border-primary bg-background px-2 py-0.5 text-sm" />
                      ) : (
                        <p className="truncate text-sm font-medium">{f.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{fmtBytes(f.size)} · {fmtDate(f.createdAt)}</p>
                    </div>
                    <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => onDownload(f)} className="rounded p-1.5 text-muted-foreground hover:bg-card hover:text-primary" title="Download"><Download className="h-3.5 w-3.5" /></button>
                      <button onClick={() => onShare(f)} className="rounded p-1.5 text-muted-foreground hover:bg-card hover:text-primary" title="Share">🔗</button>
                      <button onClick={() => { setRenaming(f.id); setRenameVal(f.name); }} className="rounded p-1.5 text-muted-foreground hover:bg-card hover:text-primary" title="Rename"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setMovingFile(f)} className="rounded p-1.5 text-muted-foreground hover:bg-card hover:text-primary" title="Move"><Move className="h-3.5 w-3.5" /></button>
                      <button onClick={() => onRemove(f)} className="rounded p-1.5 text-muted-foreground hover:bg-card hover:text-destructive" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {movingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm" onClick={() => setMovingFile(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-elevated">
            <h3 className="font-semibold">Move "{movingFile.name}"</h3>
            <p className="mt-1 text-xs text-muted-foreground">Choose a destination folder.</p>
            <div className="mt-4 space-y-1">
              {folders.filter((f) => f !== movingFile.folder).map((f) => (
                <button key={f} onClick={() => { moveFile(movingFile.id, f); setMovingFile(null); toast.success(`Moved to ${f}`); }}
                  className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">
                  <FolderOpen className="h-4 w-4" /> {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {previewingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm" onClick={() => setPreviewingFile(null)}>
          <div onClick={(e) => e.stopPropagation()} className="relative flex flex-col w-full max-w-4xl h-[80vh] rounded-2xl border border-border bg-card shadow-elevated overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4 bg-card/60 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm leading-none">{previewingFile.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{fmtBytes(previewingFile.size)} · {fmtDate(previewingFile.createdAt)}</p>
                </div>
              </div>
              <button onClick={() => setPreviewingFile(null)} className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-4 bg-background/35 font-mono text-sm leading-relaxed whitespace-pre-wrap select-text">
              {loadingContent ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-xs text-muted-foreground">Loading file contents...</p>
                </div>
              ) : previewContent ? (
                <div className="w-full h-full relative">
                  <textarea
                    value={previewContent}
                    readOnly
                    className="w-full h-full bg-transparent border-0 outline-0 p-0 text-foreground resize-none focus:ring-0 overflow-auto font-mono text-xs leading-relaxed md:text-sm"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                  <FileText className="h-12 w-12 text-muted-foreground/45" />
                  <p className="font-semibold text-sm">No Preview Available</p>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Previews and AI edits are only supported for text files. Please download this file to view and edit.
                  </p>
                  <button onClick={() => onDownload(previewingFile)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-all">
                    <Download className="h-3.5 w-3.5" /> Download File
                  </button>
                </div>
              )}
            </div>

            {/* AI Prompt Drawer / Footer */}
            {previewContent && (
              <div className="border-t border-border bg-card/60 backdrop-blur-md p-4">
                {!showAiChat ? (
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-xs text-muted-foreground">Verify outputs and edit contents before delivery.</span>
                    <button
                      onClick={() => setShowAiChat(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Edit with AI
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 animate-slide-in">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Guide the AI Editor
                      </label>
                      <button onClick={() => setShowAiChat(false)} className="text-[10px] font-semibold text-muted-foreground hover:underline">
                        Cancel
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={aiInstruction}
                        onChange={(e) => setAiInstruction(e.target.value)}
                        placeholder="e.g., 'Rewrite the second paragraph to sound more professional' or 'Fix spelling errors'..."
                        className="flex-1 rounded-lg border border-border bg-background/50 px-3 py-2 text-xs focus:border-primary/50 focus:outline-none text-foreground placeholder:text-muted-foreground/60"
                        disabled={applyingAi}
                        onKeyDown={(e) => { if (e.key === "Enter" && !applyingAi) handleApplyAiEdit(); }}
                      />
                      <button
                        onClick={handleApplyAiEdit}
                        disabled={applyingAi || !aiInstruction.trim()}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-40"
                      >
                        {applyingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
