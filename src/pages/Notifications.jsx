import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/lib/local-client";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "../components/StatusBadge";
import { format } from "date-fns";

const TYPE_LABELS = {
  garage: "Garage",
  dispatch: "Dispatch",
  vehicle: "Vehicle",
  users: "Users",
  maintenance: "Maintenance",
};
const TYPE_COLORS = {
  garage: "bg-amber-100 text-amber-700",
  dispatch: "bg-violet-100 text-violet-700",
  vehicle: "bg-blue-100 text-blue-700",
  users: "bg-slate-100 text-slate-700",
  maintenance: "bg-red-100 text-red-700",
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  const load = async () => {
    const items = await appClient.entities.Notification.list("-created_date", 100);
    setNotifications(items);
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (notif) => {
    await appClient.entities.Notification.update(notif.id, { is_read: true });
    load();
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    await Promise.all(
        unread.map((n) =>
        appClient.entities.Notification.update(n.id, { is_read: true }),
      ),
    );
    load();
  };

  const types = [
    "all",
    "maintenance",
    "garage",
    "dispatch",
    "vehicle",
    "users",
  ];
  const filtered =
    activeTab === "all"
      ? notifications
      : notifications.filter((n) => n.type === activeTab);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getLink = (notif) => {
    if (notif.related_type === "Trip") return `/trips/${notif.related_id}`;
    if (notif.related_type === "ServiceSession")
      return `/garage-sessions/${notif.related_id}`;
    return null;
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
          <p className="text-sm text-slate-500">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto mb-4 gap-1">
          {types.map((t) => {
            const count =
              t === "all"
                ? notifications.filter((n) => !n.is_read).length
                : notifications.filter((n) => n.type === t && !n.is_read)
                    .length;
            return (
              <TabsTrigger key={t} value={t} className="capitalize text-xs">
                {t === "all" ? "All" : TYPE_LABELS[t]}
                {count > 0 && (
                  <span className="ml-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {types.map((t) => (
          <TabsContent key={t} value={t}>
            <div className="space-y-2">
              {(t === "all"
                ? notifications
                : notifications.filter((n) => n.type === t)
              ).length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No notifications</p>
                </div>
              ) : (
                (t === "all"
                  ? notifications
                  : notifications.filter((n) => n.type === t)
                ).map((notif) => {
                  const link = getLink(notif);
                  const Inner = (
                    <div
                      className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-colors ${!notif.is_read ? "border-blue-200 bg-blue-50/30" : "border-slate-100"}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notif.severity === "critical" ? "bg-red-500" : notif.severity === "warning" ? "bg-amber-500" : "bg-blue-400"} ${notif.is_read ? "opacity-30" : ""}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[notif.type] || "bg-slate-100 text-slate-600"}`}
                          >
                            {TYPE_LABELS[notif.type] || notif.type}
                          </span>
                          <StatusBadge status={notif.severity} />
                          {notif.vehicle_plate && (
                            <span className="text-xs text-slate-400 font-mono">
                              {notif.vehicle_plate}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-800">
                          {notif.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {notif.message}
                        </p>
                        <p className="text-xs text-slate-300 mt-1">
                          {notif.created_date
                            ? format(
                                new Date(notif.created_date),
                                "MMM d, yyyy HH:mm",
                              )
                            : ""}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markRead(notif);
                          }}
                          className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-emerald-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                  return link ? (
                    <Link key={notif.id} to={link}>
                      {Inner}
                    </Link>
                  ) : (
                    <div key={notif.id}>{Inner}</div>
                  );
                })
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
