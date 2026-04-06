import React, { useState } from "react";
import { api } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, MapPin, User, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { SPORT_ICONS } from "@/lib/sports-config";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ManageRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [actionBooking, setActionBooking] = useState(null);
  const [comment, setComment] = useState("");
  const [actionType, setActionType] = useState("");

  const { data: bookings = [] } = useQuery({
    queryKey: ["all-bookings-manage"],
    queryFn: () => {
      if (user.role === 'admin') return api.entities.VenueBooking.list("-created_at", 500);
      // Teacher: handle both single sport (string) and multi-sport (array)
      const teacherSports = Array.isArray(user.sport_coached) 
        ? user.sport_coached 
        : user.sport_coached ? [user.sport_coached] : [];
      if (teacherSports.length === 0) return [];
      if (teacherSports.length === 1) {
        return api.entities.VenueBooking.filter({ sport: teacherSports[0] }, "-created_at", 100);
      }
      // For multiple sports, fetch all and filter client-side
      return api.entities.VenueBooking.list("-created_at", 200).then(data =>
        data.filter(b => teacherSports.includes(b.sport))
      );
    },
  });

  const updateBooking = useMutation({
    mutationFn: ({ id, data }) => api.entities.VenueBooking.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-bookings-manage"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setActionBooking(null);
      setComment("");
      toast.success(`Booking ${actionType}!`);
    },
  });

  const handleAction = (booking, type) => {
    setActionBooking(booking);
    setActionType(type);
  };

  const isAdmin = user.role === 'admin';

  const { data: teacherRequests = [] } = useQuery({
    queryKey: ["teacher-registrations"],
    queryFn: () => api.entities.TeacherRegistration.list("-created_at", 100),
    enabled: isAdmin,
  });

  const updateTeacherReg = useMutation({
    mutationFn: ({ id, data }) => api.entities.TeacherRegistration.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-registrations"] });
      setActionBooking(null);
      setComment("");
      toast.success("Teacher registration updated!");
    },
  });

  const confirmAction = () => {
    if (actionBooking.type === 'teacher') {
      updateTeacherReg.mutate({
        id: actionBooking.id,
        data: {
          status: actionType === "approve" ? "approved" : "rejected",
          admin_comment: comment,
        },
      });
      return;
    }
    updateBooking.mutate({
      id: actionBooking.id,
      data: {
        status: actionType === "approve" ? "approved" : "rejected",
        teacher_comment: comment,
      },
    });
  };

  const pending = bookings.filter(b => b.status === "pending");
  const processed = bookings.filter(b => b.status !== "pending");
  const pendingTeachers = teacherRequests.filter(r => r.status === "pending");
  const processedTeachers = teacherRequests.filter(r => r.status !== "pending");

  const TeacherCard = ({ reg, showActions }) => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">Teacher Registration</span>
              <Badge className={cn(
                "text-[10px]",
                reg.status === "approved" && "bg-green-100 text-green-700",
                reg.status === "pending" && "bg-yellow-100 text-yellow-700",
                reg.status === "rejected" && "bg-red-100 text-red-700",
              )}>{reg.status}</Badge>
            </div>
            <div className="space-y-0.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1"><User className="h-3 w-3" />{reg.user_name} ({reg.user_email})</div>
              <div className="flex items-center gap-1"><span className="h-3 w-3">{SPORT_ICONS[reg.sport_coached]}</span>Sport: {reg.sport_coached}</div>
              <div className="flex items-center gap-1">Staff ID: {reg.staff_id}</div>
              <div className="flex items-center gap-1"><Clock className="h-3 w-3" />Applied: {format(new Date(reg.created_at), "MMM d, yyyy")}</div>
            </div>
          </div>
          {showActions && (
            <div className="flex gap-1.5 shrink-0">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={() => handleAction({ ...reg, type: 'teacher' }, "approve")}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
              </Button>
              <Button size="sm" variant="destructive" className="h-8" onClick={() => handleAction({ ...reg, type: 'teacher' }, "reject")}>
                <XCircle className="h-3.5 w-3.5 mr-1" />Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const BookingCard = ({ booking, showActions }) => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span>{SPORT_ICONS[booking.sport]}</span>
              <span className="font-medium text-sm">{booking.sport}</span>
              <Badge className={cn(
                "text-[10px]",
                booking.status === "approved" && "bg-green-100 text-green-700",
                booking.status === "pending" && "bg-yellow-100 text-yellow-700",
                booking.status === "rejected" && "bg-red-100 text-red-700",
              )}>{booking.status}</Badge>
            </div>
            <div className="space-y-0.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1"><User className="h-3 w-3" />{booking.booked_by_name}</div>
              <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{booking.venue}</div>
              <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(booking.date), "MMM d, yyyy")} at {booking.time_slot} · {booking.duration}min</div>
              <div>Purpose: {booking.purpose?.replace(/_/g, " ")}</div>
            </div>
          </div>
          {showActions && (
            <div className="flex gap-1.5 shrink-0">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={() => handleAction(booking, "approve")}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
              </Button>
              <Button size="sm" variant="destructive" className="h-8" onClick={() => handleAction(booking, "reject")}>
                <XCircle className="h-3.5 w-3.5 mr-1" />Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manage Requests</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isAdmin ? "Review and manage all system requests" : `Review and manage venue booking requests for ${user.sport_coached}`}
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length + pendingTeachers.length})</TabsTrigger>
          <TabsTrigger value="processed">Processed ({processed.length + processedTeachers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {isAdmin && pendingTeachers.map(r => <TeacherCard key={r.id} reg={r} showActions />)}
          {pending.map(b => <BookingCard key={b.id} booking={b} showActions />)}
          {pending.length === 0 && (!isAdmin || pendingTeachers.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">No pending requests</p>
          )}
        </TabsContent>

        <TabsContent value="processed" className="mt-4 space-y-3">
          {isAdmin && processedTeachers.map(r => <TeacherCard key={r.id} reg={r} showActions={false} />)}
          {processed.map(b => <BookingCard key={b.id} booking={b} showActions={false} />)}
          {processed.length === 0 && (!isAdmin || processedTeachers.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">No processed requests</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Action confirmation dialog */}
      <Dialog open={!!actionBooking} onOpenChange={() => setActionBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === "approve" ? "Approve" : "Reject"} {actionBooking?.type === 'teacher' ? 'Teacher Registration' : 'Booking'}</DialogTitle>
            <DialogDescription>Confirm your decision for this request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {actionType === "approve" ? "Approve" : "Reject"} the {actionBooking?.type === 'teacher' ? 'registration' : 'booking'} by <strong>{actionBooking?.booked_by_name || actionBooking?.user_name}</strong>
              {actionBooking?.type !== 'teacher' && (
                <>
                  {" "}for <strong>{actionBooking?.venue}</strong> on{" "}
                  <strong>{actionBooking?.date && format(new Date(actionBooking.date), "MMM d, yyyy")}</strong>
                </>
              )}?
            </p>
            <div>
              <Label>Comment (optional)</Label>
              <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setActionBooking(null)}>Cancel</Button>
              <Button
                className={cn("flex-1", actionType === "approve" ? "bg-green-600 hover:bg-green-700" : "")}
                variant={actionType === "reject" ? "destructive" : "default"}
                onClick={confirmAction}
                disabled={updateBooking.isPending || updateTeacherReg.isPending}
              >
                {(updateBooking.isPending || updateTeacherReg.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm {actionType === "approve" ? "Approval" : "Rejection"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}