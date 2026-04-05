import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { api } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard, Users, ClipboardList, CalendarDays,
  Menu, X, LogOut, CheckSquare, Trophy, UserCircle, ShieldCheck, Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const studentNav = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "My Teams", path: "/teams", icon: Users },
  { label: "Training Log", path: "/training", icon: ClipboardList },
  { label: "Venue Booking", path: "/booking", icon: CalendarDays },
  { label: "My Profile", path: "/profile", icon: UserCircle },
];

const teacherNav = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "My Teams", path: "/teams", icon: Users },
  { label: "Training Logs", path: "/training", icon: ClipboardList },
  { label: "Manage Requests", path: "/requests", icon: CheckSquare },
  { label: "Announcements", path: "/announcements", icon: Megaphone },
  { label: "Venue Booking", path: "/booking", icon: CalendarDays },
];

const adminNav = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Admin Panel", path: "/admin", icon: ShieldCheck },
  { label: "Admin Management", path: "/admin/panel", icon: Users },
  { label: "Teams", path: "/teams", icon: Users },
  { label: "Training Logs", path: "/training", icon: ClipboardList },
  { label: "Announcements", path: "/announcements", icon: Megaphone },
  { label: "Venue Booking", path: "/booking", icon: CalendarDays },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const role = user?.role || "student";

  const navItems = role === "teacher" ? teacherNav : role === "admin" ? adminNav : studentNav;

  const handleLogout = () => logout();

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 h-14 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <span className="font-bold text-foreground">SportSync</span>
        </div>
        <div className="w-9" />
      </header>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-300",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-lg leading-tight">SportSync</h1>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-foreground truncate">{user?.full_name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}