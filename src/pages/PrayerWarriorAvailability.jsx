import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Trash2, Plus } from "lucide-react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function PrayerWarriorAvailability() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSlot, setNewSlot] = useState({ day_of_week: "monday", start_time: "18:00", end_time: "20:00" });

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const list = await base44.entities.Availability.filter({ created_by_id: user.id }, "day_of_week");
    setSlots(list);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const addSlot = async () => {
    await base44.entities.Availability.create({
      church_id: user.church_id,
      day_of_week: newSlot.day_of_week,
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
      timezone: "America/Chicago",
    });
    load();
  };

  const removeSlot = async (id) => {
    await base44.entities.Availability.delete(id);
    load();
  };

  if (!user?.church_id) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center text-[#8A8375]">
        You need to join a church first — visit <a href="/get-involved" className="underline">Get Involved</a>.
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl text-[#2B2620] mb-1">My Availability</h1>
      <p className="text-sm text-[#8A8375] mb-6">
        Set when you're available for prayer calls. This helps the scheduling assistant connect you with people who need prayer.
      </p>

      <div className="bg-white rounded-3xl border border-[#EFE8DA] p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-4 h-4 text-[#3D6E64]" />
          <h2 className="text-sm font-medium text-[#2B2620]">Add a time slot</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#8A8375] mb-1 block">Day</label>
            <select
              value={newSlot.day_of_week}
              onChange={(e) => setNewSlot((s) => ({ ...s, day_of_week: e.target.value }))}
              className="w-full border border-[#EFE8DA] rounded-xl px-3 py-2 text-sm"
            >
              {DAYS.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#8A8375] mb-1 block">Start time</label>
              <Input type="time" value={newSlot.start_time} onChange={(e) => setNewSlot((s) => ({ ...s, start_time: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-[#8A8375] mb-1 block">End time</label>
              <Input type="time" value={newSlot.end_time} onChange={(e) => setNewSlot((s) => ({ ...s, end_time: e.target.value }))} />
            </div>
          </div>
          <Button onClick={addSlot} className="w-full rounded-full bg-[#3D6E64] hover:bg-[#2F5850]">
            Add Availability
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {loading && <p className="text-sm text-[#8A8375]">Loading...</p>}
        {!loading && slots.length === 0 && (
          <p className="text-sm text-[#8A8375] text-center py-4">No availability set yet. Add your first time slot above.</p>
        )}
        {slots.map((s) => (
          <div key={s.id} className="flex items-center justify-between bg-white rounded-2xl border border-[#EFE8DA] p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-[#3D6E64]" />
              <div>
                <p className="text-sm font-medium text-[#2B2620] capitalize">{s.day_of_week}</p>
                <p className="text-xs text-[#8A8375]">{s.start_time} – {s.end_time} ({s.timezone})</p>
              </div>
            </div>
            <button onClick={() => removeSlot(s.id)} className="text-[#B3AB9B] hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}