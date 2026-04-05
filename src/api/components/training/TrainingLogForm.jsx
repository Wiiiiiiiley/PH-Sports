import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { TRAINING_FIELDS } from "@/lib/sports-training-fields";
import { SPORT_SESSION_TYPES } from "@/lib/sports-config";
import { format } from "date-fns";

export default function TrainingLogForm({ sport, onSubmit, saving }) {
  const fields = TRAINING_FIELDS[sport] || [];
  const sessionTypes = SPORT_SESSION_TYPES[sport] || [];
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    duration: "",
    session_type: "",
    notes: "",
    data: {},
  });

  const updateField = (key, value) => {
    setFormData(prev => ({
      ...prev,
      data: { ...prev.data, [key]: parseFloat(value) || 0 }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      duration: parseFloat(formData.duration) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Duration (min)</Label>
          <Input type="number" value={formData.duration} onChange={e => setFormData(p => ({ ...p, duration: e.target.value }))} placeholder="60" required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{sport === "Billiards Club" ? "Drill Type" : "Session Type"}</Label>
        <Select value={formData.session_type} onValueChange={v => setFormData(p => ({ ...p, session_type: v }))}>
          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            {sessionTypes.map(t => (
              <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {fields.map(field => (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs">{field.label}</Label>
            <Input
              type="number"
              step="any"
              value={formData.data[field.key] || ""}
              onChange={e => updateField(field.key, e.target.value)}
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Any additional notes..." rows={3} />
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Log Training Session
      </Button>
    </form>
  );
}