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

  // Fetch announcements - teacher sees only their own, admin sees all
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements", user?.email],
    queryFn: () => {
      if (isAdmin) {
        return api.entities.Announcement.list("-created_at", 100);
      }
      return api.entities.Announcement.filter({ teacher_email: user.email }, "-created_at", 100);
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

  // Get available sports for current user
  const availableSports = isAdmin ? ALL_SPORTS : [user?.sport_coached].filter(Boolean);

  const handleCreateClick = () => {
    if (!formData.title.trim()) {
      toast.error("请输入标题");
      return;
    }
    if (!formData.content.trim()) {
      toast.error("请输入内容");
      return;
    }
    if (!formData.sport) {
      toast.error("请选择运动项目");
      return;
    }

    createAnnouncement.mutate({
      title: formData.title.trim(),
      content: formData.content.trim(),
      sport: formData.sport,
      priority: formData.priority,
      teacher_email: user.email,
      created_at: new Date().toISOString(),
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
            {/* Title */}
            <div>
              <Label htmlFor="title">标题 *</Label>
              <Input
                id="title"
                placeholder="输入公告标题"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.title.length}/100
              </p>
            </div>

            {/* Content */}
            <div>
              <Label htmlFor="content">内容 *</Label>
              <Textarea
                id="content"
                placeholder="输入公告内容..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={5}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.content.length}/500
              </p>
            </div>

            {/* Sport Selection */}
            <div>
              <Label htmlFor="sport">运动项目 *</Label>
              <Select value={formData.sport} onValueChange={(value) => setFormData({ ...formData, sport: value })}>
                <SelectTrigger id="sport">
                  <SelectValue placeholder="选择运动项目" />
                </SelectTrigger>
                <SelectContent>
                  {availableSports.map((sport) => (
                    <SelectItem key={sport} value={sport}>
                      {sport}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <Label htmlFor="priority">优先级</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">普通</SelectItem>
                  <SelectItem value="urgent">紧急</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleCreateClick}
                disabled={createAnnouncement.isPending}
              >
                {createAnnouncement.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    发布中...
                  </>
                ) : (
                  "发布"
                )}
              </Button>
            </div>
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
                            : "bg-blue-100 text-blue-700"
                        )}
                      >
                        {ann.priority === "urgent" ? "🔴 紧急" : "普通"}
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
