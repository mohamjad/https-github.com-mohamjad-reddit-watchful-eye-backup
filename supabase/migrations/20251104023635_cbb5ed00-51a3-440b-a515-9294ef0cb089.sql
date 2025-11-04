-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text CHECK (plan IN ('free','basic','pro')) DEFAULT 'free',
  status text CHECK (status IN ('active','past_due','canceled')) DEFAULT 'active',
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create keywords table
CREATE TABLE IF NOT EXISTS public.keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  phrase text NOT NULL,
  is_regex boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create sources table
CREATE TABLE IF NOT EXISTS public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  subreddit text,
  include_comments boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS public.matches (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  keyword_id uuid REFERENCES keywords ON DELETE SET NULL,
  platform_id text NOT NULL UNIQUE,
  title text,
  body text,
  url text,
  author text,
  subreddit text,
  created_at_utc timestamptz NOT NULL,
  inserted_at timestamptz DEFAULT now()
);

-- Create notification_channels table
CREATE TABLE IF NOT EXISTS public.notification_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type text CHECK (type IN ('email','slack')) NOT NULL,
  address text NOT NULL,
  is_verified boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for keywords
CREATE POLICY "Users can view own keywords" ON public.keywords FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own keywords" ON public.keywords FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own keywords" ON public.keywords FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own keywords" ON public.keywords FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for sources
CREATE POLICY "Users can view own sources" ON public.sources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sources" ON public.sources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sources" ON public.sources FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sources" ON public.sources FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for matches
CREATE POLICY "Users can view own matches" ON public.matches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own matches" ON public.matches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own matches" ON public.matches FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for notification_channels
CREATE POLICY "Users can view own channels" ON public.notification_channels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own channels" ON public.notification_channels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own channels" ON public.notification_channels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own channels" ON public.notification_channels FOR DELETE USING (auth.uid() = user_id);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (new.id, 'free', 'active');
  
  RETURN new;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_keywords_user_id ON public.keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_sources_user_id ON public.sources(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON public.matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches(created_at_utc DESC);
CREATE INDEX IF NOT EXISTS idx_notification_channels_user_id ON public.notification_channels(user_id);