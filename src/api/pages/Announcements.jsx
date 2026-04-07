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
  const [selectedSports, setSelectedSports] = useState([]); // 多选运动队

  // Fetch announcements - teachers see all announcements for their sports, admin sees all
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements", user?.email, user?.sport_coached],
    queryFn: () => {
      if (isAdmin) {
        return api.entities.Announcement.list("-created_at", 100);
      }
      if (isTeacher) {
        const teacherSports = getTeacherSports(user);
        console.log('Announcements Page - Teacher sports:', teacherSports);
        if (teacherSports.length === 0) return [];
        // Fetch all and filter client-side by teacher's sports
        return api.entities.Announcement.list("-created_at", 100).then(data => {
          console.log('Announcements Page - All announcements from API:', data);
          const filtered = data.filter(a => teacherSports.includes(a.sport));
          console.log('Announcements Page - Filtered results:', filtered);
          
          // Debug matching details
          data.forEach((ann, index) => {
            const matches = teacherSports.includes(ann.sport);
            console.log(`Announcement ${index + 1}: "${ann.sport}" in teacher sports: ${matches}`);
          });
          
          return filtered;
        });
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

  // Debug: Log data for troubleshooting
  console.log('Announcements Debug - User:', user);
  console.log('Announcements Debug - Teacher sports:', isTeacher ? getTeacherSports(user) : 'N/A');
  console.log('Announcements Debug - Fetched announcements:', announcements);

  // Create announcement
  const createAnnouncement = useMutation({
    mutationFn: (data) => api.entities.Announcement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements", user?.email] });
      queryClient.invalidateQueries({ queryKey: ["announcements-dash"] });
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      setFormData({ title: "", content: "", sport: "", priority: "normal" });
      setIsCreateOpen(false);
      toast.success("公告已发布！");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || "发布失败，请重试");
    },
  });

  // Delete announcement
  const deleteAnnouncement = useMutation({
    mutationFn: (id) => api.entities.Announcement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements", user?.email] });
      queryClient.invalidateQueries({ queryKey: ["announcements-dash"] });
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      toast.success("公告已删除");
    },
  });

  const handleCreateClick = () => {
    if (!formData.title.trim()) {
      toast.error("请输入标题");
      return;
    }
    if (!formData.content.trim()) {
      toast.error("请输入内容");
      return;
    }
    if (selectedSports.length === 0) {
      toast.error("请选择至少一个运动项目");
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
        toast.success(`公告已发布到 ${selectedSports.length} 个运动项目！`);
        setFormData({ title: "", content: "", priority: "normal" });
        setSelectedSports([]);
        setIsCreateOpen(false);
      })
      .catch((error) => {
        toast.error(error?.response?.data?.error || "发布失败，请重试");
      });
  };

  const handleDelete = (id) => {
    if (window.confirm("确认删除这条公告吗？")) {
      deleteAnnouncement.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">公告管理</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? "管理所有公告" : "发布和管理您的公告"}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          发布新公告
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>发布新公告</DialogTitle>
            <DialogDescription>发布一条新的公告到选择的运动项目。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>标题</Label><Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="公告标题" /></div>
            <div><Label>内容</Label><Textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} placeholder="写公告内容..." rows={4} /></div>
            <div>
              <Label className="mb-2 block">选择运动项目</Label>
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
            <div><Label>优先级</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">普通</SelectItem>
                  <SelectItem value="important">重要</SelectItem>
                  <SelectItem value="urgent">紧急</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleCreateClick} disabled={createAnnouncement.isPending || selectedSports.length === 0}>
              {createAnnouncement.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              发布到 {selectedSports.length || 0} 个项目
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
            <p className="text-muted-foreground">还没有公告</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Debug Info */}
          <Card className="border-0 shadow-sm mb-4">
            <CardContent className="p-4">
              <div className="space-y-2">
                <h4 className="font-medium">Debug Information</h4>
                <div className="text-sm space-y-1">
                  <div>✅ Data fetched from API: {announcements.length} announcements</div>
                  <div>✅ Teacher sports: {getTeacherSports(user).length} sports</div>
                  <div>✅ Filter should work: Yes</div>
                  <div className="text-blue-600 font-medium">🔍 If you see announcements above, filtering works!</div>
                  <div className="text-red-600 font-medium">❌ If you see "还没有公告" below, there's a UI issue</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
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
                          {ann.priority === "urgent" ? "🔴 紧急" : ann.priority === "important" ? "重要" : "普通"}
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
        </>
      )}
    </div>
  );
}
