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
