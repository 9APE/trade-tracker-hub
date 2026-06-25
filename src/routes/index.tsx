import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <div className="serif-italic text-2xl">Recall</div>
        <Link to="/auth" className="rounded-full border border-border-strong px-4 py-1.5 text-sm font-medium hover:bg-secondary">Sign in</Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 pt-16 pb-24">
        <p className="mb-5 inline-block rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">Spaced repetition · for ideas, not flashcards</p>
        <h1 className="font-display text-5xl font-extrabold leading-[1.05] sm:text-6xl">
          Save what matters.<br />
          <span className="serif-italic font-medium text-ink-2">Review it the moment</span><br />
          you'd otherwise forget.
        </h1>
        <p className="mt-6 max-w-lg text-lg text-ink-3">
          Paste a highlight, idea, or quote. Write your own review questions. Recall hands them back to you on a smart schedule — so what you read actually sticks.
        </p>
        <div className="mt-10 flex gap-3">
          <Link to="/auth" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">Start your deck →</Link>
          <a href="#how" className="rounded-full border border-border-strong px-6 py-3 text-sm font-semibold hover:bg-secondary">How it works</a>
        </div>

        <section id="how" className="mt-24 grid gap-5 sm:grid-cols-3">
          {[
            { n: "01", t: "Capture", d: "Paste an idea worth keeping. Write the core takeaway and a few angles to test yourself on." },
            { n: "02", t: "Review", d: "Recall serves cards back to you at expanding intervals — tomorrow, in three days, in a week." },
            { n: "03", t: "Reflect", d: "Rate how well you remembered. Add new thoughts as your understanding deepens." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
              <div className="serif-italic text-sm text-accent">{s.n}</div>
              <div className="mt-1 font-display text-lg font-bold">{s.t}</div>
              <p className="mt-2 text-sm text-ink-3">{s.d}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
