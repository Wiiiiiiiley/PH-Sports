import React, { useState } from "react";
import { api } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Camera, Plus, X, Save, User as UserIcon, Mail, Lock, Fingerprint } from "lucide-react";
import { ALL_SPORTS, SPORT_ICONS, SPORT_COLORS } from "@/lib/sports-config";
import { toast } from "sonner";

export default function TeacherProfile() {
  const { user, checkUserAuth } = useAuth();
  const queryClient = useQueryClient();
  
  // Form states
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    gender: user?.gender || "",
    staff_id: user?.staff_id || "",
    password: "", // Keep password empty by default
  });
  
  const [selectedSports, setSelectedSports] = useState(
    Array.isArray(user?.sport_coached) 
      ? user.sport_coached 
      : user?.sport_coached ? [user.sport_coached] : []
  );
  
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingSports, setSavingSports] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      // Note: Assuming api.integrations.Core.UploadFile exists based on previous code
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

  const handleSaveSports = async () => {
    if (selectedSports.length === 0) {
      toast.error("Please select at least one sport to coach");
      return;
    }

    setSavingSports(true);
    try {
      await api.auth.updateMe({ sport_coached: selectedSports });
      await checkUserAuth();
      toast.success("Coaching sports updated successfully!");
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Failed to update coaching sports";
      toast.error(msg);
    } finally {
      setSavingSports(false);
    }
  };

  const toggleSport = (sport) => {
    setSelectedSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    );
  };

  return (
    <div className="space-y-6 max-w-3xl pb-10">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile information and coaching assignments</p>
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
                  <Badge variant={user?.teacher_status === 'approved' ? 'default' : 'secondary'}>
                    {user?.teacher_status || 'pending'}
                  </Badge>
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
                    <select 
                      id="gender"
                      name="gender"
                      className="w-full p-2 border rounded-md"
                      value={formData.gender} 
                      onChange={handleInputChange}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff_id">Staff ID</Label>
                    <div className="relative">
                      <Fingerprint className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="staff_id"
                        name="staff_id"
                        className="pl-9"
                        value={formData.staff_id} 
                        onChange={handleInputChange} 
                        placeholder="T-000"
                      />
                    </div>
                  </div>
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

        {/* Coaching Sports */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" /> Coaching Assignments
            </CardTitle>
            <CardDescription>Manage the sports teams you coach</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Select Sports to Coach</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ALL_SPORTS.map(sport => (
                  <label key={sport} className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedSports.includes(sport)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}>
                    <Checkbox
                      checked={selectedSports.includes(sport)}
                      onCheckedChange={() => toggleSport(sport)}
                    />
                    <span className="text-lg">{SPORT_ICONS[sport]}</span>
                    <span className="text-sm font-medium">{sport}</span>
                  </label>
                ))}
              </div>
              {selectedSports.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Currently coaching: {selectedSports.join(", ")}
                </p>
              )}
            </div>

            <div className="pt-4 border-t">
              <Button 
                onClick={handleSaveSports} 
                disabled={savingSports || selectedSports.length === 0}
                className="w-full sm:w-auto"
              >
                {savingSports ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Update Coaching Sports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
