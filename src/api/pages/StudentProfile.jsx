import React, { useState } from "react";
import { api } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Camera, Plus, X, Save, User as UserIcon, Mail, Lock, Fingerprint } from "lucide-react";
import { ALL_SPORTS, SPORT_ICONS, SPORT_COLORS } from "@/lib/sports-config";
import { toast } from "sonner";

export default function StudentProfile() {
  const { user, checkUserAuth } = useAuth();
  const queryClient = useQueryClient();
  
  // Form states
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    gender: user?.gender || "",
    student_id: user?.student_id || "",
    staff_id: user?.staff_id || "",
    grade: user?.grade || "",
    password: "", // Keep password empty by default
  });
  
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      // Note: Assuming api.integrations.Core.UploadFile exists based on previous code
      // If it doesn't, we'll need to implement it or use a different way
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      await api.auth.updateMe({ profile_photo_url: file_url });
      await checkUserAuth();
      toast.success("Photo updated!");
    } catch (err) {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) { toast.error("Name cannot be empty"); return; }
    if (!formData.email.trim()) { toast.error("Email cannot be empty"); return; }
    
    setSavingInfo(true);
    try {
      const updates = { ...formData };
      if (!updates.password) delete updates.password; // Don't send empty password
      
      await api.auth.updateMe(updates);
      await checkUserAuth();
      toast.success("Profile updated successfully!");
      setFormData(prev => ({ ...prev, password: "" })); // Clear password field after success
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Failed to update profile";
      toast.error(msg);
    } finally {
      setSavingInfo(false);
    }
  };

  const joinedSports = new Set(memberships.map(m => m.sport));
  const availableSports = ALL_SPORTS.filter(s => !joinedSports.has(s));

  return (
    <div className="space-y-6 max-w-3xl pb-10">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile information and team memberships</p>
      </div>

      <div className="grid gap-6">
        {/* Profile Card */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="h-24 bg-primary/10 w-full" />
          <CardContent className="px-6 -mt-12 relative pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                  <AvatarImage src={user?.profile_photo_url} />
                  <AvatarFallback className="text-2xl bg-muted text-muted-foreground font-bold">
                    {user?.full_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/90 shadow-sm border-2 border-background">
                  {uploadingPhoto
                    ? <Loader2 className="h-4 w-4 text-white animate-spin" />
                    : <Camera className="h-4 w-4 text-white" />
                  }
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>
              <div className="flex-1 space-y-1">
                <h2 className="text-xl font-bold leading-none">{user?.full_name}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="capitalize">{user?.role}</Badge>
                  <span>·</span>
                  <span>{user?.email}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveInfo} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Basic Info Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <UserIcon className="h-4 w-4" /> Personal Details
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input 
                      id="full_name" 
                      name="full_name" 
                      value={formData.full_name} 
                      onChange={handleInputChange} 
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={formData.gender} onValueChange={(v) => handleSelectChange('gender', v)}>
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="id_field">{user?.role === 'teacher' ? 'Staff ID' : 'Student ID'}</Label>
                    <div className="relative">
                      <Fingerprint className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="id_field"
                        name={user?.role === 'teacher' ? 'staff_id' : 'student_id'}
                        className="pl-9"
                        value={user?.role === 'teacher' ? formData.staff_id : formData.student_id} 
                        onChange={handleInputChange} 
                        placeholder={user?.role === 'teacher' ? "T-000" : "S-000"}
                      />
                    </div>
                  </div>
                  {user?.role === 'student' && (
                    <div className="space-y-2">
                      <Label htmlFor="grade">Grade</Label>
                      <Select value={formData.grade} onValueChange={(v) => handleSelectChange('grade', v)}>
                        <SelectTrigger id="grade">
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {["7", "8", "9", "10", "11", "12"].map(g => (
                            <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Security Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Lock className="h-4 w-4" /> Security & Access
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="email" 
                        name="email" 
                        type="email"
                        className="pl-9"
                        value={formData.email} 
                        onChange={handleInputChange} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Change Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="password" 
                        name="password" 
                        type="password"
                        className="pl-9"
                        value={formData.password} 
                        onChange={handleInputChange} 
                        placeholder="Leave blank to keep current"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">Only fill this if you want to update your password</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end">
                <Button type="submit" disabled={savingInfo} className="w-full sm:w-auto min-w-[140px]">
                  {savingInfo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Team Memberships */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" /> My Sports Teams
            </CardTitle>
            <CardDescription>Join or leave sports teams to track your activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current teams */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Joined Teams</Label>
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
              ) : memberships.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 italic">You haven't joined any teams yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {memberships.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-transparent hover:border-border transition-all">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{SPORT_ICONS[m.sport]}</span>
                        <span className="font-semibold text-sm">{m.sport}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        onClick={() => removeMembership.mutate(m.id)}
                        disabled={removeMembership.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Join new team */}
            {availableSports.length > 0 && (
              <div className="space-y-3 pt-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Available Teams</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableSports.map(sport => (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => addMembership.mutate(sport)}
                      disabled={addMembership.isPending}
                      className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                    >
                      <span className="text-lg grayscale group-hover:grayscale-0 transition-all">{SPORT_ICONS[sport]}</span>
                      <span className="text-xs font-medium truncate">{sport}</span>
                      <Plus className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
