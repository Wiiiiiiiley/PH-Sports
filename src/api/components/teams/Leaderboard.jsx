import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
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

export default function Leaderboard({ sport }) {
  const months = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(months[0].value);

  const { data: rows = [], isError } = useQuery({
    queryKey: ["training-leaderboard", sport, selectedMonth],
    queryFn: () => api.entities.TrainingLog.leaderboard(sport, selectedMonth),
    enabled: !!sport,
  });
  const ranked = rows.map(row => ({ ...row, name: row.user_name, email: row.user_email }));
  const metric = LEADERBOARD_METRIC[sport];
  const color = SPORT_COLORS[sport];

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
        {isError && <p role="alert" className="text-sm text-destructive">We could not load the leaderboard. Please try again.</p>}
        {!isError && ranked.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No activity logged this month yet</p>
        )}
        {ranked.map(entry => (
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