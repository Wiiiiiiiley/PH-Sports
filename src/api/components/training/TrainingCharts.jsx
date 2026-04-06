import React from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

const COLORS = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444", "#14b8a6"];

// Helper function to parse training data
const parseTrainingData = (data) => {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  }
  return data;
};

function ChartWrapper({ title, children }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="h-64">{children}</CardContent>
    </Card>
  );
}

function RowingCharts({ logs }) {
  const data = logs.map(l => {
    const d = parseTrainingData(l.data);
    return { date: format(new Date(l.date), "MM/dd"), distance: d.distance || 0, split: d.avg_split_time || 0 };
  }).reverse();
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <ChartWrapper title="Distance Trend (m)">
        <ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="distance" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
      </ChartWrapper>
      <ChartWrapper title="Split Time Trend (s/500m)">
        <ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="split" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
      </ChartWrapper>
    </div>
  );
}

function BasketballCharts({ logs }) {
  const data = logs.map(l => {
    const d = parseTrainingData(l.data);
    return {
      date: format(new Date(l.date), "MM/dd"),
      fg: d.shot_attempts ? ((d.shots_made / d.shot_attempts) * 100).toFixed(1) : 0,
      tp: d.three_point_attempts ? ((d.three_point_made / d.three_point_attempts) * 100).toFixed(1) : 0,
      ft: d.ft_attempts ? ((d.ft_made / d.ft_attempts) * 100).toFixed(1) : 0,
    };
  }).reverse();
  const sessionTypes = {};
  logs.forEach(l => { sessionTypes[l.session_type] = (sessionTypes[l.session_type] || 0) + 1; });
  const pieData = Object.entries(sessionTypes).map(([name, value]) => ({ name, value }));
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <ChartWrapper title="Shooting Percentages (%)">
        <ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="fg" name="FG%" fill="#3b82f6" /><Bar dataKey="tp" name="3PT%" fill="#22c55e" /><Bar dataKey="ft" name="FT%" fill="#f97316" /></BarChart></ResponsiveContainer>
      </ChartWrapper>
      <ChartWrapper title="Session Type Breakdown">
        <ResponsiveContainer><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label>{pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
      </ChartWrapper>
    </div>
  );
}

function VolleyballCharts({ logs }) {
  const data = logs.map(l => {
    const d = parseTrainingData(l.data);
    return {
      date: format(new Date(l.date), "MM/dd"),
      serve: d.serve_attempts ? ((d.serves_successful / d.serve_attempts) * 100).toFixed(1) : 0,
      spike: d.spike_attempts ? ((d.spikes_successful / d.spike_attempts) * 100).toFixed(1) : 0,
      dig: d.dig_attempts ? ((d.digs_successful / d.dig_attempts) * 100).toFixed(1) : 0,
    };
  }).reverse();
  return (
    <ChartWrapper title="Success Rates (%)">
      <ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="serve" name="Serve %" fill="#3b82f6" /><Bar dataKey="spike" name="Spike %" fill="#22c55e" /><Bar dataKey="dig" name="Dig %" fill="#f97316" /></BarChart></ResponsiveContainer>
    </ChartWrapper>
  );
}

function FootballCharts({ logs }) {
  const data = logs.map(l => {
    const d = parseTrainingData(l.data);
    return {
      date: format(new Date(l.date), "MM/dd"),
      distance: d.distance_ran || 0,
      accuracy: d.shooting_attempts ? ((d.shots_on_target / d.shooting_attempts) * 100).toFixed(1) : 0,
    };
  }).reverse();
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <ChartWrapper title="Distance Trend (km)">
        <ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="distance" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
      </ChartWrapper>
      <ChartWrapper title="Shot Accuracy (%)">
        <ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="accuracy" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
      </ChartWrapper>
    </div>
  );
}

function TennisCharts({ logs }) {
  const data = logs.map(l => {
    const d = parseTrainingData(l.data);
    return { date: format(new Date(l.date), "MM/dd"), accuracy: d.serve_attempts ? (((d.serve_attempts - d.double_faults) / d.serve_attempts) * 100).toFixed(1) : 0, aces: d.aces || 0 };
  }).reverse();
  const sessionTypes = {};
  logs.forEach(l => { sessionTypes[l.session_type] = (sessionTypes[l.session_type] || 0) + 1; });
  const pieData = Object.entries(sessionTypes).map(([name, value]) => ({ name, value }));
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <ChartWrapper title="Serve Accuracy Trend (%)">
        <ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="accuracy" stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
      </ChartWrapper>
      <ChartWrapper title="Session Type Breakdown">
        <ResponsiveContainer><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label>{pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
      </ChartWrapper>
    </div>
  );
}

function TableTennisCharts({ logs }) {
  const data = logs.map(l => {
    const d = parseTrainingData(l.data);
    return { date: format(new Date(l.date), "MM/dd"), rallies: d.rally_sets || 0, serve: d.serve_practice || 0, spin: d.spin_drill_sets || 0, footwork: d.footwork_drills || 0 };
  }).reverse();
  return (
    <ChartWrapper title="Rally & Drill Breakdown">
      <ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="rallies" name="Rally Sets" fill="#ef4444" /><Bar dataKey="serve" name="Serve (min)" fill="#3b82f6" /><Bar dataKey="footwork" name="Footwork (min)" fill="#22c55e" /></BarChart></ResponsiveContainer>
    </ChartWrapper>
  );
}

function BadmintonCharts({ logs }) {
  const data = logs.map(l => {
    const d = parseTrainingData(l.data);
    return { date: format(new Date(l.date), "MM/dd"), accuracy: d.smash_accuracy || 0 };
  }).reverse();
  return (
    <ChartWrapper title="Smash Accuracy Trend (%)">
      <ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="accuracy" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
    </ChartWrapper>
  );
}

function UltimateFrisbeeCharts({ logs }) {
  const data = logs.map(l => {
    const d = parseTrainingData(l.data);
    return { date: format(new Date(l.date), "MM/dd"), completion: d.throw_attempts ? ((d.throws_completed / d.throw_attempts) * 100).toFixed(1) : 0 };
  }).reverse();
  return (
    <ChartWrapper title="Throw Completion Rate (%)">
      <ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="completion" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
    </ChartWrapper>
  );
}

function BilliardsCharts({ logs }) {
  const data = logs.map(l => {
    const d = parseTrainingData(l.data);
    return {
      date: format(new Date(l.date), "MM/dd"),
      winRate: d.frames_played ? ((d.frames_won / d.frames_played) * 100).toFixed(1) : 0,
      highBreak: d.highest_break || 0,
    };
  }).reverse();
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <ChartWrapper title="Win Rate (%)">
        <ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="winRate" stroke="#374151" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
      </ChartWrapper>
      <ChartWrapper title="Highest Break Score">
        <ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="highBreak" name="Highest Break" fill="#374151" /></BarChart></ResponsiveContainer>
      </ChartWrapper>
    </div>
  );
}

const CHART_MAP = {
  "Rowing": RowingCharts,
  "Basketball": BasketballCharts,
  "Volleyball": VolleyballCharts,
  "Football": FootballCharts,
  "Tennis": TennisCharts,
  "Table Tennis": TableTennisCharts,
  "Badminton": BadmintonCharts,
  "Ultimate Frisbee": UltimateFrisbeeCharts,
  "Billiards Club": BilliardsCharts,
};

export default function TrainingCharts({ sport, logs }) {
  const ChartComponent = CHART_MAP[sport];
  if (!ChartComponent || logs.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No data to chart yet. Log a few training sessions to see your stats!</p>;
  }
  return <ChartComponent logs={logs} />;
}