-- ============================================
-- User Profiles Table (인턴 취준생 프로필)
-- ============================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE, -- Supabase Auth user_id (optional)

  -- 기본 정보
  nickname TEXT,
  education_level TEXT, -- 고졸, 대학재학, 대학졸업, 대학원
  major TEXT, -- 전공
  graduation_year INTEGER, -- 졸업(예정)년도

  -- 선호 조건
  preferred_roles TEXT[] DEFAULT '{}', -- 선호 직무
  preferred_regions TEXT[] DEFAULT '{}', -- 선호 지역

  -- 가용 기간
  available_start DATE,
  available_end DATE,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON user_profiles(user_id);

-- Updated At Trigger
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 본인만 읽기/쓰기
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role은 모든 작업 가능
CREATE POLICY "Service role full access" ON user_profiles
  FOR ALL USING (auth.role() = 'service_role');
