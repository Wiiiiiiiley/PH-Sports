import React, { useState } from "react";
import { api } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Plus, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ALL_SPORTS, SPORT_COLORS, SPORT_ICONS } from "@/lib/sports-config";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getTeacherSports } from "@/lib/teacherUtils";

export default function Announcements() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    sport: "",
    priority: "normal",
  });
  const [selectedSports, setSelectedSports] = useState([]); // 多选Team

  // Fetch announcements - teachers see all announcements for their sports, admin sees all
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements", user?.email, JSON.stringify(user?.sport_coached || [])],
    queryFn: () => {
      if (isAdmin) {
        return api.entities.Announcement.list("-created_at", 100);
      }
      if (isTeacher) {
        const teacherSports = getTeacherSports(user);
        if (teacherSports.length === 0) return [];
        // Fetch all and filter client-side by teacher's sports
        return api.entities.Announcement.list("-created_at", 100).then(data =>
          data.filter(a => teacherSports.includes(a.sport))
        );
      }
      // Students see announcements for their teams
      return api.entities.TeamMembership.filter({ user_email: user.email }).then(memberships => {
        const userSports = memberships.map(m => m.sport);
        return api.entities.Announcement.list("-created_at", 100).then(data =>
          data.filter(a => userSports.includes(a.sport))
        );
      });
    },
  });

  
  // Create announcement
  const createAnnouncement = useMutation({
    mutationFn: (data) => api.entities.Announcement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements", user?.email] });
      queryClient.invalidateQueries({ queryKey: ["announcements-dash"] });
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      setFormData({ title: "", content: "", sport: "", priority: "normal" });
      setIsCreateOpen(false);
      toast.success("Announcement已Post！");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || "PostFailed，Please重试");
    },
  });

  // Delete announcement
  const deleteAnnouncement = useMutation({
    mutationFn: (id) => api.entities.Announcement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements", user?.email] });
      queryClient.invalidateQueries({ queryKey: ["announcements-dash"] });
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      toast.success("Announcement已Delete");
    },
  });

  const handleCreateClick = () => {
    if (!formData.title.trim()) {
      toast.error("Please enterTitle");
      return;
    }
    if (!formData.content.trim()) {
      toast.error("Please enterContent");
      return;
    }
    if (selectedSports.length === 0) {
      toast.error("Please select至少一个Sport项目");
      return;
    }

    // Create announcements for each selected sport
    const promises = selectedSports.map(sport => 
      createAnnouncement.mutateAsync({
        title: formData.title.trim(),
        content: formData.content.trim(),
        sport,
        priority: formData.priority,
        teacher_email: user.email,
        created_at: new Date().toISOString(),
      })
    );

    Promise.all(promises)
      .then(() => {
        toast.success(`Announcement已Post到 ${selectedSports.length} 个Sport项目！`);
        setFormData({ title: "", content: "", priority: "normal" });
        setSelectedSports([]);
        setIsCreateOpen(false);
      })
      .catch((error) => {
        toast.error(error?.response?.data?.error || "PostFailed，Please重试");
      });
  };

  const handleDelete = (id) => {
    if (window.confirm("确认Delete这条Announcement吗？")) {
      deleteAnnouncement.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">AnnouncementAdmin</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? "Admin所有Announcement" : "Post和Admin您的Announcement"}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Post新Announcement
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Post新Announcement</DialogTitle>
            <DialogDescription>Post一条新的Announcement到选择的Sport项目。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="AnnouncementTitle" /></div>
            <div><Label>Content</Label><Textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} placeholder="写AnnouncementContent..." rows={4} /></div>
            <div>
              <Label className="mb-2 block">选择Sport项目</Label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 border rounded-md bg-background">
                {ALL_SPORTS.map(sport => (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => {
                      setSelectedSports(prev => 
                        prev.includes(sport) 
                          ? prev.filter(s => s !== sport)
                          : [...prev, sport]
                      );
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition-all ${
                      selectedSports.includes(sport)
                        ? `${SPORT_COLORS[sport]?.bg || "bg-primary"} text-white border-transparent shadow-sm`
                        : "bg-white border-gray-300 text-gray-700 hover:border-primary/50 hover:bg-gray-50"
                    }`}
                  >
                    {SPORT_ICONS[sport]} {sport}
                  </button>
                ))}
              </div>
              {selectedSports.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">已选择: {selectedSports.join(", ")}</p>
              )}
            </div>
            <div><Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleCreateClick} disabled={createAnnouncement.isPending || selectedSports.length === 0}>
              {createAnnouncement.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Post到 {selectedSports.length || 0} 个项目
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Announcements Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : announcements.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">还没有Announcement</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {announcements.map((ann) => (
            <Card key={ann.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">
                        {SPORT_ICONS[ann.sport] || "📋"}
                      </span>
                      <h3 className="text-base font-semibold truncate">
                        {ann.title}
                      </h3>
                      <Badge
                        className={cn(
                          "text-[10px] shrink-0",
                          ann.priority === "urgent"
                            ? "bg-red-100 text-red-700"
                            : ann.priority === "important"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                        )}
                      >
                        {ann.priority === "urgent" ? "🔴 Urgent" : ann.priority === "important" ? "Important" : "Normal"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {ann.content}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-white",
                        SPORT_COLORS[ann.sport]?.bg || "bg-muted"
                      )}>
                        {ann.sport}
                      </span>
                      <span>
                        {format(new Date(ann.created_at), "MMM d, yyyy · HH:mm")}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(ann.id)}
                    disabled={deleteAnnouncement.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
