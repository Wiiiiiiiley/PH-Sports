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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Camera, Plus, X, Save, User as UserIcon, Mail, Lock, Fingerprint, Users, UserPlus } from "lucide-react";
import { ALL_SPORTS, SPORT_ICONS, SPORT_COLORS } from "@/lib/sports-config";
import { toast } from "sonner";

export default function AdminProfile() {
  const { user, checkUserAuth } = useAuth();
  const queryClient = useQueryClient();
  
  // Form states
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    gender: user?.gender || "",
    password: "", // Keep password empty by default
  });
  
  // Add user dialog states
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    full_name: "",
    role: "student",
    gender: "",
    student_id: "",
    staff_id: "",
    grade: "",
    sport_coached: [],
    password: ""
  });
  
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  // Fetch all users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.entities.User.list("-created_at", 100),
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNewUserChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleNewUserSelectChange = (name, value) => {
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
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
      if (!updates.password) delete updates.password;
      
      await api.auth.updateMe(updates);
      await checkUserAuth();
      toast.success("Profile updated successfully!");
      setFormData(prev => ({ ...prev, password: "" }));
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Failed to update profile";
      toast.error(msg);
    } finally {
      setSavingInfo(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!newUser.email.trim()) { toast.error("Email is required"); return; }
    if (!newUser.full_name.trim()) { toast.error("Name is required"); return; }
    if (!newUser.password) { toast.error("Password is required"); return; }
    
    if (newUser.role === "student" && (!newUser.student_id || !newUser.grade)) {
      toast.error("Student ID and Grade are required for students");
      return;
    }
    
    if (newUser.role === "teacher" && !newUser.staff_id) {
      toast.error("Staff ID is required for teachers");
      return;
    }

    setCreatingUser(true);
    try {
      // Register the user
      await api.auth.register({
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        gender: newUser.gender,
        password: newUser.password,
        student_id: newUser.student_id,
        staff_id: newUser.staff_id,
        grade: newUser.grade,
        sport_coached: newUser.sport_coached,
      });

      toast.success(`${newUser.role === 'student' ? 'Student' : 'Teacher'} account created successfully!`);
      
      // Reset form
      setNewUser({
        email: "",
        full_name: "",
        role: "student",
        gender: "",
        student_id: "",
        staff_id: "",
        grade: "",
        sport_coached: [],
        password: ""
      });
      setAddUserOpen(false);
      
      // Refresh users list
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Failed to create user";
      toast.error(msg);
    } finally {
      setCreatingUser(false);
    }
  };

  const toggleSport = (sport) => {
    setNewUser(prev => ({
      ...prev,
      sport_coached: prev.sport_coached.includes(sport)
        ? prev.sport_coached.filter(s => s !== sport)
        : [...prev.sport_coached, sport]
    }));
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      await api.entities.User.delete(userId);
      toast.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast.error("Failed to delete user");
    }
  };

  const students = users.filter(u => u.role === 'student');
  const teachers = users.filter(u => u.role === 'teacher');
  const admins = users.filter(u => u.role === 'admin');

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      <div>
        <h1 className="text-2xl font-bold">Admin Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile and system users</p>
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
                  <Badge variant="outline" className="capitalize">Administrator</Badge>
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

        {/* User Management */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> User Management
                </CardTitle>
                <CardDescription>Create and manage system users</CardDescription>
              </div>
              <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>Add a new student or teacher to the system</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Role *</Label>
                        <Select value={newUser.role} onValueChange={(value) => handleNewUserSelectChange('role', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <Select value={newUser.gender} onValueChange={(value) => handleNewUserSelectChange('gender', value)}>
                          <SelectTrigger>
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
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <Input name="full_name" value={newUser.full_name} onChange={handleNewUserChange} placeholder="Enter full name" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input name="email" type="email" value={newUser.email} onChange={handleNewUserChange} placeholder="Enter email" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <Input name="password" type="password" value={newUser.password} onChange={handleNewUserChange} placeholder="Enter password" />
                    </div>

                    {newUser.role === "student" && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Student ID *</Label>
                          <Input name="student_id" value={newUser.student_id} onChange={handleNewUserChange} placeholder="e.g. S12345" />
                        </div>
                        <div className="space-y-2">
                          <Label>Grade *</Label>
                          <Select value={newUser.grade} onValueChange={(value) => handleNewUserSelectChange('grade', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select grade" />
                            </SelectTrigger>
                            <SelectContent>
                              {["7", "8", "9", "10", "11", "12"].map(g => (
                                <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {newUser.role === "teacher" && (
                      <div className="space-y-2">
                        <Label>Staff ID *</Label>
                        <Input name="staff_id" value={newUser.staff_id} onChange={handleNewUserChange} placeholder="e.g. T001" />
                      </div>
                    )}

                    {newUser.role === "teacher" && (
                      <div className="space-y-4">
                        <Label>Sports to Coach</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {ALL_SPORTS.map(sport => (
                            <label key={sport} className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                              newUser.sport_coached.includes(sport)
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/30"
                            }`}>
                              <input
                                type="checkbox"
                                checked={newUser.sport_coached.includes(sport)}
                                onChange={() => toggleSport(sport)}
                                className="sr-only"
                              />
                              <span className="text-sm">{SPORT_ICONS[sport]}</span>
                              <span className="text-xs font-medium">{sport}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 justify-end pt-4">
                      <Button type="button" variant="outline" onClick={() => setAddUserOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={creatingUser}>
                        {creatingUser ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                        Create User
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Users Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{students.length}</div>
                <div className="text-sm text-blue-600">Students</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="text-2xl font-bold text-green-600">{teachers.length}</div>
                <div className="text-sm text-green-600">Teachers</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">{admins.length}</div>
                <div className="text-sm text-purple-600">Admins</div>
              </div>
            </div>

            {/* Users List */}
            <div className="space-y-4">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">All Users</Label>
              {isLoadingUsers ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading users...
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-muted">
                            {u.full_name?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{u.full_name}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {u.role}
                            </Badge>
                            {u.role === 'teacher' && (
                              <Badge variant="secondary" className="text-xs">
                                {u.teacher_status || 'pending'}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteUser(u.id)}
                        disabled={u.id === user?.id} // Can't delete self
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
