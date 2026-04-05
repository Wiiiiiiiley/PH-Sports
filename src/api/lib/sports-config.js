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