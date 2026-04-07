import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DebugTeacher() {
  const { user, checkUserAuth } = useAuth();

  // Parse sport_coached like in Dashboard
  const getTeacherSports = () => {
    if (!user?.sport_coached) return [];
    if (typeof user.sport_coached === 'string') {
      try {
        const parsed = JSON.parse(user.sport_coached);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [user.sport_coached];
      }
    }
    return Array.isArray(user.sport_coached) ? user.sport_coached : [user.sport_coached];
  };

  const { data: memberships = [] } = useQuery({
    queryKey: ["memberships-debug", user?.email, user?.sport_coached],
    queryFn: () => api.entities.TeamMembership.list("-created_at", 500),
    enabled: !!user?.email,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["logs-debug", user?.email, user?.sport_coached],
    queryFn: () => api.entities.TrainingLog.list("-date", 100),
    enabled: !!user?.email,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements-debug", user?.email],
    queryFn: () => api.entities.Announcement.list("-created_at", 100),
    enabled: !!user?.email,
  });

  const teacherSports = getTeacherSports();
  const filteredMemberships = memberships.filter(m => teacherSports.includes(m.sport));
  const filteredLogs = logs.filter(l => teacherSports.includes(l.sport));
  const filteredAnnouncements = announcements.filter(a => teacherSports.includes(a.sport));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Teacher Debug Info</h1>
        <p className="text-muted-foreground">Check your teacher account data</p>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div><strong>Name:</strong> {user?.full_name}</div>
          <div><strong>Email:</strong> {user?.email}</div>
          <div><strong>Role:</strong> <Badge>{user?.role}</Badge></div>
          <div><strong>Teacher Status:</strong> <Badge variant={user?.teacher_status === 'approved' ? 'default' : 'secondary'}>{user?.teacher_status || 'unknown'}</Badge></div>
          <div><strong>Sport Coached (raw):</strong> {JSON.stringify(user?.sport_coached)}</div>
          <div><strong>Sport Coached (parsed):</strong> {teacherSports.join(", ") || "None"}</div>
          <div><strong>Sports Count:</strong> {teacherSports.length}</div>
        </CardContent>
      </Card>

      {/* Data Counts */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Team Memberships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredMemberships.length}</div>
            <div className="text-sm text-muted-foreground">Total: {memberships.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Training Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
            <div className="text-sm text-muted-foreground">Total: {logs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredAnnouncements.length}</div>
            <div className="text-sm text-muted-foreground">Total: {announcements.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expected Dashboard Values</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div>My Athletes: {filteredMemberships.length}</div>
              <div>Training Logs: {filteredLogs.length}</div>
              <div>Announcements: {filteredAnnouncements.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sample Data */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Team Memberships</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMemberships.slice(0, 5).map(m => (
            <div key={m.id} className="text-sm py-1 border-b">
              {m.user_name} - {m.sport}
            </div>
          ))}
          {filteredMemberships.length === 0 && <div className="text-sm text-muted-foreground">No memberships found for your sports</div>}
        </CardContent>
      </Card>

      <Button onClick={checkUserAuth}>Refresh User Data</Button>
    </div>
  );
}
