import { useState, useEffect } from "react";
import { appClient } from "@/lib/local-client";
import { useAuth } from "@/lib/AuthContext";
import { UserCog, Shield, Search, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ROLES = [
  "admin",
  "dispatcher",
  "main_mechanic",
  "driver",
];
const ROLE_COLORS = {
  admin: "bg-red-100 text-red-700",
  dispatcher: "bg-violet-100 text-violet-700",
  main_mechanic: "bg-amber-100 text-amber-700",
  driver: "bg-emerald-100 text-emerald-700",
};

export default function Users() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("driver");
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);

  const load = async () => {
    const u = await appClient.entities.User.list();
    setUsers(u);
  };

  useEffect(() => {
    if (role === "admin") load();
  }, [role]);

  if (role !== "admin")
    return (
    <div className="p-6 flex flex-col items-center justify-center h-full text-center">
      <Shield className="w-12 h-12 text-slate-300 mb-3" />
      <p className="text-slate-500">Admin only</p>
    </div>
  );

  const handleUpdateRole = async () => {
    await appClient.entities.User.update(editUser.id, { role: newRole });
    setEditUser(null);
    load();
  };

  const handleInvite = async () => {
    setInviting(true);
    try {
      await appClient.entities.User.create({
        email: inviteEmail,
        full_name: inviteEmail.split("@")[0],
        role: inviteRole,
      });
      await appClient.entities.Notification.create({
        type: "users",
        title: "New User Invited",
        message: `${inviteEmail} invited with role: ${inviteRole}.`,
        severity: "info",
        is_read: false,
        recipient_roles: "admin",
      });
      setShowInvite(false);
      setInviteEmail("");
    } finally {
      setInviting(false);
    }
  };

  const filtered = users.filter(
    (u) =>
      !search ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
        <h1 className="text-2xl font-bold text-slate-800">People</h1>
        <p className="text-sm text-slate-500">{users.length} users</p>
      </div>
      <Button
        className="bg-amber-500 hover:bg-amber-600 text-white"
        onClick={() => setShowInvite(true)}
      >
          <Mail className="w-4 h-4 mr-2" /> Add person
      </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search users..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase">
              <th className="text-left px-5 py-3">Person</th>
              <th className="text-left px-5 py-3">Role</th>
              <th className="text-left px-5 py-3">Added</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-800 text-sm">
                    {u.full_name || "—"}
                  </p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${ROLE_COLORS[u.role] || "bg-slate-100 text-slate-600"}`}
                  >
                    {u.role?.replace("_", " ") || "user"}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-slate-400">
                  {u.created_date
                    ? new Date(u.created_date).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-5 py-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setEditUser(u);
                      setNewRole(u.role || "driver");
                    }}
                  >
                  <UserCog className="w-3 h-3 mr-1" /> Change role
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center py-12 text-slate-400 text-sm">
            No users found
          </p>
        )}
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
          <DialogTitle>
              Change role — {editUser?.full_name || editUser?.email}
          </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <Label className="text-xs">Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setEditUser(null)}
            >
              Cancel
            </Button>
              <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleUpdateRole}
            >
              Save role
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add person</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowInvite(false)}
            >
              Cancel
            </Button>
              <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleInvite}
              disabled={inviting}
            >
              {inviting ? "Saving..." : "Save person"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
