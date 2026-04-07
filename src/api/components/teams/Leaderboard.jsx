import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import apiClient from "../apiClient";
import { useAuth } from "@/lib/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal } from "lucide-react";
import { LEADERBOARD_METRIC, SPORT_COLORS } from "@/lib/sports-config";
import { format, startOfMonth, subMonths } from "date-fns";

function getRankIcon(rank) {
  if (rank === 1) return <span className="text-yellow-500 text-lg">🥇</span>;
  if (rank === 2) return <span className="text-gray-400 text-lg">🥈</span>;
  if (rank === 3) return <span className="text-amber-600 text-lg">🥉</span>;
  return <span className="text-muted-foreground text-sm font-bold w-6 text-center">#{rank}</span>;
}

// Generate list of months: current + past 11
function getMonthOptions() {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = subMonths(new Date(), i);
    months.push({
      value: format(startOfMonth(d), "yyyy-MM"),
      label: format(d, "MMMM yyyy"),
    });
  }
  return months;
}

export default function Leaderboard({ sport, members }) {
  const months = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = React.useState(months[0].value);
  const { user } = useAuth();

  const { data: logs = [] } = useQuery({
    queryKey: ["leaderboard-logs", sport, selectedMonth],
    queryFn: () => {
      const [year, month] = selectedMonth.split("-");
      const start = `${year}-${month}-01`;
      // End: first day of next month
      const nextMonth = new Date(parseInt(year), parseInt(month), 1);
      const end = format(nextMonth, "yyyy-MM-dd");
      
      // For students, fetch all training logs for the sport to build leaderboard
      // Privacy will be handled in the display logic
      if (user?.role === "student") {
        // Use the special leaderboard query endpoint
        return apiClient.get(`/training-logs?for_leaderboard=true&sport=${encodeURIComponent(sport)}&sort=-date&limit=500`);
      }
      
      // Teachers and admins use normal filtering
      return api.entities.TrainingLog.filter({ sport }, "-date", 500);
    },
    enabled: !!sport,
  });

  const metric = LEADERBOARD_METRIC[sport];
  const color = SPORT_COLORS[sport];

  const ranked = useMemo(() => {
    // Debug: Log data
    console.log('Leaderboard Debug - User:', user);
    console.log('Leaderboard Debug - Is Student:', user?.role === "student");
    console.log('Leaderboard Debug - Members:', members);
    console.log('Leaderboard Debug - Logs:', logs);
    
    // Filter logs to selected month
    const [year, month] = selectedMonth.split("-");
    const monthLogs = logs.filter(l => {
      const d = l.date?.slice(0, 7); // "yyyy-MM"
      return d === selectedMonth;
    });
    
    console.log('Leaderboard Debug - Month logs:', monthLogs);

    // Group by member with privacy protection
    const byMember = {};
    const isStudent = user?.role === "student";
    
    members.forEach(m => {
      byMember[m.user_email] = { name: m.user_name, email: m.user_email, logs: [] };
    });
    
    monthLogs.forEach(l => {
      if (byMember[l.user_email]) {
        byMember[l.user_email].logs.push(l);
      } else {
        byMember[l.user_email] = { name: l.user_name, email: l.user_email, logs: [l] };
      }
    });

    const entries = Object.values(byMember).map(m => {
      const memberLogs = m.logs;
      const score = metric ? metric.compute(memberLogs) : memberLogs.length;
      const sessions = memberLogs.length;
      
      // Privacy protection: students only see their own detailed data
      if (isStudent && m.email !== user.email) {
        return {
          name: m.name,
          email: m.email,
          score: score,
          sessions: 0, // Hide session count for other students
        };
      }
      
      return {
        name: m.name,
        email: m.email,
        score: score,
        sessions: sessions,
      };
    });
    
    entries.sort((a, b) => b.score - a.score);
    
    console.log('Leaderboard Debug - Final entries:', entries);
    console.log('Leaderboard Debug - Ranked length:', entries.length);
    
    return entries.map((e, i) => ({ ...e, rank: i + 1 }));
  }, [logs, members, selectedMonth, metric, user]);

  const isCurrentMonth = selectedMonth === months[0].value;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Trophy className={`h-4 w-4 ${color?.text || "text-primary"}`} />
          <span className="text-sm font-semibold">Leaderboard</span>
          {isCurrentMonth && <Badge variant="secondary" className="text-[10px]">Live</Badge>}
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map(m => (
              <SelectItem key={m.value} value={m.value} className="text-xs">
                {m.label} {m.value === months[0].value ? "(Current)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        Ranked by: <span className="font-medium">{metric?.label || "Total Sessions"}</span>
        {isCurrentMonth ? " · Resets at the start of each month" : ""}
      </p>

      <div className="space-y-2">
        {ranked.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No activity logged this month yet</p>
        )}
        {ranked.map((entry, idx) => (
          <div
            key={entry.email}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              entry.rank <= 3 ? "bg-secondary/70" : "bg-secondary/30"
            }`}
          >
            <div className="w-8 flex items-center justify-center shrink-0">
              {getRankIcon(entry.rank)}
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {entry.name?.[0] || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entry.name}</p>
              <p className="text-xs text-muted-foreground">{entry.sessions} session{entry.sessions !== 1 ? "s" : ""}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold">{typeof entry.score === "number" ? entry.score.toLocaleString() : entry.score}</p>
              <p className="text-[10px] text-muted-foreground">{metric?.label?.split(" ")[0] || "pts"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}