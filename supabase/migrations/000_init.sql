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


