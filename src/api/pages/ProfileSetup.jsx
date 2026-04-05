import React, { useState } from "react";
import { api } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trophy, Loader2, Clock } from "lucide-react";
import { ALL_SPORTS, SPORT_ICONS } from "@/lib/sports-config";
import { toast } from "sonner";

export default function ProfileSetup({ onComplete }) {
  const { user } = useAuth();
  const [role, setRole] = useState("");
  const [studentId, setStudentId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [grade, setGrade] = useState("");
  const [sportCoached, setSportCoached] = useState("");
  const [selectedSports, setSelectedSports] = useState([]);
  const [saving, setSaving] = useState(false);
  const [teacherPending, setTeacherPending] = useState(false);

  const toggleSport = (sport) => {
    setSelectedSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (role === "student" && (!studentId || !grade || selectedSports.length === 0)) {
      toast.error("Please fill all fields and select at least one sport");
      return;
    }
    if (role === "teacher" && (!staffId || !sportCoached)) {
      toast.error("Please fill all fields");
      return;
    }

    setSaving(true);

    if (role === "student") {
      await api.auth.updateMe({ role, profile_complete: true, student_id: studentId, grade });
      for (const sport of selectedSports) {
        await api.entities.TeamMembership.create({
          user_email: user.email,
          user_name: user.full_name,
          sport,
        });
      }
      setSaving(false);
      onComplete();
    } else {
      // Teacher: create a pending registration record, don't mark profile_complete
      await api.auth.updateMe({ role, profile_complete: false, staff_id: staffId, sport_coached: sportCoached, teacher_status: "pending" });
      await api.entities.TeacherRegistration.create({
        user_email: user.email,
        user_name: user.full_name,
        staff_id: staffId,
        sport_coached: sportCoached,
        status: "pending",
      });
      setSaving(false);
      setTeacherPending(true);
    }
  };

  // Pending approval screen for teachers
  if (teacherPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
        <Card className="w-full max-w-md border-0 shadow-xl text-center">
          <CardContent className="pt-10 pb-8 px-8">
            <div className="mx-auto h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center mb-5">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Registration Submitted</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Your teacher registration is pending admin approval. You'll be able to log in once your account has been approved. Please check back later.
            </p>
            <Button variant="outline" onClick={() => api.auth.logout()}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <Card className="w-full max-w-lg shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <Trophy className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Welcome to SportSync</CardTitle>
          <CardDescription>Set up your profile to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>I am a...</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher / Coach</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === "student" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Student ID</Label>
                    <Input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="e.g. S12345" />
                  </div>
                  <div className="space-y-2">
                    <Label>Grade</Label>
                    <Select value={grade} onValueChange={setGrade}>
                      <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                      <SelectContent>
                        {["7", "8", "9", "10", "11", "12"].map(g => (
                          <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Select your sports teams</Label>
                  <div className="grid grid-cols-2 gap-2">
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
                </div>
              </>
            )}

            {role === "teacher" && (
              <>
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                  Teacher accounts require admin approval before you can access the system.
                </div>
                <div className="space-y-2">
                  <Label>Staff ID</Label>
                  <Input value={staffId} onChange={e => setStaffId(e.target.value)} placeholder="e.g. T001" />
                </div>
                <div className="space-y-2">
                  <Label>Sport to Coach</Label>
                  <Select value={sportCoached} onValueChange={setSportCoached}>
                    <SelectTrigger><SelectValue placeholder="Select sport" /></SelectTrigger>
                    <SelectContent>
                      {ALL_SPORTS.map(sport => (
                        <SelectItem key={sport} value={sport}>
                          {SPORT_ICONS[sport]} {sport}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {role && (
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {role === "teacher" ? "Submit Registration" : "Complete Setup"}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}