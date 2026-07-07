import { Outlet, Link, createRootRoute, HeadContent, Scripts, useNavigate } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/edith/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import { Bell, Search, Command, Hexagon, Loader2 } from "lucide-react";
import { AuthProvider } from "@/hooks/useAuth";
import { EdithChat } from "@/components/edith/EdithChat";
import { ConfirmProvider } from "@/components/edith/ConfirmDialog";
import { ThemeBoot } from "@/components/edith/ThemeBoot";
import { OnboardingWizard } from "@/components/edith/OnboardingWizard";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { toast } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: "EDITH — Enhanced Digital Intelligence & Trading Hub" },
      { name: "description", content: "Dual-engine AI system for managing freelancing and dropshipping businesses." },
      { name: "author", content: "NSB" },
      { property: "og:title", content: "EDITH — Intelligence Hub" },
      { property: "og:description", content: "AI-powered freelancing & dropshipping command center." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "theme-color", content: "#0A0A0F" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NotificationsDropdown() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.admin.listNotifications() as any;
      if (res?.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.admin.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      toast.success("Notification marked as read");
    } catch (err) {
      toast.error("Failed to update notification");
    }
  };

  const handleUserStatus = async (notifId: string, userId: string, status: "active" | "blocked") => {
    try {
      await api.admin.updateUserStatus(userId, status);
      await api.admin.markNotificationRead(notifId);
      toast.success(`User successfully ${status === "active" ? "approved" : "blocked"}`);
      fetchNotifications();
    } catch (err) {
      toast.error("Failed to update user status");
    }
  };

  if (user?.role !== "admin") return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg border border-border/60 bg-card/40 p-2 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-[#0d0d16] p-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)] z-50 text-sm max-h-96 overflow-y-auto backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
            <span className="font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-xs font-medium text-destructive">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`p-3 space-y-2 border border-white/5 rounded-lg transition-colors ${n.read ? "opacity-50" : "bg-indigo-950/20"}`}>
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="font-medium text-indigo-200 text-xs">{n.title}</span>
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>
                  
                  {n.type === "new_user_registration" && !n.read && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleUserStatus(n.id, n.metadata?.userId, "active")}
                        className="flex-1 rounded bg-indigo-600 py-1 text-[10px] font-semibold text-white hover:bg-indigo-500 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleUserStatus(n.id, n.metadata?.userId, "blocked")}
                        className="flex-1 rounded border border-white/10 py-1 text-[10px] font-semibold text-white hover:bg-white/5 transition-colors"
                      >
                        Block
                      </button>
                    </div>
                  )}

                  {!n.read && n.type !== "new_user_registration" && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AppLayout() {
  const { user, loading } = useAuth();

  const isMobileRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/mobile');
  const isAuthRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/auth');
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!loading && !user && !isAuthRoute) {
      navigate({ to: '/auth' });
      return;
    }

    if (isMobileRoute) {
      localStorage.setItem('prefer_desktop', 'false');
      return;
    }

    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    const preferDesktop = localStorage.getItem('prefer_desktop') === 'true';

    if (isMobileDevice && !preferDesktop) {
      navigate({ to: '/mobile' });
    }
  }, [user, loading, isMobileRoute, isAuthRoute, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07070d] text-indigo-500">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (isAuthRoute) {
    return (
      <div className="min-h-screen w-full bg-[#07070d] text-foreground font-sans overflow-x-hidden">
        <Outlet />
        <Toaster />
      </div>
    );
  }

  if (isMobileRoute) {
    return (
      <div className="min-h-screen w-full bg-[#0A0A0F] text-foreground font-sans overflow-x-hidden pb-16">
        <Outlet />
        <Toaster />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <div className="relative z-10 flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/60 px-5 backdrop-blur-2xl">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="hidden items-center gap-2 rounded-xl border border-border/60 bg-card/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 md:flex md:w-96">
              <Search className="h-4 w-4" />
              <span className="text-xs">Search jobs, products, agents…</span>
              <kbd className="ml-auto inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center gap-3 rounded-full border border-border/60 bg-card/40 px-3 py-1.5 text-xs lg:flex">
                <span className="flex items-center gap-1.5 text-success">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  All systems operational
                </span>
                <span className="h-3 w-px bg-border" />
                <span className="font-mono text-muted-foreground">13 agents · 92% auto</span>
              </div>
              <NotificationsDropdown />
            </div>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
      <EdithChat />
      <Toaster />
      <OnboardingWizard />
    </SidebarProvider>
  );
}

function RootComponent() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js")
          .then((reg) => console.log("Service Worker registered:", reg.scope))
          .catch((err) => console.error("Service Worker registration failed:", err));
      });
    }
  }, []);

  return (
    <AuthProvider>
    <ConfirmProvider>
    <ThemeBoot />
    <AppLayout />
    </ConfirmProvider>
    </AuthProvider>
  );
}
