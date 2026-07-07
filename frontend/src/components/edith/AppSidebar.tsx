import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Briefcase, Package, Cpu, BarChart3, Settings, Hexagon, Receipt, FolderOpen, ShoppingBag, Link2, User, Sun, Moon, RotateCcw, ChevronDown, Shield, LogOut, Smartphone, Bell, MessageSquare, Activity, Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useEdith, useHydrated } from "@/lib/store";
import { useConfirm } from "@/components/edith/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";

const baseItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Freelance Studio", url: "/freelance", icon: Briefcase },
  { title: "Freelancer Platforms", url: "/platforms", icon: Globe },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Task Processor", url: "/processor", icon: Activity },
  { title: "Dropshipping", url: "/dropshipping", icon: Package },
  { title: "Invoices", url: "/invoices", icon: Receipt },
  { title: "Files", url: "/files", icon: FolderOpen },
  { title: "AI Agents", url: "/agents", icon: Cpu },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Marketplace", url: "/marketplace", icon: ShoppingBag },
  { title: "Referrals", url: "/referrals", icon: Link2 },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Mobile Command", url: "/mobile", icon: Smartphone },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const profile = useHydrated((s) => s.profile, { name: "Alex Morgan", email: "alex@edith.ai" } as any);
  const theme = useHydrated((s) => s.theme, "dark" as "dark" | "light");
  const setTheme = useEdith((s) => s.setTheme);
  const resetAll = useEdith((s) => s.resetAll);
  const confirm = useConfirm();
  const { user, logout } = useAuth();
  const [showAdminLink, setShowAdminLink] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.role === "admin") {
      api.admin.getUsersCount()
        .then((res: any) => {
          if (res?.data?.count > 1) {
            setShowAdminLink(true);
          } else {
            setShowAdminLink(false);
          }
        })
        .catch(() => setShowAdminLink(false));
    } else {
      setShowAdminLink(false);
    }
  }, [user]);

  const items = [...baseItems];
  if (showAdminLink) {
    // Insert Admin Panel link
    items.splice(items.length - 1, 0, { title: "Admin Panel", url: "/admin", icon: Shield });
  }

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));
  const initials = profile.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();

  const onReset = async () => {
    setMenuOpen(false);
    if (await confirm({ title: "Reset all data?", message: "This wipes all your jobs, proposals, invoices, files, and settings back to demo data.", variant: "danger", confirmText: "Reset", requireType: "RESET" })) {
      resetAll();
      toast.success("Data reset to demo defaults");
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-4 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden shadow-glow">
            <img src="/logo.png" className="h-full w-full object-cover" alt="EDITH" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-lg font-bold tracking-tight">EDITH</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Intelligence Hub</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}
                      className="relative h-10 data-[active=true]:bg-primary/10 data-[active=true]:text-foreground hover:bg-sidebar-accent">
                      <Link 
                        to={item.url}
                        onClick={() => {
                          if (item.url === "/mobile") {
                            localStorage.setItem("prefer_desktop", "false");
                          }
                        }}
                      >
                        {active && <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-gradient-primary" />}
                        <item.icon className={active ? "text-primary" : ""} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div ref={menuRef} className="relative">
          <button onClick={() => setMenuOpen((o) => !o)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-sidebar-accent">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar bg-success" />
            </div>
            <div className="flex flex-1 flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-medium leading-tight">{profile.name}</span>
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                Pro Plan
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform group-data-[collapsible=icon]:hidden ${menuOpen ? "rotate-180" : ""}`} />
          </button>
          {menuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-border bg-popover p-1 text-sm shadow-elevated z-50">
              <button onClick={() => { setMenuOpen(false); navigate({ to: "/settings" }); }} className="flex w-full items-center gap-2 rounded px-3 py-2 hover:bg-accent">
                <User className="h-4 w-4" /> Profile
              </button>
              <button onClick={() => { setMenuOpen(false); navigate({ to: "/settings" }); }} className="flex w-full items-center gap-2 rounded px-3 py-2 hover:bg-accent">
                <Settings className="h-4 w-4" /> Settings
              </button>
              <button onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); toast.success(`Switched to ${theme === "dark" ? "light" : "dark"} theme`); }}
                className="flex w-full items-center gap-2 rounded px-3 py-2 hover:bg-accent">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === "dark" ? "Light Theme" : "Dark Theme"}
              </button>
              <button onClick={() => { setMenuOpen(false); logout(); toast.success("Logged out successfully"); }} className="flex w-full items-center gap-2 rounded px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground">
                <LogOut className="h-4 w-4" /> Log Out
              </button>
              <div className="my-1 border-t border-border" />
              <button onClick={onReset} className="flex w-full items-center gap-2 rounded px-3 py-2 text-destructive hover:bg-destructive/10">
                <RotateCcw className="h-4 w-4" /> Reset Demo Data
              </button>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
