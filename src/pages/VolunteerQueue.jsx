import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import { Car, MapPin, ShieldAlert, FileCheck } from "lucide-react";
import { getOwnJourneyIds } from "@/lib/sod";
import { Link } from "react-router-dom";

export default function VolunteerQueue() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [journeysById, setJourneysById] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.church_id) return;
    setLoading(true);
    const list = await base44.entities.CareTask.filter({ church_id: user.church_id, status: "open" }, "-created_date");
    setTasks(list);
    const journeyIds = [...new Set(list.map(t => t.journey_id))];
    const journeys = await Promise.all(journeyIds.map(id => base44.entities.PrayerJourney.get(id)));
    const map = {};
    journeyIds.forEach((id, i) => (map[id] = journeys[i]));
    setJourneysById(map);

    // SOD: exclude the volunteer's own requests from the queue
    const ownJourneyIds = getOwnJourneyIds(journeys, user.id);
    setTasks(list.filter(t => !ownJourneyIds.has(t.journey_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const iCanHelp = async (task) => {
    await base44.entities.CareTask.update(task.id, {
      status: "accepted",
      assigned_volunteer_id: user.id,
    });
    load();
  };

  // Risk assessment gate
  if (!user?.church_id) {
    return <div className="max-w-lg mx-auto px-6 py-16 text-center text-[#8A8375]">You need to join a church as a volunteer first — visit <Link to="/get-involved" className="underline">Get Involved</Link>.</div>;
  }
  const approved = user?.church_approved || user?.volunteer_status === "approved";
  const bgCleared = user?.background_check_status === "cleared";
  const isCareVolunteer = (user?.service_roles || []).includes("care_volunteer") || user?.app_role === "volunteer";

  if (!isCareVolunteer) {
    return <div className="max-w-lg mx-auto px-6 py-16 text-center text-[#8A8375]">You need to register as a Care Volunteer first — visit <Link to="/get-involved" className="underline">Get Involved</Link>.</div>;
  }
  if (!approved || !bgCleared) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-4" />
        <p className="font-serif text-lg text-[#2B2620] mb-2">Awaiting clearance</p>
        <p className="text-sm text-[#8A8375] mb-4">You can access the volunteer queue once your church admin approves you and your background check is cleared.</p>
        <div className="bg-[#FBF8F3] rounded-2xl p-4 text-left text-xs text-[#5B5648] space-y-2">
          <p>Church approval: <StatusBadge status={approved ? "verified" : "pending"} /></p>
          <p className="flex items-center gap-1">Background check: <StatusBadge status={bgCleared ? "verified" : user?.background_check_status === "pending" ? "pending" : "none"} /></p>
        </div>
        <Link to="/get-involved" className="inline-block mt-4 text-sm text-[#3D6E64] underline">View status →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl text-[#2B2620] mb-1">Volunteer Queue</h1>
      <p className="text-sm text-[#8A8375] mb-6">Practical support invitations from your church community.</p>

      {loading && <p className="text-sm text-[#8A8375]">Loading...</p>}
      {!loading && tasks.length === 0 && <p className="text-sm text-[#8A8375]">No open support needs right now.</p>}

      <div className="space-y-3">
        {tasks.map((task) => {
          const j = journeysById[task.journey_id];
          if (!j) return null;
          return (
            <div key={task.id} className="bg-white rounded-3xl border border-[#EFE8DA] p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm font-medium text-[#2B2620] capitalize flex items-center gap-2">
                  <Car className="w-4 h-4 text-[#3D6E64]" /> {task.type.replace(/_/g, " ")} request
                </p>
                <StatusBadge status={task.status} />
              </div>
              <p className="text-sm text-[#5B5648] mb-2">{task.details}</p>
              <p className="text-xs text-[#8A8375] mb-3">{j.ai_summary || j.message}</p>
              <Button size="sm" className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]" onClick={() => iCanHelp(task)}>
                I Can Help
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}