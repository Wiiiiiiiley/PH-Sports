import React, { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SPORT_ICONS } from "@/lib/sports-config";

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

  // Additional debug info
  console.log('Debug Teacher - Raw sport_coached:', user?.sport_coached);
  console.log('Debug Teacher - Raw sport_coached type:', typeof user?.sport_coached);
  console.log('Debug Teacher - All memberships:', memberships);
  console.log('Debug Teacher - All announcements:', announcements);
  console.log('Debug Teacher - All logs:', logs);

  // Test direct API call for announcements
  useEffect(() => {
    const testAnnouncements = async () => {
      try {
        const allAnnouncements = await api.entities.Announcement.list("-created_at", 100);
        console.log('Debug Teacher - Direct API call - all announcements:', allAnnouncements);
        
        const teacherSports = getTeacherSports();
        console.log('Debug Teacher - Teacher sports for filtering:', teacherSports);
        
        const filtered = allAnnouncements.filter(a => teacherSports.includes(a.sport));
        console.log('Debug Teacher - Filtered announcements:', filtered);
        
        // Debug sport matching
        console.log('Debug Teacher - Sport matching details:');
        allAnnouncements.forEach((ann, index) => {
          const matches = teacherSports.includes(ann.sport);
          console.log(`  Announcement ${index + 1}: "${ann.sport}" matches: ${matches}`);
          console.log(`    Available sports:`, teacherSports);
          console.log(`    Exact match check:`, teacherSports.some(sport => sport === ann.sport));
        });
      } catch (error) {
        console.error('Debug Teacher - API call error:', error);
      }
    };
    
    if (user?.email) {
      testAnnouncements();
    }
  }, [user?.email]);

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

      {/* Detailed Team Info */}
      <Card>
        <CardHeader>
          <CardTitle>All Team Members by Sport</CardTitle>
        </CardHeader>
        <CardContent>
          {teacherSports.length === 0 ? (
            <div className="text-sm text-muted-foreground">No sports assigned</div>
          ) : (
            <div className="space-y-4">
              {teacherSports.map(sport => {
                const sportMembers = memberships.filter(m => m.sport === sport);
                return (
                  <div key={sport} className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2">{SPORT_ICONS[sport] || '🏆'} {sport} ({sportMembers.length} members)</h4>
                    {sportMembers.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No members in this sport</div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-2">
                        {sportMembers.map(m => (
                          <div key={m.id} className="text-sm p-2 bg-secondary/50 rounded">
                            <div className="font-medium">{m.user_name}</div>
                            <div className="text-xs text-muted-foreground">{m.user_email}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
