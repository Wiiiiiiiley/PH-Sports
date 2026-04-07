import React, { useState, useMemo } from "react";
import { api } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Loader2, Clock, MapPin, User } from "lucide-react";
import { format, addDays, startOfToday, isToday, isBefore, addWeeks } from "date-fns";
import { VENUE_SPORTS, SPORT_COLORS, SPORT_VENUES, SPORT_ICONS } from "@/lib/sports-config";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// 30-min slots 07:00–21:30
const TIME_SLOTS = [];
for (let h = 7; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}
TIME_SLOTS.push("21:30");

const today = startOfToday();
const twoWeeksLater = addDays(today, 13);

export default function VenueBooking() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  // 14 days starting from today
  const allDays = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), []);

  // Show 7 days at a time
  const [weekOffset, setWeekOffset] = useState(0);
  const visibleDays = allDays.slice(weekOffset * 7, weekOffset * 7 + 7);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookSport, setBookSport] = useState("");
  const [bookVenue, setBookVenue] = useState("");
  const [bookDuration, setBookDuration] = useState("30");
  const [bookPurpose, setBookPurpose] = useState("");
  const [bookerName, setBookerName] = useState(user?.full_name || "");

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => api.entities.VenueBooking.list("-created_at", 500),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ["my-sport-memberships"],
    queryFn: () => {
      if (isTeacher || isAdmin) return Promise.resolve([]);
      return api.entities.TeamMembership.list("-created_at", 500).then(data =>
        data.filter(m => m.user_email === user.email)
      );
    },
  });

  // Helper to get teacher's sports as array
  const getTeacherSports = () => {
    if (!user?.sport_coached) return [];
    // Handle JSON string format from backend
    if (typeof user.sport_coached === 'string') {
      try {
        const parsed = JSON.parse(user.sport_coached);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [user.sport_coached];
      }
    }
    return Array.isArray(user.sport_coached) ? user.sport_coached : [user.sport_coached];
  };

  const myVenueSports = isAdmin
    ? VENUE_SPORTS
    : isTeacher
      ? VENUE_SPORTS.filter(s => getTeacherSports().includes(s))
      : VENUE_SPORTS.filter(s => memberships.some(m => m.sport === s));

  const createBooking = useMutation({
    mutationFn: (data) => api.entities.VenueBooking.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setBookingOpen(false);
      resetForm();
      if (isTeacher || isAdmin) {
        toast.success("Venue booking created and approved!");
      } else {
        toast.success("Booking request submitted! Your teacher will review it shortly.");
      }
    },
    onError: (error) => {
      const message = error?.response?.data?.error || "Failed to create booking";
      toast.error(message);
    },
  });

  const resetForm = () => {
    setBookSport(""); setBookVenue(""); setBookDuration("30"); setBookPurpose(""); setBookerName(user?.full_name || "");
  };

  const handleSlotClick = (date, time) => {
    const dateStr = format(date, "yyyy-MM-dd");
    if (isBefore(date, today)) return; // past date guard
    setSelectedDate(dateStr);
    setSelectedTime(time);
    setBookingOpen(true);
  };

  const handleSubmitBooking = () => {
    if (!bookSport || !bookVenue || !selectedDate || !selectedTime) {
      toast.error("Please fill all required fields");
      return;
    }
    
    // Find team for the selected sport to get team_id
    api.entities.Team.list().then(teams => {
      const team = teams.find(t => t.sport === bookSport);
      if (!team) {
        toast.error(`No team found for sport: ${bookSport}`);
        return;
      }
      
      createBooking.mutate({
        booked_by_email: user.email,
        booked_by_name: bookerName.trim(),
        team_id: team.id, // Use team_id instead of sport
        venue: bookVenue,
        date: selectedDate,
        time_slot: selectedTime,
        duration: parseInt(bookDuration),
        purpose: bookPurpose,
        status: "pending",
      });
    });
  };

  const getBookingsForSlot = (date, time) =>
    bookings.filter(b => b.date === format(date, "yyyy-MM-dd") && b.time_slot === time);

  const handleBookingClick = (booking, e) => {
    e.stopPropagation();
    setSelectedBooking(booking);
    setDetailOpen(true);
  };

  if (myVenueSports.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Venue Booking</h1>
        <p className="text-muted-foreground">You are not a member of any team that uses venue booking. Join a sports team from your profile to book venues.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Venue Booking</h1>
        <p className="text-muted-foreground text-sm mt-1">Book venues up to 2 weeks in advance · Click any slot to request</p>
      </div>

      {/* Week nav */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold">
          {format(visibleDays[0], "MMM d")} — {format(visibleDays[visibleDays.length - 1], "MMM d, yyyy")}
        </h2>
        <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => Math.min(1, w + 1))} disabled={weekOffset === 1}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Sport legend */}
      <div className="flex flex-wrap gap-2">
        {VENUE_SPORTS.map(sport => (
          <div key={sport} className="flex items-center gap-1.5 text-xs">
            <div className={`h-2.5 w-2.5 rounded-full ${SPORT_COLORS[sport]?.bg}`} />
            {sport}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Day header */}
            <div className="grid border-b" style={{ gridTemplateColumns: `64px repeat(${visibleDays.length}, 1fr)` }}>
              <div className="p-2 text-xs font-medium text-muted-foreground border-r" />
              {visibleDays.map(day => (
                <div key={day.toString()} className={cn("p-2 text-center border-r last:border-r-0", isToday(day) && "bg-primary/5")}>
                  <p className="text-[10px] text-muted-foreground uppercase">{format(day, "EEE")}</p>
                  <p className={cn("text-sm font-semibold", isToday(day) && "text-primary")}>{format(day, "d")}</p>
                </div>
              ))}
            </div>

            {/* Time rows */}
            {TIME_SLOTS.map(time => (
              <div key={time} className="grid border-b last:border-b-0" style={{ gridTemplateColumns: `64px repeat(${visibleDays.length}, 1fr)` }}>
                <div className="p-1 text-[10px] text-muted-foreground border-r flex items-start pt-2">{time}</div>
                {visibleDays.map(day => {
                  const slotBookings = getBookingsForSlot(day, time);
                  const isPast = isBefore(day, today);
                  return (
                    <div
                      key={day.toString() + time}
                      className={cn(
                        "p-0.5 border-r last:border-r-0 min-h-[36px] transition-colors",
                        !isPast && "cursor-pointer hover:bg-secondary/50",
                        isPast && "bg-muted/20",
                        isToday(day) && "bg-primary/5"
                      )}
                      onClick={() => !isPast && handleSlotClick(day, time)}
                    >
                      {slotBookings.map(b => (
                        <div
                          key={b.id}
                          className={cn(
                            "text-[9px] px-1 py-0.5 rounded mb-0.5 text-white truncate cursor-pointer leading-tight",
                            SPORT_COLORS[b.sport]?.bg || "bg-muted",
                            b.status === "pending" && "opacity-60"
                          )}
                          onClick={(e) => handleBookingClick(b, e)}
                          title={`${b.sport} – ${b.venue} (${b.status})`}
                        >
                          {SPORT_ICONS[b.sport]}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Booking form dialog */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Venue — {selectedDate && format(new Date(selectedDate + "T00:00"), "EEE, MMM d")} at {selectedTime}</DialogTitle>
            <DialogDescription>Fill in the details to request a venue booking.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Your Name</Label>
              <Input value={bookerName} onChange={e => setBookerName(e.target.value)} placeholder="Enter your full name" />
            </div>
            <div>
              <Label>Sport</Label>
              <Select value={bookSport} onValueChange={v => { setBookSport(v); setBookVenue(""); }}>
                <SelectTrigger><SelectValue placeholder="Select sport" /></SelectTrigger>
                <SelectContent>
                  {myVenueSports.map(s => <SelectItem key={s} value={s}>{SPORT_ICONS[s]} {s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {bookSport && (
              <div>
                <Label>Venue</Label>
                <Select value={bookVenue} onValueChange={setBookVenue}>
                  <SelectTrigger><SelectValue placeholder="Select venue" /></SelectTrigger>
                  <SelectContent>
                    {(SPORT_VENUES[bookSport] || []).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Duration</Label>
              <Select value={bookDuration} onValueChange={setBookDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["30", "60", "90", "120"].map(d => <SelectItem key={d} value={d}>{d} min</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Purpose</Label>
              <Select value={bookPurpose} onValueChange={setBookPurpose}>
                <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="practice">Practice</SelectItem>
                  <SelectItem value="team_session">Team Session</SelectItem>
                  <SelectItem value="match">Match</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSubmitBooking} disabled={createBooking.isPending}>
              {createBooking.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Booking Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>View the details of this booking.</DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{SPORT_ICONS[selectedBooking.sport]}</span>
                <span className="text-lg font-semibold">{selectedBooking.sport}</span>
                <Badge className={cn("ml-auto",
                  selectedBooking.status === "approved" && "bg-green-100 text-green-700",
                  selectedBooking.status === "pending" && "bg-yellow-100 text-yellow-700",
                  selectedBooking.status === "rejected" && "bg-red-100 text-red-700",
                )}>{selectedBooking.status}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{selectedBooking.booked_by_name}</div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{selectedBooking.venue}</div>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />{format(new Date(selectedBooking.date + "T00:00"), "MMM d, yyyy")} at {selectedBooking.time_slot} ({selectedBooking.duration} min)</div>
                <div>Purpose: <Badge variant="secondary">{selectedBooking.purpose?.replace(/_/g, " ")}</Badge></div>
                {selectedBooking.teacher_comment && <p className="text-muted-foreground italic">Comment: "{selectedBooking.teacher_comment}"</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}