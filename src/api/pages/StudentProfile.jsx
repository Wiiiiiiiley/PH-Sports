import React, { useState } from "react";
import { api } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Camera, Plus, X, Save } from "lucide-react";
import { ALL_SPORTS, SPORT_ICONS, SPORT_COLORS } from "@/lib/sports-config";
import { toast } from "sonner";

export default function StudentProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editName, setEditName] = useState(user?.full_name || "");
  const [editGrade, setEditGrade] = useState(user?.grade || "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ["profile-memberships", user?.email],
    queryFn: () => api.entities.TeamMembership.filter({ user_email: user.email }),
  });

  const addMembership = useMutation({
    mutationFn: (sport) => api.entities.TeamMembership.create({
      user_email: user.email,
      user_name: user.full_name,
      sport,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-memberships"] });
      toast.success("Joined team!");
    },
  });

  const removeMembership = useMutation({
    mutationFn: (id) => api.entities.TeamMembership.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-memberships"] });
      toast.success("Left team");
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await api.integrations.Core.UploadFile({ file });
    await api.auth.updateMe({ profile_photo_url: file_url });
    queryClient.invalidateQueries({ queryKey: ["user"] });
    setUploadingPhoto(false);
    toast.success("Photo updated!");
    window.location.reload();
  };

  const handleSaveInfo = async () => {
    if (!editName.trim()) { toast.error("Name cannot be empty"); return; }
    setSavingInfo(true);
    await api.auth.updateMe({ grade: editGrade });
    setSavingInfo(false);
    toast.success("Profile updated!");
  };

  const joinedSports = new Set(memberships.map(m => m.sport));
  const availableSports = ALL_SPORTS.filter(s => !joinedSports.has(s));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your personal information and team memberships</p>
      </div>

      {/* Photo & Basic Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.profile_photo_url} />
                <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                  {user?.full_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/90">
                {uploadingPhoto
                  ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                  : <Camera className="h-3.5 w-3.5 text-white" />
                }
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <div>
              <p className="font-semibold text-lg">{user?.full_name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="text-xs mt-1">Student · ID: {user?.student_id || "—"}</Badge>
            </div>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
              <p className="text-xs text-muted-foreground">Name changes require contacting an admin</p>
            </div>
            <div className="space-y-1.5">
              <Label>Grade</Label>
              <Select value={editGrade} onValueChange={setEditGrade}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {["7", "8", "9", "10", "11", "12"].map(g => (
                    <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSaveInfo} disabled={savingInfo} className="w-full sm:w-auto">
            {savingInfo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Team Memberships */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base">My Sports Teams</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Current teams */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven't joined any teams yet.</p>
          ) : (
            <div className="space-y-2">
              {memberships.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{SPORT_ICONS[m.sport]}</span>
                    <span className="font-medium text-sm">{m.sport}</span>
                    <div className={`h-2 w-2 rounded-full ${SPORT_COLORS[m.sport]?.bg || "bg-muted"}`} />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                    onClick={() => removeMembership.mutate(m.id)}
                    disabled={removeMembership.isPending}
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Leave
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Join new team */}
          {availableSports.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Join a team</p>
              <div className="grid grid-cols-2 gap-2">
                {availableSports.map(sport => (
                  <button
                    key={sport}
                    onClick={() => addMembership.mutate(sport)}
                    disabled={addMembership.isPending}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                  >
                    <span className="text-lg">{SPORT_ICONS[sport]}</span>
                    <span className="text-sm font-medium">{sport}</span>
                    <Plus className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}