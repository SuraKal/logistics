import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import Layout from "./components/Layout";
import RoleGate from "./components/RoleGate";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const VehicleDetail = lazy(() => import("./pages/VehicleDetail"));
const GarageSessions = lazy(() => import("./pages/GarageSessions"));
const ServiceSessionDetail = lazy(() => import("./pages/ServiceSessionDetail"));
const Trips = lazy(() => import("./pages/Trips"));
const TripDetail = lazy(() => import("./pages/TripDetail"));
const Drivers = lazy(() => import("./pages/Drivers"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Finance = lazy(() => import("./pages/Finance"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));

function RouteLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800"></div>
    </div>
  );
}

function HomeRoute() {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return <RouteLoader />;
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <Layout>
      <RoleGate>
        <Dashboard />
      </RoleGate>
    </Layout>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route element={<Layout />}>
            <Route
              path="/vehicles"
              element={
                <RoleGate allowedRoles={["admin", "main_mechanic"]}>
                  <Vehicles />
                </RoleGate>
              }
            />
            <Route
              path="/vehicles/:id"
              element={
                <RoleGate allowedRoles={["admin", "main_mechanic"]}>
                  <VehicleDetail />
                </RoleGate>
              }
            />
            <Route
              path="/garage-sessions"
              element={
                <RoleGate allowedRoles={["admin", "main_mechanic"]}>
                  <GarageSessions />
                </RoleGate>
              }
            />
            <Route
              path="/garage-sessions/:id"
              element={
                <RoleGate allowedRoles={["admin", "main_mechanic"]}>
                  <ServiceSessionDetail />
                </RoleGate>
              }
            />
            <Route
              path="/trips"
              element={
                <RoleGate allowedRoles={["admin", "dispatcher", "driver"]}>
                  <Trips />
                </RoleGate>
              }
            />
            <Route
              path="/trips/:id"
              element={
                <RoleGate allowedRoles={["admin", "dispatcher", "driver"]}>
                  <TripDetail />
                </RoleGate>
              }
            />
            <Route
              path="/drivers"
              element={
                <RoleGate allowedRoles={["admin"]}>
                  <Drivers />
                </RoleGate>
              }
            />
            <Route
              path="/finance"
              element={
                <RoleGate allowedRoles={["admin"]}>
                  <Finance />
                </RoleGate>
              }
            />
            <Route
              path="/hr"
              element={
                <RoleGate allowedRoles={["admin"]}>
                  <ComingSoon title="HR" />
                </RoleGate>
              }
            />
            <Route
              path="/client-management"
              element={
                <RoleGate allowedRoles={["admin"]}>
                  <ComingSoon title="Client management" />
                </RoleGate>
              }
            />
            <Route
              path="/notifications"
              element={
                <RoleGate allowedRoles={["admin"]}>
                  <Notifications />
                </RoleGate>
              }
            />
            <Route path="*" element={<PageNotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
