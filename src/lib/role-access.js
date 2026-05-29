import {
  Banknote,
  Bell,
  FileText,
  LayoutDashboard,
  Navigation,
  Truck,
  Users,
  Wrench,
} from "lucide-react";

const ROLE_LABELS = {
  admin: "Admin",
  driver: "Driver",
  dispatcher: "Dispatcher",
  main_mechanic: "Main mechanic",
};

const ROLE_HOMES = {
  admin: "/",
  driver: "/",
  dispatcher: "/",
  main_mechanic: "/",
};

const NAV_ITEMS = [
  { path: "/", label: "Home", icon: LayoutDashboard, roles: Object.keys(ROLE_LABELS) },
  { path: "/vehicles", label: "Vehicles", icon: Truck, roles: ["admin", "main_mechanic"] },
  { path: "/garage-sessions", label: "Garage", icon: Wrench, roles: ["admin", "main_mechanic"] },
  { path: "/trips", label: "Trips", icon: Navigation, roles: ["admin", "dispatcher", "driver"] },
  { path: "/drivers", label: "Drivers", icon: Users, roles: ["admin"] },
  { path: "/finance", label: "Finance", icon: Banknote, roles: ["admin"] },
  { path: "/hr", label: "HR", icon: Users, roles: ["admin"] },
  { path: "/client-management", label: "Client management", icon: FileText, roles: ["admin"] },
  { path: "/notifications", label: "Alerts", icon: Bell, roles: ["admin"] },
];

const ROUTE_RULES = [
  { match: "/", roles: Object.keys(ROLE_LABELS) },
  { match: "/vehicles", roles: ["admin", "main_mechanic"] },
  { match: "/vehicles/", roles: ["admin", "main_mechanic"] },
  { match: "/garage-sessions", roles: ["admin", "main_mechanic"] },
  { match: "/garage-sessions/", roles: ["admin", "main_mechanic"] },
  { match: "/trips", roles: ["admin", "dispatcher", "driver"] },
  { match: "/trips/", roles: ["admin", "dispatcher", "driver"] },
  { match: "/drivers", roles: ["admin"] },
  { match: "/finance", roles: ["admin"] },
  { match: "/hr", roles: ["admin"] },
  { match: "/client-management", roles: ["admin"] },
  { match: "/notifications", roles: ["admin"] },
];

const normalizeRole = (role) => {
  if (role === "sub_mechanic") {
    return "main_mechanic";
  }

  return role || "admin";
};

export const getRoleLabel = (role) => ROLE_LABELS[normalizeRole(role)] || "User";

export const getRoleHome = (role) => ROLE_HOMES[normalizeRole(role)] || "/";

export const getNavItemsForRole = (role) => {
  const nextRole = normalizeRole(role);
  return NAV_ITEMS.filter((item) => item.roles.includes(nextRole));
};

export const canAccessPath = (role, pathname) => {
  const nextRole = normalizeRole(role);
  const rule = ROUTE_RULES.find((item) =>
    item.match.endsWith("/") ? pathname.startsWith(item.match) : pathname === item.match,
  );

  if (!rule) {
    return true;
  }

  return rule.roles.includes(nextRole);
};

export const roleHasAny = (role, roles) => roles.includes(normalizeRole(role));
