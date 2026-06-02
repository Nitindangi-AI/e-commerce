import { useState } from "react";
import toast from "react-hot-toast";

export default function Newsletter() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    toast.success("Thanks for subscribing! Check your inbox.");
    setEmail("");
  };

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#fcfaf7] via-[#f5f2e8] to-[#e8e4d5]" />
      <div className="relative max-w-3xl mx-auto px-6 py-28 text-center">
        <p className="text-xs tracking-[0.4em] uppercase gold mb-4">Stay Ahead</p>
        <h2 className="display text-4xl md:text-5xl font-black mb-4">Join the Inner Circle</h2>
        <p className="text-[#3d3522]/65 mb-10 leading-relaxed font-medium">
          Exclusive drops, early access, and member-only offers — straight to your inbox.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            type="email"
            className="flex-1 input-field rounded-full px-6 py-4 text-sm text-[#3d3522] placeholder-[#3d3522]/35 bg-white/70 border border-[#e8e4d5]"
          />
          <button type="submit" className="btn-gold px-8 py-4 rounded-full text-sm tracking-widest uppercase whitespace-nowrap shadow-md">
            Subscribe
          </button>
        </form>
        <p className="text-[#3d3522]/40 text-xs mt-6 font-medium">No spam. Unsubscribe anytime.</p>
      </div>
    </section>
  );
}
