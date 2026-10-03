import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { HandHeart, HeartHandshake, Church, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "@/components/shared/Logo";

const HERO_IMG = "https://media.base44.com/images/public/6aa22be9a709fe9e7a17a711/93fb0f247_generated_image.png";

export default function Home() {
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const startRequest = (prefill) => {
    const text = prefill !== undefined ? prefill : message;
    sessionStorage.setItem("bridge_draft", JSON.stringify({ message: text, anonymous }));
    if (!isAuthenticated) {
      navigate("/login?returnTo=" + encodeURIComponent("/request/new"));
    } else {
      navigate("/request/new");
    }
  };

  return (
    <div>
      <section className="relative overflow-hidden">
        <img
          src={HERO_IMG}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FBF8F3]/60 via-[#FBF8F3]/85 to-[#FBF8F3]" />
        <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-14 text-center">
          <Logo className="max-w-[200px] mx-auto mb-6" />
          <p className="text-xs uppercase tracking-[0.2em] text-[#8FAE9E] font-medium mb-4">You are not alone</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#2B2620] leading-tight mb-4">
            How can we pray<br />for you today?
          </h1>
          <p className="text-[#8A8375] mb-10 max-w-md mx-auto">
            Share your need — as much or as little as you're comfortable. Our AI listens, prays with you, and gently connects you to the right support.
          </p>

          <div className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(60,50,30,0.15)] border border-[#EFE8DA] p-5 sm:p-6 text-left">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your prayer request or need here..."
              className="min-h-[110px] resize-none border-none focus-visible:ring-0 text-[15px] px-0 shadow-none"
              maxLength={2000}
            />
            <div className="flex items-center justify-between border-t border-[#F3EEE1] pt-4 mt-2">
              <div className="flex items-center gap-2">
                <Switch checked={anonymous} onCheckedChange={setAnonymous} id="anon" />
                <label htmlFor="anon" className="text-sm text-[#8A8375]">Submit anonymously</label>
              </div>
              <Button
                onClick={() => startRequest()}
                disabled={!message.trim()}
                className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850] text-white px-5"
              >
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-[#B3AB9B] mt-8">
            "Cast all your anxiety on him because he cares for you." — 1 Peter 5:7
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="font-serif text-xl text-[#2B2620] text-center mb-1">How would you like to be part of this?</h2>
        <p className="text-sm text-[#8A8375] text-center mb-6">Three simple ways to join our community</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SignupCard
            icon={HandHeart}
            title="I Need Prayer"
            description="Share your request — our AI listens, asks the right questions, and connects you to prayer and care."
            cta="Submit a Request"
            to="/request/new"
            highlight
          />
          <SignupCard
            icon={HeartHandshake}
            title="Serve Your Community"
            description="Join a verified church to offer prayer, practical support, or help coordinate care."
            cta="Get Involved"
            to="/get-involved"
            userRole={user?.service_roles?.[0]}
            approved={user?.church_approved}
          />
          <SignupCard
            icon={Church}
            title="Register a Church"
            description="List your church to receive prayer requests and mobilize your prayer team and volunteers."
            cta="Register Church"
            to="/register-church"
          />
        </div>
      </section>
    </div>
  );
}

function SignupCard({ icon: Icon, title, description, cta, to, highlight, userRole, approved }) {
  const showStatus = userRole === "prayer_warrior";
  const statusLabel = approved ? "Approved ✓" : "Pending Approval";
  return (
    <div className={`bg-white rounded-2xl border p-5 flex flex-col ${highlight ? "border-[#3D6E64] ring-1 ring-[#3D6E64]/20" : "border-[#EFE8DA]"}`}>
      <div className="w-10 h-10 rounded-full bg-[#EAF2EE] flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-[#3D6E64]" />
      </div>
      <h3 className="font-medium text-[#2B2620] mb-1">{title}</h3>
      <p className="text-xs text-[#8A8375] leading-relaxed mb-4 flex-1">{description}</p>
      {showStatus ? (
        <Link to={to}>
          <Button className={`w-full rounded-full text-sm ${approved ? "bg-[#3D6E64] hover:bg-[#2F5850] text-white" : "bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"}`}>
            {statusLabel}
          </Button>
        </Link>
      ) : (
        <Link to={to}>
          <Button className={`w-full rounded-full text-sm ${highlight ? "bg-[#3D6E64] hover:bg-[#2F5850]" : "bg-white border border-[#EFE8DA] text-[#2B2620] hover:bg-[#F3EEE1]"}`}>
            {cta}
          </Button>
        </Link>
      )}
    </div>
  );
}