import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { appClient } from "@/lib/local-client";
import {
  Truck,
  Wrench,
  Navigation,
  Users,
  Bell,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Outlet } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/vehicles", label: "Vehicles", icon: Truck },
  { path: "/garage-sessions", label: "Garage", icon: Wrench },
  { path: "/trips", label: "Dispatch", icon: Navigation },
  { path: "/drivers", label: "Drivers", icon: Users },
  { path: "/notifications", label: "Notifications", icon: Bell },
];

export default function Layout() {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    appClient.entities.Notification.filter({ is_read: false })
      .then((items) => {
        setUnreadCount(items.length);
      })
      .catch(() => {});
  }, [location.pathname]);

  const visibleItems = NAV_ITEMS;

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Truck className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-white text-sm tracking-wide">
            FleetOps
          </span>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                active
                  ? "bg-amber-500 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              <div className="relative flex-shrink-0">
                <Icon className="w-4 h-4" />
                {item.path === "/notifications" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && <span>{item.label}</span>}
              {!collapsed &&
                item.path === "/notifications" &&
                unreadCount > 0 && (
                  <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0">
                    {unreadCount}
                  </Badge>
                )}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-4 border-t border-slate-700">
        {!collapsed && (
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-slate-400 truncate">
              {currentUser?.full_name || currentUser?.email}
            </p>
            <span className="mt-1 inline-block text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
              Admin
            </span>
          </div>
        )}
        <button
          onClick={() => appClient.auth.logout()}
          className="flex items-center gap-3 w-full px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors text-sm"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-slate-900 transition-all duration-300 flex-shrink-0 ${collapsed ? "w-16" : "w-56"}`}
      >
        <NavContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 ml-1 hidden md:flex items-center justify-center w-5 h-5 bg-slate-700 text-slate-400 rounded-full hover:bg-amber-500 hover:text-white"
          style={{
            left: collapsed ? "52px" : "212px",
            transition: "left 0.3s",
          }}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
            <Truck className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm">FleetOps</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white"
        >
          {mobileOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-56 bg-slate-900 flex flex-col pt-14">
            <NavContent />
          </div>
          <div
            className="flex-1 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14">
        <Outlet />
      </main>
    </div>
  );
}
