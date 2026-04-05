import React, { useState } from "react";
import { api } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, BarChart3 } from "lucide-react";
import { SPORT_ICONS } from "@/lib/sports-config";
import { format } from "date-fns";
import { toast } from "sonner";
import TrainingLogForm from "@/components/training/TrainingLogForm";
import TrainingCharts from "@/components/training/TrainingCharts";

export default function TrainingLog() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState("");
  const [viewMode, setViewMode] = useState("logs");

  const { data: memberships = [] } = useQuery({
    queryKey: ["my-memberships"],
    queryFn: () => {
      if (user?.role === "admin") return api.entities.TeamMembership.list("-created_at", 500);
      if (user?.role === "teacher") return api.entities.TeamMembership.filter({ sport: user.sport_coached });
      return api.entities.TeamMembership.filter({ user_email: user.email });
    },
  });

  const mySports = user?.role === "admin"
    ? [...new Set(memberships.map(m => m.sport))]
    : isTeacher
      ? [user.sport_coached]
      : [...new Set(memberships.map(m => m.sport))];
  const activeSport = selectedSport || mySports[0] || "";

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["training-logs", activeSport, user?.email],
    queryFn: () => {
      if (isTeacher) return api.entities.TrainingLog.filter({ sport: activeSport }, "-date", 100);
      return api.entities.TrainingLog.filter({ user_email: user.email, sport: activeSport }, "-date", 100);
    },
    enabled: !!activeSport,
  });

  const createLog = useMutation({
    mutationFn: (data) => api.entities.TrainingLog.create({
      ...data,
      user_email: user.email,
      user_name: user.full_name,
      sport: activeSport,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-logs"] });
      setFormOpen(false);
      toast.success("Training session logged!");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Training Log</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isTeacher ? "View all athlete training logs" : "Track your training progress"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mySports.length > 1 && (
            <Select value={activeSport} onValueChange={setSelectedSport}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mySports.map(s => (
                  <SelectItem key={s} value={s}>{SPORT_ICONS[s]} {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!isTeacher && activeSport && (
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Log Training</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{SPORT_ICONS[activeSport]} Log {activeSport} Training</DialogTitle>
                </DialogHeader>
                <TrainingLogForm sport={activeSport} onSubmit={d => createLog.mutate(d)} saving={createLog.isPending} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {activeSport && (
        <Tabs value={viewMode} onValueChange={setViewMode}>
          <TabsList>
            <TabsTrigger value="logs">Session Logs</TabsTrigger>
            <TabsTrigger value="charts"><BarChart3 className="h-4 w-4 mr-1" />Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="mt-4 space-y-3">
            {logs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No training logs yet for {activeSport}</p>
            )}
            {logs.map(log => (
              <Card key={log.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {isTeacher && <span className="text-sm font-semibold">{log.user_name}</span>}
                        <Badge variant="secondary" className="text-xs">{log.session_type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.date), "MMMM d, yyyy")} · {log.duration} min
                      </p>
                      {log.data && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          {Object.entries(log.data).filter(([, v]) => v).map(([k, v]) => (
                            <span key={k} className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{v}</span> {k.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      )}
                      {log.notes && <p className="text-xs text-muted-foreground mt-2 italic">"{log.notes}"</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="charts" className="mt-4">
            <TrainingCharts sport={activeSport} logs={logs} />
          </TabsContent>
        </Tabs>
      )}

      {mySports.length === 0 && (
        <p className="text-center text-muted-foreground py-12">You haven't joined any sports teams yet.</p>
      )}
    </div>
  );
}