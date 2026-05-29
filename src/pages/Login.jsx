import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  LogIn,
  Navigation,
  Shield,
  Truck,
  Wrench,
} from "lucide-react";
import { appClient } from "@/lib/local-client";
import { Button } from "@/components/ui/button";
import { getSectionImage } from "@/lib/section-images";
import { makePreviewDataUrl } from "@/lib/media";

const ROLE_ORDER = ["admin", "driver", "dispatcher", "main_mechanic"];

const ROLE_COPY = {
  admin: {
    icon: Shield,
    title: "Admin",
    text: "Can see and do everything.",
  },
  driver: {
    icon: Navigation,
    title: "Driver",
    text: "Can see only own trips, issues, and KM reports.",
  },
  dispatcher: {
    icon: Truck,
    title: "Dispatcher",
    text: "Can add trips and assign drivers.",
  },
  main_mechanic: {
    icon: Wrench,
    title: "Main mechanic",
    text: "Can open garage jobs, log parts, and close repairs.",
  },
};

export default function Login() {
  const [users, setUsers] = useState([]);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    appClient.entities.User.list("-created_date").then(setUsers).catch(() => {});
  }, []);

  const usersByRole = useMemo(() => {
    const map = new Map();
    users.forEach((user) => {
      if (!map.has(user.role)) {
        map.set(user.role, user);
      }
    });
    return map;
  }, [users]);

  const handleLogin = async (user) => {
    if (!user) return;
    setBusyId(user.id);
    await appClient.auth.signIn(user.id);
  };

  const heroImage = getSectionImage("dashboard");

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_42%,#eef5ff_100%)] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex items-center">
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 shadow-sm">
              <Truck className="h-3.5 w-3.5" />
              Choose a role to continue
            </div>
            <h1 className="text-4xl font-bold tracking-[-0.06em] text-slate-950 sm:text-5xl">
              Pick the lane you work in and keep goods moving.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-500">
              Each account mirrors a real logistics operation, from dispatch and garage
              work to driver records and trip tracking.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {ROLE_ORDER.map((role) => {
                const user = usersByRole.get(role);
                const Copy = ROLE_COPY[role];
                const Icon = Copy.icon;

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleLogin(user)}
                    disabled={!user || busyId === user.id}
                    className="group rounded-[1.5rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-34px_rgba(15,23,42,0.16)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <LogIn className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-900">
                      {Copy.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{Copy.text}</p>
                    <p className="mt-3 text-xs text-slate-400">
                      {user ? `${user.full_name} - ${user.email}` : "No demo account yet"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <div className="w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_32px_100px_-48px_rgba(15,23,42,0.28)]">
            <div className="overflow-hidden rounded-[1.5rem]">
              <img
                src={heroImage.src}
                alt={heroImage.alt}
                onError={(event) => {
                  event.currentTarget.src = makePreviewDataUrl({
                    title: heroImage.title,
                    subtitle: heroImage.subtitle,
                    seed: "login-hero",
                  });
                }}
                className="h-[260px] w-full object-cover sm:h-[340px]"
              />
            </div>
            <div className="space-y-3 px-1 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                  Live logistics view
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-950">
                  One app. Clear work lanes.
                </h2>
              </div>
              {[
                "Dispatch tracks client loads from pickup to delivery.",
                "Garage work keeps truck repairs, parts, and notes together.",
                "Drivers see trips, KM reports, and the jobs tied to their truck.",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                  <p className="text-sm leading-6 text-slate-600">{item}</p>
                </div>
              ))}
              <Button asChild variant="outline" className="h-11 w-full rounded-full">
                <Link to="/">Back to home</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
