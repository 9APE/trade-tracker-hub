
CREATE TABLE public.cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL DEFAULT 'general',
  core_idea TEXT NOT NULL,
  source_text TEXT,
  why TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ef NUMERIC NOT NULL DEFAULT 2.5,
  interval INT NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  next_review TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_rating INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cards" ON public.cards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX cards_user_due_idx ON public.cards(user_id, next_review);

CREATE TABLE public.reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reflections TO authenticated;
GRANT ALL ON public.reflections TO service_role;
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reflections" ON public.reflections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER cards_touch BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
