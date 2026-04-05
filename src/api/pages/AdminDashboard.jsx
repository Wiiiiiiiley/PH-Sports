import React, { useState } from "react";
import { api } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Users, BookOpen, CalendarDays, Megaphone, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { SPORT_ICONS } from "@/lib/sports-config";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [rejectComment, setRejectComment] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null);

  const { data: registrations = [] } = useQuery({
    queryKey: ["teacher-registrations"],
    queryFn: () => api.entities.TeacherRegistration.list("-created_date", 100),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => api.entities.User.list("-created_date", 200),
  });

  const { data: allBookings = [] } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => api.entities.VenueBooking.list("-created_date", 200),
  });

  const { data: allAnnouncements = [] } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: () => api.entities.Announcement.list("-created_date", 100),
  });

  const { data: allMemberships = [] } = useQuery({
    queryKey: ["admin-memberships"],
    queryFn: () => api.entities.TeamMembership.list("-created_date", 500),
  });

  const updateRegistration = useMutation({
    mutationFn: ({ id, status, comment }) => api.entities.TeacherRegistration.update(id, { status, admin_comment: comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-registrations"] });
      setRejectTarget(null);
      setRejectComment("");
    },
  });

  const deleteBooking = useMutation({
    mutationFn: (id) => api.entities.VenueBooking.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }),
  });

  const deleteAnnouncement = useMutation({
    mutationFn: (id) => api.entities.Announcement.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }),
  });

  const deleteMembership = useMutation({
    mutationFn: (id) => api.entities.TeamMembership.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-memberships"] }),
  });

  const updateBookingStatus = useMutation({
    mutationFn: ({ id, status }) => api.entities.VenueBooking.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }),
  });

  const handleApprove = (reg) => {
    updateRegistration.mutate({ id: reg.id, status: "approved", comment: "" });
    toast.success(`${reg.user_name} approved as teacher`);
  };

  const handleReject = () => {
    updateRegistration.mutate({ id: rejectTarget.id, status: "rejected", comment: rejectComment });
    toast.success("Registration rejected");
  };

  const pending = registrations.filter(r => r.status === "pending");
  const processed = registrations.filter(r => r.status !== "pending");

  const stats = [
    { label: "Total Users", value: allUsers.length, icon: Users, color: "bg-primary" },
    { label: "Teacher Requests", value: pending.length, icon: BookOpen, color: "bg-yellow-500" },
    { label: "Bookings", value: allBookings.length, icon: CalendarDays, color: "bg-accent" },
    { label: "Announcements", value: allAnnouncements.length, icon: Megaphone, color: "bg-chart-4" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage the entire SportSync system</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${s.color} flex items-center justify-center`}>
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="registrations">
        <TabsList className="flex-wrap">
          <TabsTrigger value="registrations">Teacher Requests {pending.length > 0 && `(${pending.length})`}</TabsTrigger>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="memberships">Team Memberships</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>

        {/* Teacher Registrations */}
        <TabsContent value="registrations" className="mt-4 space-y-3">
          {pending.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-yellow-700">Pending Approval</h3>
              {pending.map(reg => (
                <Card key={reg.id} className="border-0 shadow-sm mb-2">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{reg.user_name}</p>
                      <p className="text-xs text-muted-foreground">{reg.user_email} · Staff ID: {reg.staff_id}</p>
                      <p className="text-xs text-muted-foreground">{SPORT_ICONS[reg.sport_coached]} Wants to coach {reg.sport_coached}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(reg.created_date), "MMM d, yyyy")}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={() => handleApprove(reg)}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="h-8" onClick={() => setRejectTarget(reg)}>
                        <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {processed.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Processed</h3>
              {processed.map(reg => (
                <Card key={reg.id} className="border-0 shadow-sm mb-2 opacity-70">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{reg.user_name} — {SPORT_ICONS[reg.sport_coached]} {reg.sport_coached}</p>
                      <p className="text-xs text-muted-foreground">{reg.user_email}</p>
                    </div>
                    <Badge className={cn(
                      reg.status === "approved" && "bg-green-100 text-green-700",
                      reg.status === "rejected" && "bg-red-100 text-red-700",
                    )}>{reg.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {registrations.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No teacher registrations yet</p>}
        </TabsContent>

        {/* All Users */}
        <TabsContent value="users" className="mt-4 space-y-2">
          {allUsers.map(u => (
            <Card key={u.id} className="border-0 shadow-sm">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Badge variant="secondary" className="capitalize text-xs">{u.role || "—"}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Team Memberships */}
        <TabsContent value="memberships" className="mt-4 space-y-2">
          {allMemberships.map(m => (
            <Card key={m.id} className="border-0 shadow-sm">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{m.user_name}</p>
                  <p className="text-xs text-muted-foreground">{m.user_email} · {SPORT_ICONS[m.sport]} {m.sport}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteMembership.mutate(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Bookings */}
        <TabsContent value="bookings" className="mt-4 space-y-2">
          {allBookings.map(b => (
            <Card key={b.id} className="border-0 shadow-sm">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{SPORT_ICONS[b.sport]} {b.sport} — {b.venue}</p>
                  <p className="text-xs text-muted-foreground">{b.booked_by_name} · {format(new Date(b.date), "MMM d, yyyy")} at {b.time_slot}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={cn(
                    "text-[10px]",
                    b.status === "approved" && "bg-green-100 text-green-700",
                    b.status === "pending" && "bg-yellow-100 text-yellow-700",
                    b.status === "rejected" && "bg-red-100 text-red-700",
                  )}>{b.status}</Badge>
                  {b.status === "pending" && (
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs" onClick={() => updateBookingStatus.mutate({ id: b.id, status: "approved" })}>Approve</Button>
                      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => updateBookingStatus.mutate({ id: b.id, status: "rejected" })}>Reject</Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => deleteBooking.mutate(b.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Announcements */}
        <TabsContent value="announcements" className="mt-4 space-y-2">
          {allAnnouncements.map(a => (
            <Card key={a.id} className="border-0 shadow-sm">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{SPORT_ICONS[a.sport]} {a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.teacher_name} · {format(new Date(a.created_date), "MMM d, yyyy")}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteAnnouncement.mutate(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Registration</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Rejecting <strong>{rejectTarget?.user_name}</strong>'s teacher registration.</p>
          <div className="space-y-2">
            <Input placeholder="Reason (optional)" value={rejectComment} onChange={e => setRejectComment(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleReject} disabled={updateRegistration.isPending}>
              {updateRegistration.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}