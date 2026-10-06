import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

const CAPABILITIES = [
  { key: "supports_students", label: "Student / international support" },
  { key: "supports_transportation", label: "Transportation" },
  { key: "supports_food", label: "Food / community assistance" },
  { key: "supports_church_planting", label: "Church planting support" },
  { key: "supports_resource_sharing", label: "Building / resource sharing" },
  { key: "supports_disaster_response", label: "Disaster response" },
];

export default function ChurchRegister() {
  const { checkUserAuth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", location: "", website: "", denomination: "", statement_of_faith: "",
    leader_name: "", leader_email: "", safeguarding_contact: "",
  });
  const [caps, setCaps] = useState({});
  const [saving, setSaving] = useState(false);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.functions.invoke("registerChurch", { ...form, ...caps });
      await checkUserAuth();
    } catch (e) {
      // handled silently
    }
    setSaving(false);
    navigate("/church-dashboard");
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl text-[#2B2620] mb-1">Register Your Church</h1>
      <p className="text-sm text-[#8A8375] mb-6">Your church will remain pending until reviewed and verified by our platform team.</p>
      <form onSubmit={submit} className="bg-white rounded-3xl border border-[#EFE8DA] p-6 space-y-4">
        <Field label="Church Name"><Input required value={form.name} onChange={(e) => update("name", e.target.value)} /></Field>
        <Field label="Location (City / Region)"><Input required value={form.location} onChange={(e) => update("location", e.target.value)} /></Field>
        <Field label="Website"><Input value={form.website} onChange={(e) => update("website", e.target.value)} /></Field>
        <Field label="Denomination"><Input value={form.denomination} onChange={(e) => update("denomination", e.target.value)} /></Field>
        <Field label="Statement of Faith"><Textarea value={form.statement_of_faith} onChange={(e) => update("statement_of_faith", e.target.value)} className="min-h-[80px]" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Authorized Leader Name"><Input required value={form.leader_name} onChange={(e) => update("leader_name", e.target.value)} /></Field>
          <Field label="Leader Email"><Input required type="email" value={form.leader_email} onChange={(e) => update("leader_email", e.target.value)} /></Field>
        </div>
        <Field label="Safeguarding Contact"><Input value={form.safeguarding_contact} onChange={(e) => update("safeguarding_contact", e.target.value)} /></Field>

        <div>
          <p className="text-sm font-medium text-[#2B2620] mb-2">Ministries & Capabilities</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CAPABILITIES.map((c) => (
              <label key={c.key} className="flex items-center gap-2 text-sm text-[#5B5648]">
                <Checkbox checked={!!caps[c.key]} onCheckedChange={(v) => setCaps((prev) => ({ ...prev, [c.key]: !!v }))} />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={saving} className="w-full rounded-full bg-[#3D6E64] hover:bg-[#2F5850] text-white">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit for Verification"}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-[#8A8375] mb-1 block">{label}</label>
      {children}
    </div>
  );
}