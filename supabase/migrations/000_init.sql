-- D:\MyProjects\greenfield-scanwin\supabase\migrations\000_init.sql

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


--1. Create campaigns table FIRST
CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('seasonal', 'product_launch', 'global_quest')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    rules JSONB NOT NULL,
    reward JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


--2. Now create qr_codes table with campaign reference
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id INTEGER NOT NULL,
    banner_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    location GEOGRAPHY(POINT) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL
);


--3. Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    points INTEGER DEFAULT 0 NOT NULL,
    level INTEGER DEFAULT 1 NOT NULL,
    badges TEXT[] DEFAULT '{}'::text[],
    referral_code TEXT UNIQUE,
    last_activity TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


--4. Scans Table
CREATE TABLE scans (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    qr_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    scan_time TIMESTAMPTZ DEFAULT NOW(),
    receipt_image TEXT,
    ocr_data JSONB,
    validation_status TEXT CHECK (validation_status IN ('pending', 'verified', 'rejected')),
    points_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


--5. Social Shares Table
CREATE TABLE social_shares (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    content TEXT,
    share_time TIMESTAMPTZ DEFAULT NOW(),
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


--6. Referrals Table
CREATE TABLE referrals (
    id SERIAL PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    points_awarded INTEGER DEFAULT 0,
    UNIQUE (referrer_id, referee_id)
);


--7. Leaderboard Materialized View (corrected)
CREATE MATERIALIZED VIEW leaderboard AS
SELECT 
    u.id,
    u.email,
    COALESCE(SUM(s.points_awarded), 0) AS scan_points,
    COALESCE(SUM(sh.points_earned), 0) AS social_points,
    COALESCE(SUM(r.points_awarded), 0) AS referral_points,
    COALESCE(SUM(s.points_awarded), 0) + 
    COALESCE(SUM(sh.points_earned), 0) + 
    COALESCE(SUM(r.points_awarded), 0) AS total_points,
    u.level,
    u.badges
FROM users u
LEFT JOIN scans s ON u.id = s.user_id
LEFT JOIN social_shares sh ON u.id = sh.user_id
LEFT JOIN referrals r ON u.id = r.referrer_id
GROUP BY u.id, u.email
ORDER BY total_points DESC;


--8. Refresh leaderboard function
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;


--9. Create triggers to refresh leaderboard
CREATE TRIGGER refresh_scan_leaderboard
AFTER INSERT OR UPDATE OR DELETE ON scans
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_leaderboard();


CREATE TRIGGER refresh_share_leaderboard
AFTER INSERT OR UPDATE OR DELETE ON social_shares
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_leaderboard();


CREATE TRIGGER refresh_referral_leaderboard
AFTER INSERT OR UPDATE OR DELETE ON referrals
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_leaderboard();


--10. Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_qr_codes_location ON qr_codes USING GIST(location);
CREATE INDEX idx_scans_user_id ON scans(user_id);
CREATE INDEX idx_social_shares_user_id ON social_shares(user_id);
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);


--11. Function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users(id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


--12. Trigger for auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

--13.
CREATE POLICY "Allow QR code uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'qr-codes2')

--14. 
CREATE OR REPLACE FUNCTION validate_receipt(p_qr_id UUID, p_receipt_data JSONB)
RETURNS TABLE(is_valid BOOLEAN, campaign_id INTEGER, points INTEGER) AS $$
DECLARE
    v_receipt_total NUMERIC;
    v_min_amount NUMERIC := 0;
    v_reward_type TEXT;
    v_campaign_id INTEGER;
BEGIN
    -- Validate receipt data structure
    IF p_receipt_data->>'total' IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL, 0;
    END IF;


    -- Parse receipt total safely
    BEGIN
        v_receipt_total := (p_receipt_data->>'total')::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, NULL, 0;
    END;


    -- Get campaign info
    SELECT 
        q.campaign_id, 
        c.reward->>'type',
        COALESCE((c.rules->>'min_receipt_amount')::NUMERIC, 0)
    INTO v_campaign_id, v_reward_type, v_min_amount
    FROM qr_codes q
    LEFT JOIN campaigns c ON q.campaign_id = c.id
    WHERE q.id = p_qr_id
      AND c.is_active = TRUE
      AND CURRENT_TIMESTAMP BETWEEN c.start_date AND c.end_date;


    -- Validate campaign and receipt amount
    IF NOT FOUND OR v_receipt_total < v_min_amount THEN
        RETURN QUERY SELECT FALSE, NULL, 0;
    END IF;


    -- Return result with points
    RETURN QUERY 
    SELECT 
        TRUE,
        v_campaign_id,
        CASE v_reward_type
            WHEN 'coupon' THEN 50
            WHEN 'content' THEN 100
            WHEN 'social' THEN 150
            WHEN 'referral' THEN 200
            ELSE 25
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--15.
-- Error logging table
CREATE TABLE error_logs (
  id SERIAL PRIMARY KEY,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  qr_id UUID REFERENCES qr_codes(id),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add index for error analysis
CREATE INDEX idx_error_logs_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_time ON error_logs(created_at);

--16. Create the user_rewards table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_rewards (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  reward_level INTEGER NOT NULL,
  reward_type TEXT,
  reward_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on user_rewards
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

-- Create policy allowing users to read their own rewards
CREATE POLICY "User can view their own rewards" 
ON public.user_rewards
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy allowing users to read their own user data
CREATE POLICY "User can view their own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Add the is_active column to campaigns table with default value
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;

-- Optional: Update existing records if needed
-- UPDATE public.campaigns SET is_active = TRUE WHERE is_active IS NULL;

-- First check if they reference other missing columns
SELECT prosrc FROM pg_proc WHERE proname IN ('wallgate-receipt', 'validate_receipt');

-- Update if necessary (example)
CREATE OR REPLACE FUNCTION public.validate_receipt()
RETURNS void AS $$
BEGIN
  -- Updated procedure logic
END;
$$ LANGUAGE plpgsql;        

-- Create a validation view to check for common schema issues
CREATE OR REPLACE VIEW public.schema_validation AS
SELECT 'campaigns' AS table_name, 
       COUNT(*) AS missing_is_active 
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name = 'is_active'
HAVING COUNT(*) = 0;

-- Add column comments to document the purpose
COMMENT ON COLUMN public.campaigns.is_active 
IS 'Flag indicating whether campaign is currently active (default: TRUE)';

-- Drop the first version of the function
DROP FUNCTION IF EXISTS public.validate_receipt(p_qr_id UUID, p_receipt_data JSONB);

-- Drop the second version of the function
DROP FUNCTION IF EXISTS public.validate_receipt(p_receipt_data JSONB, p_qr_id UUID);

CREATE OR REPLACE FUNCTION public.validate_receipt(p_qr_id UUID, p_receipt_data JSONB)
RETURNS JSONB AS $$
DECLARE
  v_campaign_record RECORD;
  v_receipt_total NUMERIC;
BEGIN
  -- Check for required fields in the receipt data
  IF p_receipt_data->>'total' IS NULL THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'message', 'Receipt data is missing the total amount.',
      'error_code', 'MISSING_TOTAL'
    );
  END IF;

  -- Safely parse the total amount from the receipt
  BEGIN
    v_receipt_total := (p_receipt_data->>'total')::NUMERIC;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'message', 'Receipt total is not a valid number.',
      'error_code', 'INVALID_TOTAL'
    );
  END;

  -- Get campaign details and check if it's active and within the date range
  SELECT * INTO v_campaign_record
  FROM public.campaigns c
  JOIN public.qr_codes q ON c.id = q.campaign_id
  WHERE q.id = p_qr_id;

  IF NOT FOUND THEN
      RETURN jsonb_build_object(
          'is_valid', false, 
          'message', 'No campaign found for this QR code.',
          'error_code', 'CAMPAIGN_NOT_FOUND'
      );
  END IF;

  IF v_campaign_record.is_active != TRUE THEN
      RETURN jsonb_build_object(
          'is_valid', false, 
          'message', 'This campaign is not currently active.',
          'error_code', 'CAMPAIGN_INACTIVE'
      );
  END IF;

  IF CURRENT_TIMESTAMP NOT BETWEEN v_campaign_record.start_date AND v_campaign_record.end_date THEN
      RETURN jsonb_build_object(
          'is_valid', false, 
          'message', 'This campaign has expired or has not yet started.',
          'error_code', 'CAMPAIGN_EXPIRED'
      );
  END IF;

  -- If all checks pass, return a success object
  RETURN jsonb_build_object('is_valid', true);

EXCEPTION WHEN OTHERS THEN
  -- Catch any other unexpected server errors
  RETURN jsonb_build_object(
    'is_valid', false,
    'message', SQLERRM,
    'error_code', 'SERVER_ERROR'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add this to the end of your 000_init.sql file
CREATE OR REPLACE FUNCTION public.update_user_progress(
    p_user_id UUID,
    p_points INTEGER,
    p_level INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- Update user's points and level
    UPDATE public.users
    SET 
        points = points + p_points,
        level = GREATEST(level, p_level) -- Only update level if higher
    WHERE id = p_user_id;
    
    -- Add reward to user_rewards table
    INSERT INTO public.user_rewards (user_id, reward_level)
    VALUES (p_user_id, p_level)
    ON CONFLICT DO NOTHING;
    
    -- Refresh leaderboard
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_unique_user_id_idx ON public.leaderboard(id);

--
-- Create these in your Supabase database

-- Weekly scan data function
CREATE OR REPLACE FUNCTION get_weekly_scan_data()
RETURNS integer[] AS $$
DECLARE
  result integer[];
BEGIN
  SELECT ARRAY[
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 6),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 5),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 4),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 3),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 2),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 1),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)
  ] INTO result FROM scans;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Weekly share data function
CREATE OR REPLACE FUNCTION get_weekly_share_data()
RETURNS integer[] AS $$
DECLARE
  result integer[];
BEGIN
  SELECT ARRAY[
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 6),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 5),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 4),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 3),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 2),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 1),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)
  ] INTO result FROM social_shares;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Creates a policy to allow anyone to read the public users data.
-- This is necessary for the leaderboard to display emails and points.
CREATE POLICY "Allow public read-only access to users for leaderboard"
ON public.users
FOR SELECT
USING (true);

-- Creates a policy to allow anyone to read the public scans data.
-- This is needed for counting points for the leaderboard.
CREATE POLICY "Allow public read-only access to scans"
ON public.scans
FOR SELECT
USING (true);

-- Creates a policy to allow anyone to read the public social shares data.
-- This is needed for counting points for the leaderboard.
CREATE POLICY "Allow public read-only access to social shares"
ON public.social_shares
FOR SELECT
USING (true);

-- Creates a policy to allow anyone to read the public referrals data.
-- This is needed for counting points for the leaderboard.
CREATE POLICY "Allow public read-only access to referrals"
ON public.referrals
FOR SELECT
USING (true);

-- 1. Create required functions if they don't exist
CREATE OR REPLACE FUNCTION get_weekly_scan_data()
RETURNS integer[] AS $$
DECLARE
  result integer[];
BEGIN
  SELECT ARRAY[
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 6),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 5),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 4),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 3),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 2),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE - 1),
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)
  ] INTO result FROM scans;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_platform_share_distribution()
RETURNS TABLE(platform text, count bigint) AS $$
BEGIN
  RETURN QUERY 
  SELECT platform, COUNT(*) as count
  FROM social_shares
  GROUP BY platform;
END;
$$ LANGUAGE plpgsql;

-- 2. Apply RLS policies to underlying tables
CREATE POLICY "Allow public read access to users" 
ON public.users 
FOR SELECT USING (true);

CREATE POLICY "Allow public read access to scans" 
ON public.scans 
FOR SELECT USING (true);

CREATE POLICY "Allow public read access to social_shares" 
ON public.social_shares 
FOR SELECT USING (true);

CREATE POLICY "Allow public read access to referrals" 
ON public.referrals 
FOR SELECT USING (true);

-- 3. Ensure leaderboard view is properly indexed
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_unique_user_id_idx 
ON public.leaderboard(id);

-- 4. Refresh materialized view to ensure current data
REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;

-- Verify RLS Policies Are Correct/policies with permissive = true and roles = public
SELECT * FROM pg_policies 
WHERE tablename IN ('users', 'scans', 'social_shares', 'referrals');

-- Check Materialized View Data
-- Check if leaderboard has data
SELECT COUNT(*) FROM leaderboard;

-- Check underlying tables
SELECT COUNT(*) FROM scans;
SELECT COUNT(*) FROM social_shares;
SELECT COUNT(*) FROM referrals;

-- Granting explicit permissions to the internal postgres role is a robust way 
-- to ensure triggers and functions have the access they need.
GRANT ALL ON TABLE public.users TO postgres;

-- This policy allows a user to insert their own corresponding row into the 
-- public.users table. This is the primary fix for the sign-up trigger.
CREATE POLICY "Allow users to insert their own profile"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

--
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS scans_today INTEGER DEFAULT 0 NOT NULL;

-- Drop the old, incorrect materialized view
DROP MATERIALIZED VIEW IF EXISTS public.leaderboard;

-- Create the new, correct view that reads directly from the users table
CREATE MATERIALIZED VIEW public.leaderboard AS
SELECT
    id,
    email,
    points AS total_points, -- This now uses the correct points column from the users table
    level,
    badges
FROM 
    public.users
ORDER BY 
    total_points DESC;

-- Re-create the unique index for the new view, which is required for concurrent refreshes
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_unique_user_id_idx ON public.leaderboard(id);

-- Drop the old triggers that were watching the wrong tables
DROP TRIGGER IF EXISTS refresh_scan_leaderboard ON public.scans;
DROP TRIGGER IF EXISTS refresh_share_leaderboard ON public.social_shares;
DROP TRIGGER IF EXISTS refresh_referral_leaderboard ON public.referrals;

-- Create a new, correct trigger that watches for changes to the 'points' column on the users table
CREATE OR REPLACE TRIGGER on_user_points_change
AFTER UPDATE OF points ON public.users
FOR EACH ROW
EXECUTE FUNCTION refresh_leaderboard();

--
-- Update user handling function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, points, level, badges, scans_today)
  VALUES (NEW.id, NEW.email, 0, 1, '{}', 0)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Add RLS policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow users to insert their own profile') THEN
    CREATE POLICY "Allow users to insert their own profile" 
    ON public.users 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow users to update their own profile') THEN
    CREATE POLICY "Allow users to update their own profile"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id);
  END IF;
END $$;

--
-- A more robust function to create a user profile upon signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger for new user creation to ensure it uses the new function.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Drop old triggers to prevent conflicts
DROP TRIGGER IF EXISTS refresh_scan_leaderboard ON public.scans;
DROP TRIGGER IF EXISTS refresh_share_leaderboard ON public.social_shares;
DROP TRIGGER IF EXISTS refresh_referral_leaderboard ON public.referrals;

-- Create a new, correct trigger that watches for changes to the 'points' column on the users table.
DROP TRIGGER IF EXISTS on_user_points_change ON public.users;
CREATE OR REPLACE TRIGGER on_user_points_change
AFTER UPDATE OF points ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.refresh_leaderboard();

--
-- Drop old, potentially conflicting triggers first for a clean slate
DROP TRIGGER IF EXISTS on_user_points_change ON public.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- A more robust function to create a user profile upon signup.
-- This version is explicit about all default columns.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, points, level, badges, scans_today)
  VALUES (NEW.id, NEW.email, 0, 1, '{}', 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger for new user creation to ensure it uses the function above.
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Corrected trigger to refresh the leaderboard.
-- The WHEN clause ensures it only runs when points actually change.
CREATE OR REPLACE TRIGGER on_user_points_change
AFTER UPDATE OF points ON public.users
FOR EACH ROW
WHEN (OLD.points IS DISTINCT FROM NEW.points)
EXECUTE FUNCTION public.refresh_leaderboard();

--
-- This command will safely drop the old function AND the trigger that depends on it.
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create the new, simplified function. This version only inserts the
-- essential 'id' and 'email', letting the database handle all default values.
-- This is a more robust pattern that avoids potential data type mismatches.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger, which is now correctly linked to the new function.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

  --
  -- Step 1: Forcefully drop the old function and its dependent trigger.
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Create the new, robust function.
-- This version is more explicit, providing default values directly, which prevents
-- potential mismatches with the table's schema.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, points, level, badges, scans_today)
  VALUES (NEW.id, NEW.email, 0, 1, '{}', 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Recreate the trigger, now linked to the new, correct function.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

  --
  -- Step 1: Forcefully drop the old function AND the trigger that depends on it.
-- Using CASCADE ensures that both the function and its dependent trigger are removed.
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Create the new, robust function.
-- This version is more explicit, providing default values directly in the INSERT statement,
-- which is a more stable pattern that prevents potential data type mismatches.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, points, level, badges, scans_today)
  VALUES (NEW.id, NEW.email, 0, 1, '{}', 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Recreate the trigger, now correctly linked to the new, robust function.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

  --
  -- Step 1: Forcefully drop the old function AND the trigger that depends on it.
-- Using CASCADE ensures that both the function and its dependent trigger are removed.
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Create the new, robust function.
-- This version is more explicit, providing default values directly in the INSERT statement,
-- which is a more stable pattern that prevents potential data type mismatches.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, points, level, badges, scans_today)
  VALUES (NEW.id, NEW.email, 0, 1, '{}', 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Recreate the trigger, now correctly linked to the new, robust function.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

  --
  INSERT INTO public.campaigns (
  name, 
  description, 
  type, 
  start_date, 
  end_date, 
  rules, 
  reward,
  is_active
) VALUES (
  'ShortStopSinclar 65 cents off per gallon of gas',
  'Bring store receipt (10 cents off), scan from Sinclair App (25 cents off), Scan Greenfield QR Code (65 cents off) and receive up to $1 off per gallon of gas up to 30 gallons.',
  'seasonal', -- Using allowed type with subtype in rules
  '2025-07-17 00:00:00-06', -- Denver Time (MST/MDT)
  '2025-08-16 23:59:59-06', -- Denver Time (MST/MDT)
  '{
    "change_region": "Store",
    "store": "ShortStopSinclair",
    "required_scans": 1,
    "time_limit_minutes": 30,
    "campaign_subtype": "scanwin_discount",
    "max_discount_per_gallon": "$1",
    "max_gallons": 30
  }',
  '{
    "discount_voucher": "Greenfield QR Code",
    "value": "65 cents",
    "value_type": "per_gallon",
    "application_method": "scanned_at_POS",
    "combinable": true,
    "stackable_discounts": [
      {"source": "store_receipt", "value": "10 cents"},
      {"source": "sinclair_app", "value": "25 cents"}
    ]
  }',
  true
);

--
INSERT INTO public.campaigns (
  name, 
  description, 
  type, 
  start_date, 
  end_date, 
  rules, 
  reward
) VALUES (
  'Greenfield Lighting - Winner Winner Chicken Dinner',
  'Scan QR Code and receive 5 points',
  'global_quest',
  '2025-07-03 00:00:00-06', -- Denver Time (UTC-6)
  '2025-07-07 23:59:59-06', -- Denver Time (UTC-6)
  '{
    "change_region": "Store",
    "store": "Greenfield Lighting",
    "required_scans": 4,
    "time_limit_days": 5,
    "scan_limit": "1 per day",
    "campaign_subtype": "scanwin_points"
  }',
  '{
    "reward_type": "points",
    "description": "Leaderboard winner of 4 or more scans in 5 days",
    "value": 1000,
    "currency": "Greenfield Points",
    "base_points_per_scan": 5
  }'
);

--
INSERT INTO public.campaigns (
  name, 
  description, 
  type, 
  start_date, 
  end_date, 
  rules, 
  reward
) VALUES (
  'ShortStopSinclar $100 gas coupon',
  'Bring store receipt (10 cents off), scan from Sinclair App (25 cents off), Scan Greenfield QR Code (65 cents off) and receive up to $1 off per gallon of gas up to 30 gallons.',
  'seasonal',
  '2025-07-17 00:00:00-06', -- Denver Time (UTC-6)
  '2025-08-16 23:59:59-06', -- Denver Time (UTC-6)
  '{
    "change_region": "Store",
    "store": "ShortStopSinclair",
    "required_scans": 4,
    "time_limit_days": 30,
    "campaign_subtype": "scanwin_discount"
  }',
  '{
    "discount_voucher": "Greenfield QR Code",
    "value": "$100",
    "value_type": "gas_coupon",
    "max_gallons": 30,
    "max_discount_per_gallon": "$1"
  }'
);

