import React from "react";
import { api } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, ClipboardList, Bell, Trophy, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { SPORT_ICONS, SPORT_COLORS } from "@/lib/sports-config";
import { Link } from "react-router-dom";

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-11 w-11 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin";

  const { data: memberships = [] } = useQuery({
    queryKey: ["memberships", user?.email],
    queryFn: () => isTeacher
      ? api.entities.TeamMembership.filter({ sport: user.sport_coached })
      : api.entities.TeamMembership.filter({ user_email: user.email }),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["logs-dash", user?.email],
    queryFn: () => isTeacher
      ? api.entities.TrainingLog.filter({ sport: user.sport_coached }, "-date", 10)
      : api.entities.TrainingLog.filter({ user_email: user.email }, "-date", 5),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings-dash"],
    queryFn: () => api.entities.VenueBooking.list("-date", 10),
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements-dash", user?.email],
    queryFn: () => {
      if (isTeacher) return api.entities.Announcement.filter({ teacher_email: user.email }, "-created_at", 5);
      return api.entities.Announcement.list("-created_at", 100);
    },
  });

  const upcomingBookings = bookings.filter(b => b.status === "approved" && new Date(b.date) >= new Date());
  const myTeamsSports = isTeacher ? [user.sport_coached] : memberships.map(m => m.sport);
  const relevantAnnouncements = announcements.filter(a => myTeamsSports.includes(a.sport));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.full_name?.split(" ")[0] || "there"}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {isTeacher ? `Coaching ${user.sport_coached}` : "Here's your sports overview"}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Trophy} label="My Teams" value={isTeacher ? memberships.length + " athletes" : myTeamsSports.length} color="bg-primary" />
        <StatCard icon={ClipboardList} label="Training Logs" value={logs.length} color="bg-accent" />
        <StatCard icon={CalendarDays} label="Upcoming Bookings" value={upcomingBookings.length} color="bg-chart-3" />
        <StatCard icon={Bell} label="Announcements" value={relevantAnnouncements.length} color="bg-chart-4" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Training Logs */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Training Logs</CardTitle>
              <Link to="/training" className="text-xs text-primary font-medium hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No training logs yet</p>}
            {logs.slice(0, 5).map(log => (
              <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <span className="text-xl">{SPORT_ICONS[log.sport]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {isTeacher ? log.user_name : log.sport} — {log.session_type}
                  </p>
                  <p className="text-xs text-muted-foreground">{format(new Date(log.date), "MMM d, yyyy")} · {log.duration} min</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Team Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {relevantAnnouncements.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No announcements</p>}
            {relevantAnnouncements.slice(0, 5).map(ann => (
              <div key={ann.id} className="p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{SPORT_ICONS[ann.sport]}</span>
                  <span className="text-sm font-medium">{ann.title}</span>
                  {ann.priority === "urgent" && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Urgent</Badge>}
                  {ann.priority === "important" && <Badge className="text-[10px] px-1.5 py-0 bg-chart-3 text-white">Important</Badge>}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{ann.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{ann.teacher_name} · {format(new Date(ann.created_at), "MMM d")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bookings */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Upcoming Venue Bookings</CardTitle>
            <Link to="/booking" className="text-xs text-primary font-medium hover:underline">View calendar</Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingBookings.length === 0 && <p className="text-sm text-muted-foreground py-4 col-span-full text-center">No upcoming bookings</p>}
            {upcomingBookings.slice(0, 6).map(b => (
              <div key={b.id} className="p-3 rounded-lg border border-border flex items-start gap-3">
                <div className={`h-2 w-2 rounded-full mt-1.5 ${SPORT_COLORS[b.sport]?.bg || "bg-muted"}`} />
                <div>
                  <p className="text-sm font-medium">{b.sport}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Clock className="h-3 w-3" />
                    {format(new Date(b.date), "MMM d")} at {b.time_slot}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {b.venue}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}