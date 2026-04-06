import React, { useState } from "react";
import { api } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Users, Megaphone, Loader2, Trophy } from "lucide-react";
import { ALL_SPORTS, SPORT_ICONS, SPORT_COLORS } from "@/lib/sports-config";
import { format } from "date-fns";
import { toast } from "sonner";
import Leaderboard from "@/components/teams/Leaderboard";

export default function Teams() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annPriority, setAnnPriority] = useState("normal");
  const [annSports, setAnnSports] = useState([]); // 多选运动队
  const [selectedSport, setSelectedSport] = useState(null);

  const { data: memberships = [] } = useQuery({
    queryKey: ["memberships"],
    queryFn: () => {
      if (isTeacher) {
        // Handle both array and string formats for sport_coached
        const teacherSports = Array.isArray(user.sport_coached) 
          ? user.sport_coached 
          : user.sport_coached ? [user.sport_coached] : [];
        if (teacherSports.length === 0) return [];
        if (teacherSports.length === 1) {
          return api.entities.TeamMembership.filter({ sport: teacherSports[0] });
        }
        // For multiple sports, fetch all and filter client-side (backend will filter by IN clause)
        return api.entities.TeamMembership.filter({}, "-created_at", 500).then(data => 
          data.filter(m => teacherSports.includes(m.sport))
        );
      }
      if (isAdmin) return api.entities.TeamMembership.list("-created_at", 500);
      return api.entities.TeamMembership.filter({ user_email: user.email });
    },
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["team-announcements"],
    queryFn: () => {
      if (isTeacher) {
        const teacherSports = Array.isArray(user.sport_coached) 
          ? user.sport_coached 
          : user.sport_coached ? [user.sport_coached] : [];
        if (teacherSports.length === 0) return [];
        // Fetch all and filter client-side
        return api.entities.Announcement.list("-created_at", 100).then(data =>
          data.filter(a => teacherSports.includes(a.sport))
        );
      }
      return api.entities.Announcement.list("-created_at", 50);
    },
  });

  const createAnnouncement = useMutation({
    mutationFn: (data) => api.entities.Announcement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-announcements"] });
    },
  });

  const handlePostAnnouncement = async () => {
    if (!annTitle || !annContent) { toast.error("Please fill all fields"); return; }
    if (annSports.length === 0) { toast.error("Please select at least one sport"); return; }
    
    // 批量发布到选中的所有运动队
    const promises = annSports.map(sport => 
      createAnnouncement.mutateAsync({
        teacher_email: user.email,
        teacher_name: user.full_name,
        sport: sport,
        title: annTitle,
        content: annContent,
        priority: annPriority,
      })
    );
    
    await Promise.all(promises);
    toast.success(`Announcement posted to ${annSports.length} team(s)!`);
    setAnnouncementOpen(false);
    setAnnTitle(""); 
    setAnnContent(""); 
    setAnnPriority("normal");
    setAnnSports([]);
  };

  const mySports = isTeacher
    ? (Array.isArray(user.sport_coached) ? user.sport_coached : [user.sport_coached]).filter(Boolean)
    : isAdmin
      ? [...new Set(ALL_SPORTS)]
      : [...new Set(memberships.map(m => m.sport))];

  const activeSport = selectedSport || mySports[0] || "";
  const sportMembers = memberships.filter(m => m.sport === activeSport);
  const myAnnouncements = announcements.filter(a => mySports.includes(a.sport));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Teams</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isTeacher ? `Coaching ${user.sport_coached}` : `Member of ${mySports.length} team(s)`}
          </p>
        </div>
        {(isTeacher || isAdmin) && (
          <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
            <DialogTrigger asChild>
              <Button><Megaphone className="h-4 w-4 mr-2" />Post Announcement</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Team Announcement</DialogTitle>
                <DialogDescription>Post an announcement to one or more sports teams.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div><Label>Title</Label><Input value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="Announcement title" /></div>
                <div><Label>Content</Label><Textarea value={annContent} onChange={e => setAnnContent(e.target.value)} placeholder="Write your announcement..." rows={4} /></div>
                <div>
                  <Label className="mb-2 block">Select Sports</Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                    {ALL_SPORTS.map(sport => (
                      <button
                        key={sport}
                        type="button"
                        onClick={() => {
                          setAnnSports(prev => 
                            prev.includes(sport) 
                              ? prev.filter(s => s !== sport)
                              : [...prev, sport]
                          );
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
                          annSports.includes(sport)
                            ? `${SPORT_COLORS[sport]?.bg || "bg-primary"} text-white border-transparent`
                            : "bg-card border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {SPORT_ICONS[sport]} {sport}
                      </button>
                    ))}
                  </div>
                  {annSports.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Selected: {annSports.join(", ")}</p>
                  )}
                </div>
                <div><Label>Priority</Label>
                  <Select value={annPriority} onValueChange={setAnnPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handlePostAnnouncement} disabled={createAnnouncement.isPending || annSports.length === 0}>
                  {createAnnouncement.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Post to {annSports.length || 0} Team{annSports.length !== 1 ? "s" : ""}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Sport selector tabs for multi-sport students/admin */}
      {mySports.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {mySports.map(sport => (
            <button
              key={sport}
              onClick={() => setSelectedSport(sport)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                activeSport === sport
                  ? `${SPORT_COLORS[sport]?.bg || "bg-primary"} text-white border-transparent`
                  : "bg-card border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {SPORT_ICONS[sport]} {sport}
            </button>
          ))}
        </div>
      )}

      {activeSport && (
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members"><Users className="h-4 w-4 mr-1" />Members</TabsTrigger>
            <TabsTrigger value="leaderboard"><Trophy className="h-4 w-4 mr-1" />Leaderboard</TabsTrigger>
            <TabsTrigger value="announcements"><Megaphone className="h-4 w-4 mr-1" />Announcements</TabsTrigger>
          </TabsList>

          {/* Members tab */}
          <TabsContent value="members" className="mt-4">
            <p className="text-sm text-muted-foreground mb-3">{sportMembers.length} member{sportMembers.length !== 1 ? "s" : ""}</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {sportMembers.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {m.user_name?.[0] || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.user_name}</p>
                    <p className="text-xs text-muted-foreground">{m.user_email}</p>
                  </div>
                </div>
              ))}
              {sportMembers.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 col-span-2">No members in this team yet</p>
              )}
            </div>
          </TabsContent>

          {/* Leaderboard tab */}
          <TabsContent value="leaderboard" className="mt-4">
            <Leaderboard sport={activeSport} members={sportMembers} />
          </TabsContent>

          {/* Announcements tab */}
          <TabsContent value="announcements" className="mt-4 space-y-3">
            {myAnnouncements.filter(a => a.sport === activeSport).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No announcements for this team</p>
            )}
            {myAnnouncements.filter(a => a.sport === activeSport).map(ann => (
              <Card key={ann.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{ann.title}</h3>
                    {ann.priority === "urgent" && <Badge variant="destructive" className="text-[10px]">Urgent</Badge>}
                    {ann.priority === "important" && <Badge className="text-[10px] bg-chart-3 text-white">Important</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{ann.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">By {ann.teacher_name} · {format(new Date(ann.created_at), "MMM d, yyyy")}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {mySports.length === 0 && (
        <p className="text-center text-muted-foreground py-12">You haven't joined any teams. Visit your profile to join a team.</p>
      )}
    </div>
  );
}