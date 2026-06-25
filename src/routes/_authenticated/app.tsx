import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sm2, isDue, nextReviewLabel, isMastered } from "@/lib/sm2";
import { toast } from "sonner";
import { LogOut, Plus, Brain, Library, Trash2, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Your deck — Recall" }] }),
  component: AppHome,
});

type Card = {
  id: string;
  tag: string;
  core_idea: string;
  source_text: string | null;
  why: string | null;
  questions: { label: string; text: string }[];
  ef: number;
  interval: number;
  review_count: number;
  next_review: string;
  last_rating: number | null;
  created_at: string;
};

type Tab = "review" | "capture" | "deck";

function AppHome() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("review");
  const qc = useQueryClient();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["cards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("*").order("next_review", { ascending: true });
      if (error) throw error;
      return data as unknown as Card[];
    },
  });

  const due = useMemo(() => cards.filter((c) => isDue(c.next_review)), [cards]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-2xl px-5 pb-24 pt-7">
        <header className="mb-8 flex items-center justify-between">
          <Link to="/" className="serif-italic text-2xl">Recall</Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">{due.length} due</span>
            <button onClick={signOut} className="rounded-full border border-border p-1.5 text-ink-3 hover:bg-secondary hover:text-ink" title="Sign out"><LogOut size={14} /></button>
          </div>
        </header>

        <nav className="mb-7 flex gap-1 rounded-xl border border-border bg-card p-1">
          {([
            { k: "review", label: "Review", icon: Brain },
            { k: "capture", label: "Capture", icon: Plus },
            { k: "deck", label: "Deck", icon: Library },
          ] as const).map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${tab === t.k ? "bg-primary text-primary-foreground" : "text-ink-3 hover:text-ink"}`}>
              <t.icon size={14} />{t.label}
              {t.k === "review" && due.length > 0 && tab !== "review" && (<span className="ml-1 h-1.5 w-1.5 rounded-full bg-accent" />)}
            </button>
          ))}
        </nav>

        {isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-ink-3">Loading…</div>
        ) : tab === "review" ? (
          <ReviewPanel due={due} totalCount={cards.length} />
        ) : tab === "capture" ? (
          <CapturePanel onSaved={() => setTab("deck")} />
        ) : (
          <DeckPanel cards={cards} />
        )}
      </div>
    </div>
  );
}

// ───────── Capture ─────────
function CapturePanel({ onSaved }: { onSaved: () => void }) {
  const qc = useQueryClient();
  const [tag, setTag] = useState("");
  const [coreIdea, setCoreIdea] = useState("");
  const [source, setSource] = useState("");
  const [why, setWhy] = useState("");
  const [questions, setQuestions] = useState([
    { label: "Definition", text: "" },
    { label: "Application", text: "" },
  ]);

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const filtered = questions.filter((q) => q.text.trim());
      if (!coreIdea.trim()) throw new Error("Add a core idea");
      if (!filtered.length) throw new Error("Add at least one review question");
      const { error } = await supabase.from("cards").insert({
        user_id: u.user.id,
        tag: tag.trim() || "general",
        core_idea: coreIdea.trim(),
        source_text: source.trim() || null,
        why: why.trim() || null,
        questions: filtered as any,
        next_review: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cards"] });
      toast.success("Saved — due for review today");
      setTag(""); setCoreIdea(""); setSource(""); setWhy("");
      setQuestions([{ label: "Definition", text: "" }, { label: "Application", text: "" }]);
      onSaved();
    },
    onError: (e: any) => toast.error(e.message ?? "Couldn't save"),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-bold">New card</h2>
      <p className="mt-1 text-sm text-ink-3">Distill an idea worth keeping, then write the questions that'll test you on it.</p>

      <div className="mt-5 space-y-4">
        <Field label="Tag" hint="e.g. 'product', 'biology', 'stoicism'">
          <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="general" className="w-full rounded-lg border border-border bg-paper px-3 py-2 text-sm outline-none focus:border-accent" />
        </Field>

        <Field label="Core idea" hint="One or two sentences. Plain language.">
          <textarea value={coreIdea} onChange={(e) => setCoreIdea(e.target.value)} rows={3} placeholder="The single most important thing to remember…" className="w-full resize-none rounded-lg border border-border bg-paper px-3 py-2 text-sm outline-none focus:border-accent" />
        </Field>

        <Field label="Source (optional)" hint="Paste the original passage so you can rediscover the context later.">
          <textarea value={source} onChange={(e) => setSource(e.target.value)} rows={3} placeholder="Quote, article excerpt, or note…" className="w-full resize-none rounded-lg border border-border bg-paper px-3 py-2 text-sm outline-none focus:border-accent" />
        </Field>

        <Field label="Why you saved this (optional)" hint="A short note to your future self.">
          <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Because it changed how I think about…" className="w-full rounded-lg border border-border bg-paper px-3 py-2 text-sm outline-none focus:border-accent" />
        </Field>

        <div>
          <div className="mb-2 flex items-end justify-between">
            <div>
              <div className="font-display text-sm font-semibold">Review questions</div>
              <div className="text-xs text-ink-3">Write your own. Different angles make memory stick.</div>
            </div>
            <button type="button" onClick={() => setQuestions([...questions, { label: "Question", text: "" }])} className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-secondary">+ Add</button>
          </div>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={i} className="rounded-lg border border-border bg-paper p-3">
                <div className="mb-2 flex gap-2">
                  <input value={q.label} onChange={(e) => { const c = [...questions]; c[i].label = e.target.value; setQuestions(c); }} placeholder="Label" className="w-32 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium outline-none focus:border-accent" />
                  {questions.length > 1 && (
                    <button type="button" onClick={() => setQuestions(questions.filter((_, x) => x !== i))} className="ml-auto text-ink-4 hover:text-destructive"><Trash2 size={14} /></button>
                  )}
                </div>
                <textarea value={q.text} onChange={(e) => { const c = [...questions]; c[i].text = e.target.value; setQuestions(c); }} rows={2} placeholder="The prompt you want to be asked in review…" className="w-full resize-none rounded-md border border-border bg-card px-2 py-1.5 text-sm outline-none focus:border-accent" />
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => create.mutate()} disabled={create.isPending} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">{create.isPending ? "Saving…" : "Save card →"}</button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-display text-sm font-semibold">{label}</span>
        {hint && <span className="text-xs text-ink-4">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

// ───────── Review ─────────
function ReviewPanel({ due, totalCount }: { due: Card[]; totalCount: number }) {
  const qc = useQueryClient();
  const [queue] = useState(() => [...due].sort(() => Math.random() - 0.5));
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const card = queue[i];

  const qIndex = card ? card.review_count % Math.max(1, card.questions.length) : 0;
  const question = card?.questions[qIndex];

  const rate = useMutation({
    mutationFn: async (quality: 0 | 3 | 5) => {
      if (!card) return;
      const { ef, interval } = sm2(card, quality);
      const nextReview = new Date(); nextReview.setDate(nextReview.getDate() + interval);
      const { error } = await supabase.from("cards").update({
        ef, interval, review_count: card.review_count + 1,
        next_review: nextReview.toISOString(), last_rating: quality,
      }).eq("id", card.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cards"] });
      setRevealed(false); setAnswer(""); setI(i + 1);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!queue.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <div className="text-3xl">{totalCount === 0 ? "📚" : "✓"}</div>
        <p className="mt-3 font-display text-lg font-bold">{totalCount === 0 ? "Nothing in your deck yet" : "All caught up"}</p>
        <p className="mt-1 text-sm text-ink-3">{totalCount === 0 ? "Head to Capture and add your first card." : "No cards due right now. Come back later."}</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <div className="text-3xl">🎯</div>
        <p className="mt-3 font-display text-lg font-bold">Session complete</p>
        <p className="mt-1 text-sm text-ink-3">Reviewed {queue.length} card{queue.length !== 1 ? "s" : ""}.</p>
      </div>
    );
  }

  const pct = Math.round((i / queue.length) * 100);
  const nextEasy = sm2(card, 5).interval;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-ink-3">
        <span>{i} of {queue.length} done</span><span>{pct}%</span>
      </div>
      <div className="mb-5 h-1 rounded-full bg-border overflow-hidden"><div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} /></div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-paper px-5 py-3 text-xs">
          <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-ink-2">{card.tag}</span>
          {question && <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">{question.label}</span>}
          {isMastered(card.interval) && <span className="rounded-full bg-violet-soft px-2 py-0.5 font-semibold text-violet">Mastered</span>}
          <span className="ml-auto text-ink-4">Card {i + 1} / {queue.length}</span>
        </div>
        <div className="p-5">
          <div className="font-display text-xl font-bold leading-snug">{question?.text}</div>

          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} placeholder="Write your answer from memory…" className="mt-4 w-full resize-none rounded-lg border border-border bg-paper px-3 py-2 text-sm outline-none focus:border-accent" />

          {!revealed ? (
            <button onClick={() => setRevealed(true)} className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">Reveal answer →</button>
          ) : (
            <>
              <div className="mt-4 rounded-xl border border-border bg-paper p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-4">Core idea</div>
                <div className="mt-1 text-sm leading-relaxed">{card.core_idea}</div>
                {card.why && (<>
                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Why you saved this</div>
                  <div className="mt-1 text-sm italic text-ink-3">{card.why}</div>
                </>)}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <RateBtn label="Missed it" sub="Tomorrow" tone="hard" onClick={() => rate.mutate(0)} />
                <RateBtn label="Nearly" sub="3 days" tone="ok" onClick={() => rate.mutate(3)} />
                <RateBtn label="Got it" sub={`${nextEasy} days`} tone="easy" onClick={() => rate.mutate(5)} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RateBtn({ label, sub, tone, onClick }: { label: string; sub: string; tone: "hard" | "ok" | "easy"; onClick: () => void }) {
  const cls = tone === "hard"
    ? "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10"
    : tone === "ok"
    ? "border-info/30 bg-info-soft text-info hover:bg-info-soft/80"
    : "border-success/30 bg-success-soft text-success hover:bg-success-soft/80";
  return (
    <button onClick={onClick} className={`rounded-xl border px-3 py-3 text-center transition ${cls}`}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-[11px] opacity-70">{sub}</div>
    </button>
  );
}

// ───────── Deck ─────────
function DeckPanel({ cards }: { cards: Card[] }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "due" | "mastered">("all");

  const filtered = cards.filter((c) => filter === "all" ? true : filter === "due" ? isDue(c.next_review) : isMastered(c.interval));

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cards"] }); toast.success("Card deleted"); },
  });

  if (!cards.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <div className="text-3xl">📚</div>
        <p className="mt-3 font-display text-lg font-bold">Empty deck</p>
        <p className="mt-1 text-sm text-ink-3">Switch to Capture to add your first card.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex gap-2 text-xs">
        {(["all", "due", "mastered"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1 font-medium capitalize ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border text-ink-3 hover:bg-secondary"}`}>{f}</button>
        ))}
        <span className="ml-auto self-center text-ink-4">{filtered.length} card{filtered.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="space-y-3">
        {filtered.map((c) => (
          <article key={c.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-ink-2">{c.tag}</span>
              {isMastered(c.interval) && <span className="rounded-full bg-violet-soft px-2 py-0.5 font-semibold text-violet">Mastered</span>}
              <span className="ml-auto text-ink-4">{nextReviewLabel(c.next_review)} · {c.review_count} review{c.review_count !== 1 ? "s" : ""}</span>
              <button onClick={() => { if (confirm("Delete this card?")) remove.mutate(c.id); }} className="text-ink-4 hover:text-destructive"><Trash2 size={14} /></button>
            </div>
            <p className="text-sm leading-relaxed">{c.core_idea}</p>
            {c.why && <p className="mt-2 text-xs italic text-ink-3">— {c.why}</p>}
            {c.questions.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-ink-3 hover:text-ink">{c.questions.length} review question{c.questions.length !== 1 ? "s" : ""}</summary>
                <ul className="mt-2 space-y-1.5">
                  {c.questions.map((q, idx) => (
                    <li key={idx} className="rounded-md bg-paper p-2 text-xs">
                      <span className="mr-2 font-semibold text-accent">{q.label}</span>{q.text}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
