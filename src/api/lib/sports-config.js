export const ALL_SPORTS = [
  "Rowing", "Basketball", "Volleyball", "Football", 
  "Tennis", "Table Tennis", "Badminton", "Ultimate Frisbee", "Billiards Club"
];

export const VENUE_SPORTS = [
  "Basketball", "Football", "Volleyball", "Badminton", 
  "Table Tennis", "Tennis", "Ultimate Frisbee", "Billiards Club"
];

export const SPORT_COLORS = {
  "Rowing": { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50", hex: "#3b82f6" },
  "Basketball": { bg: "bg-orange-500", text: "text-orange-600", light: "bg-orange-50", hex: "#f97316" },
  "Volleyball": { bg: "bg-purple-500", text: "text-purple-600", light: "bg-purple-50", hex: "#a855f7" },
  "Football": { bg: "bg-green-500", text: "text-green-600", light: "bg-green-50", hex: "#22c55e" },
  "Tennis": { bg: "bg-yellow-500", text: "text-yellow-600", light: "bg-yellow-50", hex: "#eab308" },
  "Table Tennis": { bg: "bg-red-500", text: "text-red-600", light: "bg-red-50", hex: "#ef4444" },
  "Badminton": { bg: "bg-teal-500", text: "text-teal-600", light: "bg-teal-50", hex: "#14b8a6" },
  "Ultimate Frisbee": { bg: "bg-indigo-500", text: "text-indigo-600", light: "bg-indigo-50", hex: "#6366f1" },
  "Billiards Club": { bg: "bg-gray-700", text: "text-gray-700", light: "bg-gray-50", hex: "#374151" }
};

export const SPORT_VENUES = {
  "Basketball": ["Main Gymnasium", "Outdoor Court A", "Outdoor Court B"],
  "Football": ["Main Football Field", "Training Pitch", "Indoor Arena"],
  "Volleyball": ["Main Gymnasium", "Beach Court", "Indoor Court B"],
  "Badminton": ["Sports Hall A", "Sports Hall B"],
  "Table Tennis": ["Activity Room 1", "Activity Room 2"],
  "Tennis": ["Tennis Court 1", "Tennis Court 2", "Tennis Court 3"],
  "Ultimate Frisbee": ["Main Football Field", "Training Pitch", "Open Field"],
  "Billiards Club": ["Billiards Room A", "Billiards Room B"]
};

// 30-minute time slots from 07:00 to 21:30
export const TIME_SLOTS = [];
for (let h = 7; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 21) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}
TIME_SLOTS.push("21:30");

export const SPORT_SESSION_TYPES = {
  "Rowing": ["endurance", "intervals", "technique"],
  "Basketball": ["individual", "team", "scrimmage"],
  "Volleyball": ["individual", "team", "scrimmage"],
  "Football": ["individual", "team", "match"],
  "Tennis": ["solo", "rally", "match"],
  "Table Tennis": ["solo", "rally", "match"],
  "Badminton": ["solo", "rally", "match"],
  "Ultimate Frisbee": ["individual", "team", "scrimmage"],
  "Billiards Club": ["potting", "positional", "safety", "free practice"]
};

export const SPORT_ICONS = {
  "Rowing": "🚣",
  "Basketball": "🏀",
  "Volleyball": "🏐",
  "Football": "⚽",
  "Tennis": "🎾",
  "Table Tennis": "🏓",
  "Badminton": "🏸",
  "Ultimate Frisbee": "🥏",
  "Billiards Club": "🎱"
};

// Leaderboard scoring logic per sport
export const LEADERBOARD_METRIC = {
  "Rowing": { label: "Total Distance (m)", compute: (logs) => logs.reduce((s, l) => s + (l.data?.distance || 0), 0) },
  "Basketball": { label: "Total Sessions", compute: (logs) => logs.length },
  "Volleyball": { label: "Total Sessions", compute: (logs) => logs.length },
  "Football": { label: "Total Distance (km)", compute: (logs) => logs.reduce((s, l) => s + (l.data?.distance_ran || 0), 0) },
  "Tennis": { label: "Total Sessions", compute: (logs) => logs.length },
  "Table Tennis": { label: "Total Rally Sets", compute: (logs) => logs.reduce((s, l) => s + (l.data?.rally_sets || 0), 0) },
  "Badminton": { label: "Total Sessions", compute: (logs) => logs.length },
  "Ultimate Frisbee": { label: "Throws Completed", compute: (logs) => logs.reduce((s, l) => s + (l.data?.throws_completed || 0), 0) },
  "Billiards Club": { label: "Frames Won", compute: (logs) => logs.reduce((s, l) => s + (l.data?.frames_won || 0), 0) }
};

export const ADMIN_EMAIL = "admin@sportsync.edu";

// Training record fields for each sport
export const TRAINING_FIELDS = {
  "Rowing": [
    { key: "distance", label: "划船器距离 (m)", type: "number", unit: "m", required: true },
    { key: "time", label: "Time (minutes)", type: "number", unit: "min", required: true },
    { key: "stroke_rate", label: "桨频 (spm)", type: "number", unit: "spm" },
    { key: "split_time", label: "500m配速", type: "text", unit: "mm:ss" },
    { key: "heart_rate", label: "心率", type: "number", unit: "bpm" },
    { key: "notes", label: "Training笔记", type: "textarea" }
  ],
  "Basketball": [
    { key: "duration", label: "TrainingDuration (minutes)", type: "number", unit: "min", required: true },
    { key: "shots_made", label: "投篮命中数", type: "number", unit: "次" },
    { key: "shots_attempted", label: "投篮尝试数", type: "number", unit: "次" },
    { key: "free_throws_made", label: "罚球命中数", type: "number", unit: "次" },
    { key: "free_throws_attempted", label: "罚球尝试数", type: "number", unit: "次" },
    { key: "rebounds", label: "篮板数", type: "number", unit: "次" },
    { key: "assists", label: "助攻数", type: "number", unit: "次" },
    { key: "notes", label: "Training笔记", type: "textarea" }
  ],
  "Volleyball": [
    { key: "duration", label: "TrainingDuration (minutes)", type: "number", unit: "min", required: true },
    { key: "serves_made", label: "发球Success数", type: "number", unit: "次" },
    { key: "serves_attempted", label: "发球尝试数", type: "number", unit: "次" },
    { key: "attacks_successful", label: "扣球Success数", type: "number", unit: "次" },
    { key: "attacks_attempted", label: "扣球尝试数", type: "number", unit: "次" },
    { key: "blocks", label: "拦网Success数", type: "number", unit: "次" },
    { key: "digs", label: "救球数", type: "number", unit: "次" },
    { key: "notes", label: "Training笔记", type: "textarea" }
  ],
  "Football": [
    { key: "duration", label: "TrainingDuration (minutes)", type: "number", unit: "min", required: true },
    { key: "distance_ran", label: "跑动距离 (km)", type: "number", unit: "km" },
    { key: "sprints", label: "冲刺次数", type: "number", unit: "次" },
    { key: "passes_completed", label: "传球Success数", type: "number", unit: "次" },
    { key: "passes_attempted", label: "传球尝试数", type: "number", unit: "次" },
    { key: "shots_on_goal", label: "射正次数", type: "number", unit: "次" },
    { key: "goals_scored", label: "进球数", type: "number", unit: "个" },
    { key: "notes", label: "Training笔记", type: "textarea" }
  ],
  "Tennis": [
    { key: "duration", label: "TrainingDuration (minutes)", type: "number", unit: "min", required: true },
    { key: "matches_played", label: "比赛场次", type: "number", unit: "场" },
    { key: "matches_won", label: "比赛获胜", type: "number", unit: "场" },
    { key: "serves_in", label: "一发Success率 (%)", type: "number", unit: "%" },
    { key: "winners", label: "制胜分", type: "number", unit: "分" },
    { key: "unforced_errors", label: "非受迫性失误", type: "number", unit: "次" },
    { key: "notes", label: "Training笔记", type: "textarea" }
  ],
  "Table Tennis": [
    { key: "duration", label: "TrainingDuration (minutes)", type: "number", unit: "min", required: true },
    { key: "rally_sets", label: "对练组数", type: "number", unit: "组" },
    { key: "serves_success", label: "发球得分", type: "number", unit: "分" },
    { key: "smashes_successful", label: "扣杀Success数", type: "number", unit: "次" },
    { key: "blocks_successful", label: "挡球Success数", type: "number", unit: "次" },
    { key: "matches_won", label: "比赛获胜", type: "number", unit: "场" },
    { key: "notes", label: "Training笔记", type: "textarea" }
  ],
  "Badminton": [
    { key: "duration", label: "TrainingDuration (minutes)", type: "number", unit: "min", required: true },
    { key: "matches_played", label: "比赛场次", type: "number", unit: "场" },
    { key: "matches_won", label: "比赛获胜", type: "number", unit: "场" },
    { key: "smashes_successful", label: "扣杀Success数", type: "number", unit: "次" },
    { key: "net_shots_successful", label: "网前球Success数", type: "number", unit: "次" },
    { key: "serves_success", label: "发球得分", type: "number", unit: "分" },
    { key: "notes", label: "Training笔记", type: "textarea" }
  ],
  "Ultimate Frisbee": [
    { key: "duration", label: "TrainingDuration (minutes)", type: "number", unit: "min", required: true },
    { key: "throws_completed", label: "Success传球数", type: "number", unit: "次" },
    { key: "throws_attempted", label: "传球尝试数", type: "number", unit: "次" },
    { key: "catches", label: "Success接球数", type: "number", unit: "次" },
    { key: "drops", label: "失误掉球数", type: "number", unit: "次" },
    { key: "scores", label: "得Score", type: "number", unit: "分" },
    { key: "defenses", label: "防守Success数", type: "number", unit: "次" },
    { key: "notes", label: "Training笔记", type: "textarea" }
  ]
};