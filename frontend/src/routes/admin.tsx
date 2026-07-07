import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, ShieldAlert, ShieldCheck, UserMinus, Plus, Trash2, CheckCircle2, AlertTriangle, ToggleLeft, ToggleRight, Loader2, Bell } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Panel — EDITH" }] }),
  component: AdminPanel,
});

function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    autoApproveLogins: false,
    notifyOnNewLogin: true,
    allowAnyGoogleAccount: false,
  });

  const [whitelistEmail, setWhitelistEmail] = useState("");
  const [whitelistRole, setWhitelistRole] = useState<"admin" | "user">("user");

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingWhitelist, setLoadingWhitelist] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [busy, setBusy] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.admin.listUsers() as any;
      if (res?.data) setUsers(res.data);
    } catch (err: any) {
      toast.error("Failed to load users: " + err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchWhitelist = async () => {
    setLoadingWhitelist(true);
    try {
      const res = await api.admin.listWhitelist() as any;
      if (res?.data) setWhitelist(res.data);
    } catch (err: any) {
      toast.error("Failed to load whitelist: " + err.message);
    } finally {
      setLoadingWhitelist(false);
    }
  };

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await api.admin.getSettings() as any;
      if (res?.data) setSettings(res.data);
    } catch (err: any) {
      toast.error("Failed to load settings: " + err.message);
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await api.admin.listNotifications() as any;
      if (res?.data) setNotifications(res.data);
    } catch (err: any) {
      toast.error("Failed to load notifications: " + err.message);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchWhitelist();
    fetchSettings();
    fetchNotifications();
  }, []);

  const handleUpdateStatus = async (userId: string, status: "active" | "blocked" | "pending") => {
    try {
      await api.admin.updateUserStatus(userId, status);
      toast.success(`User status updated to ${status}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateRole = async (userId: string, role: "admin" | "user") => {
    try {
      await api.admin.updateUserRole(userId, role);
      toast.success(`User role updated to ${role}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? All their isolation data (jobs, products, invoices, chats) will be permanently purged.")) return;
    try {
      await api.admin.deleteUser(userId);
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddToWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whitelistEmail.trim()) return;
    setBusy(true);
    try {
      await api.admin.addToWhitelist(whitelistEmail.trim().toLowerCase(), whitelistRole);
      toast.success("Added to whitelist");
      setWhitelistEmail("");
      fetchWhitelist();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveFromWhitelist = async (email: string) => {
    try {
      await api.admin.removeFromWhitelist(email);
      toast.success("Removed from whitelist");
      fetchWhitelist();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleSetting = async (key: keyof typeof settings) => {
    const updatedSettings = {
      ...settings,
      [key]: !settings[key],
    };
    try {
      await api.admin.updateSettings(updatedSettings);
      setSettings(updatedSettings);
      toast.success("System settings updated");
    } catch (err: any) {
      toast.error("Failed to update settings: " + err.message);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.admin.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      toast.success("Marked as read");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage user access, security gates, system settings, and notifications.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Left Column: Users list & Whitelist */}
        <div className="space-y-6">
          {/* User Accounts Management */}
          <div className="rounded-xl border border-border/60 bg-gradient-card p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
                User Accounts
              </h2>
              <button
                onClick={fetchUsers}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Refresh
              </button>
            </div>

            {loadingUsers ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="py-3 px-2">User / Email</th>
                      <th className="py-3 px-2">Role</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2">Last Login</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-card/25 transition-colors">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2.5">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt="" className="h-8 w-8 rounded-full border border-white/10" />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                                {u.email.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{u.name || "New User"}</span>
                              <span className="text-xs text-muted-foreground">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "admin" ? "bg-indigo-500/10 text-indigo-400" : "bg-muted text-muted-foreground"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.status === "active" ? "bg-success/10 text-success" : 
                            u.status === "blocked" ? "bg-destructive/10 text-destructive" : 
                            "bg-yellow-500/10 text-yellow-500"
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "Never"}
                        </td>
                        <td className="py-3 px-2 text-right space-x-1.5 whitespace-nowrap">
                          {u.status === "pending" && (
                            <button
                              onClick={() => handleUpdateStatus(u.id, "active")}
                              className="text-xs rounded bg-success/15 hover:bg-success/25 px-2.5 py-1 text-success font-medium"
                            >
                              Approve
                            </button>
                          )}
                          {u.status === "active" && u.role !== "admin" && (
                            <button
                              onClick={() => handleUpdateStatus(u.id, "blocked")}
                              className="text-xs rounded bg-destructive/15 hover:bg-destructive/25 px-2.5 py-1 text-destructive font-medium"
                            >
                              Block
                            </button>
                          )}
                          {u.status === "blocked" && (
                            <button
                              onClick={() => handleUpdateStatus(u.id, "active")}
                              className="text-xs rounded bg-success/15 hover:bg-success/25 px-2.5 py-1 text-success font-medium"
                            >
                              Unblock
                            </button>
                          )}
                          {u.role === "user" ? (
                            <button
                              onClick={() => handleUpdateRole(u.id, "admin")}
                              className="text-xs rounded border border-white/5 bg-[#0e0e18] px-2 py-1 text-muted-foreground hover:bg-indigo-500/10 hover:text-indigo-400"
                            >
                              Promote
                            </button>
                          ) : (
                            u.email !== "admin@edith.local" && (
                              <button
                                onClick={() => handleUpdateRole(u.id, "user")}
                                className="text-xs rounded border border-white/5 bg-[#0e0e18] px-2 py-1 text-muted-foreground hover:bg-indigo-500/10 hover:text-indigo-400"
                              >
                                Demote
                              </button>
                            )
                          )}
                          {u.email !== "admin@edith.local" && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors inline-flex align-middle"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* User Registration Whitelist */}
          <div className="rounded-xl border border-border/60 bg-gradient-card p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-400" />
                Pre-Approved Whitelist
              </h2>
            </div>

            <form onSubmit={handleAddToWhitelist} className="flex gap-3 items-end max-w-xl">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={whitelistEmail}
                  onChange={(e) => setWhitelistEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="w-36 space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Default Role</label>
                <select
                  value={whitelistRole}
                  onChange={(e) => setWhitelistRole(e.target.value as any)}
                  className="w-full rounded-lg border border-border bg-[#0a0a14] px-3 py-2 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                disabled={busy}
                type="submit"
                className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 shadow-glow disabled:opacity-50 h-9"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </button>
            </form>

            {loadingWhitelist ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              </div>
            ) : (
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="py-2.5 px-2">Whitelisted Email</th>
                      <th className="py-2.5 px-2">Role Assigned</th>
                      <th className="py-2.5 px-2">Added On</th>
                      <th className="py-2.5 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {whitelist.map((w) => (
                      <tr key={w.email} className="hover:bg-card/25 transition-colors">
                        <td className="py-2.5 px-2 font-medium text-foreground">{w.email}</td>
                        <td className="py-2.5 px-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${w.role === "admin" ? "bg-indigo-500/10 text-indigo-400" : "bg-muted text-muted-foreground"}`}>
                            {w.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-xs text-muted-foreground">
                          {new Date(w.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <button
                            onClick={() => handleRemoveFromWhitelist(w.email)}
                            className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {whitelist.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                          No pre-approved email whitelist registrations.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Global settings & Notifications log */}
        <div className="space-y-6">
          {/* Global System Settings */}
          <div className="rounded-xl border border-border/60 bg-gradient-card p-6 shadow-card space-y-6">
            <div className="border-b border-border/60 pb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-indigo-400" />
                Global Security Settings
              </h2>
            </div>

            {loadingSettings ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-foreground">Auto-Approve Google Logins</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Automatically activate new Google OAuth registrations instead of holding them in pending status.
                    </p>
                  </div>
                  <button onClick={() => handleToggleSetting("autoApproveLogins")} className="text-indigo-400 hover:text-indigo-300">
                    {settings.autoApproveLogins ? <ToggleRight className="h-9 w-9" /> : <ToggleLeft className="h-9 w-9 text-muted-foreground/60" />}
                  </button>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-foreground">Notify on New Registrations</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Send an alert email to the administrator when a new user registers on this hub.
                    </p>
                  </div>
                  <button onClick={() => handleToggleSetting("notifyOnNewLogin")} className="text-indigo-400 hover:text-indigo-300">
                    {settings.notifyOnNewLogin ? <ToggleRight className="h-9 w-9" /> : <ToggleLeft className="h-9 w-9 text-muted-foreground/60" />}
                  </button>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-foreground">Allow Any Google Account</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Allow any Google account to sign up. If disabled, only pre-approved whitelist emails can login.
                    </p>
                  </div>
                  <button onClick={() => handleToggleSetting("allowAnyGoogleAccount")} className="text-indigo-400 hover:text-indigo-300">
                    {settings.allowAnyGoogleAccount ? <ToggleRight className="h-9 w-9" /> : <ToggleLeft className="h-9 w-9 text-muted-foreground/60" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Admin System Log / Notifications */}
          <div className="rounded-xl border border-border/60 bg-gradient-card p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5 text-indigo-400" />
                Administrative Logs
              </h2>
              <button
                onClick={fetchNotifications}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Refresh
              </button>
            </div>

            {loadingNotifications ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 border border-white/5 rounded-xl space-y-2.5 transition-all ${
                      n.read ? "bg-[#0b0b12]/30 opacity-60" : "bg-indigo-950/10 border-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.03)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-indigo-200">
                        <span>{n.title}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>

                    {n.type === "new_user_registration" && !n.read && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateStatus(n.metadata?.userId, "active").then(() => handleMarkNotificationRead(n.id))}
                          className="flex-1 rounded bg-indigo-600 hover:bg-indigo-500 py-1.5 text-[11px] font-semibold text-white transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(n.metadata?.userId, "blocked").then(() => handleMarkNotificationRead(n.id))}
                          className="flex-1 rounded border border-white/10 hover:bg-white/5 py-1.5 text-[11px] font-semibold text-white transition-colors"
                        >
                          Block
                        </button>
                      </div>
                    )}

                    {!n.read && n.type !== "new_user_registration" && (
                      <button
                        onClick={() => handleMarkNotificationRead(n.id)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                ))}
                {notifications.length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">No administrative logs recorded.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
