import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { appClient } from "@/lib/local-client";
import { getNavItemsForRole, getRoleLabel } from "@/lib/role-access";
import {
  Truck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const pageMeta = {
  "/vehicles": {
    title: "Vehicles",
    description: "See vehicle photos, files, and mileage.",
  },
  "/garage-sessions": {
    title: "Garage",
    description: "See garage jobs, parts, and service notes.",
  },
  "/trips": {
    title: "Trips",
    description: "See trips, notes, and trip photos.",
  },
  "/drivers": {
    title: "Drivers",
    description: "See driver records and trip history.",
  },
  "/finance": {
    title: "Finance",
    description: "See costs and total spending.",
  },
  "/hr": {
    title: "HR",
    description: "Coming soon.",
  },
  "/client-management": {
    title: "Client management",
    description: "Coming soon.",
  },
  "/notifications": {
    title: "Alerts",
    description: "See the latest alerts.",
  },
};

const homePageMeta = {
  admin: {
    title: "Dashboard",
    description: "See all work in the system.",
  },
  driver: {
    title: "My trips",
    description: "See your trips, issues, and KM reports.",
  },
  dispatcher: {
    title: "Dispatch",
    description: "Add trips and assign drivers.",
  },
  main_mechanic: {
    title: "Garage",
    description: "Open jobs, log parts, and close repairs.",
  },
};

function getPageInfo(pathname, role) {
  if (pathname === "/") {
    return homePageMeta[role] || homePageMeta.admin;
  }
  if (pathname.startsWith("/vehicles/")) {
    return {
      title: "Vehicle",
      description: "See photos, files, and service history for one vehicle.",
    };
  }
  if (pathname.startsWith("/garage-sessions/")) {
    return {
      title: "Garage Job",
      description: "See work notes and files for this garage job.",
    };
  }
  if (pathname.startsWith("/trips/")) {
    return {
      title: "Trip",
      description: "See trip details, notes, and photos.",
    };
  }
  return pageMeta[pathname] || pageMeta["/"];
}

export default function Layout({ children }) {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navItems = getNavItemsForRole(currentUser?.role);

  useEffect(() => {
    appClient.entities.Notification.filter({ is_read: false })
      .then((items) => {
        setUnreadCount(items.length);
      })
      .catch(() => {});
  }, [location.pathname]);

  const pageInfo = getPageInfo(location.pathname, currentUser?.role);
  const role = getRoleLabel(currentUser?.role);

  const NavContent = ({ mobile = false }) => (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200/80 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_18px_40px_-22px_rgba(15,23,42,0.65)]">
            <Truck className="h-5 w-5" />
          </div>
          {(!collapsed || mobile) && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-600">
                Fleet app
              </p>
              <h1 className="text-base font-semibold text-slate-900">Work board</h1>
            </div>
          )}
        </div>
      </div>

      <div className="px-3 pt-4">
        {(!collapsed || mobile) && (
          <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 px-4 py-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-sky-700">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Today</span>
            </div>
            <p className="text-sm font-medium text-slate-900">
              Simple work view for {role || "your"} tasks.
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all ${
                active
                  ? "bg-slate-950 text-white shadow-[0_18px_36px_-24px_rgba(15,23,42,0.8)]"
                  : "text-slate-600 hover:bg-slate-100/90 hover:text-slate-900"
              }`}
            >
              <div
                className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                  active
                    ? "bg-white/14 text-white"
                    : "bg-slate-100 text-slate-500 group-hover:bg-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.path === "/notifications" && unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              {(!collapsed || mobile) && <span>{item.label}</span>}
              {(!collapsed || mobile) &&
                item.path === "/notifications" &&
                unreadCount > 0 && (
                  <Badge className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-red-500">
                    {unreadCount}
                  </Badge>
                )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200/80 p-3">
        <div
          className={`rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 ${collapsed && !mobile ? "flex justify-center" : ""}`}
        >
          {(!collapsed || mobile) && (
            <div className="mb-3">
              <p className="truncate text-sm font-semibold text-slate-900">
                {currentUser?.full_name || currentUser?.email}
              </p>
              <p className="mt-1 text-xs text-slate-500">{role || "Admin"}</p>
            </div>
          )}
          <Button
            onClick={() => appClient.auth.logout()}
            variant="ghost"
            className={`h-10 text-slate-600 hover:bg-white hover:text-red-600 ${collapsed && !mobile ? "w-10 px-0" : "w-full justify-start"}`}
          >
            <LogOut className="h-4 w-4" />
            {(!collapsed || mobile) && <span>Sign out</span>}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <div className="flex min-h-screen">
        <aside
          className={`relative hidden border-r border-slate-200/70 bg-white/88 backdrop-blur-xl transition-all duration-300 md:flex md:flex-col ${collapsed ? "w-[96px]" : "w-[288px]"}`}
        >
          <NavContent />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-4 top-8 hidden h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-950 hover:text-white md:flex"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/72 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
                    Fleet app
                  </p>
                  <h2 className="truncate text-xl font-semibold text-slate-950">
                    {pageInfo.title}
                  </h2>
                </div>
              </div>

              <div className="hidden items-center gap-3 md:flex">
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2 shadow-sm">
                  <p className="text-xs text-slate-500">Workspace</p>
                  <p className="text-sm font-semibold text-slate-900">
                    Live demo environment
                  </p>
                </div>
              </div>
            </div>
            <div className="px-4 pb-4 sm:px-6 lg:px-8">
              <p className="max-w-3xl text-sm text-slate-500">
                {pageInfo.description}
              </p>
            </div>
          </header>

          {mobileOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div
                className="absolute inset-0 bg-slate-950/22 backdrop-blur-sm"
                onClick={() => setMobileOpen(false)}
              />
              <div className="absolute left-0 top-0 h-full w-[300px] border-r border-slate-200/80 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-4">
                  <span className="text-sm font-semibold text-slate-900">
                    Navigation
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <NavContent mobile />
              </div>
            </div>
          )}

          <main className="min-w-0 flex-1">
            {children ?? <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
}
