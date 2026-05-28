
-- =============== TABLES ===============
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  invite_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL UNIQUE REFERENCES public.couples(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'trial',
  plan TEXT,
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  current_period_end TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  is_lifetime BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  category TEXT,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🎯',
  target_amount NUMERIC(12, 2) NOT NULL,
  current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============== GRANTS ===============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.couples TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.users, public.couples, public.subscriptions, public.transactions, public.goals TO service_role;

-- =============== RLS ===============
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- USERS policies
CREATE POLICY "Users view own profile" ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users view partner profile" ON public.users FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.couples c WHERE (c.user1_id = auth.uid() AND c.user2_id = users.id) OR (c.user2_id = auth.uid() AND c.user1_id = users.id))
);
CREATE POLICY "Users insert own profile" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- COUPLES policies
CREATE POLICY "Members view couple" ON public.couples FOR SELECT TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Lookup by invite code" ON public.couples FOR SELECT TO authenticated USING (invite_code IS NOT NULL AND user2_id IS NULL);
CREATE POLICY "Users create own couple" ON public.couples FOR INSERT TO authenticated WITH CHECK (auth.uid() = user1_id);
CREATE POLICY "Members update couple" ON public.couples FOR UPDATE TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id OR (user2_id IS NULL AND invite_code IS NOT NULL));
CREATE POLICY "Members delete couple" ON public.couples FOR DELETE TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- SUBSCRIPTIONS policies
CREATE POLICY "Members view sub" ON public.subscriptions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.couples c WHERE c.id = subscriptions.couple_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
);
CREATE POLICY "Members insert sub" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.couples c WHERE c.id = subscriptions.couple_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
);
CREATE POLICY "Members update sub" ON public.subscriptions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.couples c WHERE c.id = subscriptions.couple_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
);

-- TRANSACTIONS policies
CREATE POLICY "Members view tx" ON public.transactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.couples c WHERE c.id = transactions.couple_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
);
CREATE POLICY "Members insert tx" ON public.transactions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.couples c WHERE c.id = transactions.couple_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
);
CREATE POLICY "Members update tx" ON public.transactions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.couples c WHERE c.id = transactions.couple_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
);
CREATE POLICY "Members delete tx" ON public.transactions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.couples c WHERE c.id = transactions.couple_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
);

-- GOALS policies
CREATE POLICY "Members view goals" ON public.goals FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.couples c WHERE c.id = goals.couple_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
);
CREATE POLICY "Members insert goals" ON public.goals FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.couples c WHERE c.id = goals.couple_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
);
CREATE POLICY "Members update goals" ON public.goals FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.couples c WHERE c.id = goals.couple_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
);
CREATE POLICY "Members delete goals" ON public.goals FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.couples c WHERE c.id = goals.couple_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
);

-- =============== TRIGGERS ===============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_couples_updated BEFORE UPDATE ON public.couples FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + empty couple + trial sub on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_couple_id UUID;
  new_code TEXT;
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  LOOP
    new_code := LPAD(FLOOR(random() * 10000)::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.couples WHERE invite_code = new_code);
  END LOOP;

  INSERT INTO public.couples (user1_id, invite_code, status)
  VALUES (NEW.id, new_code, 'pending')
  RETURNING id INTO new_couple_id;

  INSERT INTO public.subscriptions (couple_id) VALUES (new_couple_id);

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
