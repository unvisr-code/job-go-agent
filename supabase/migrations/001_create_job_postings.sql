-- ============================================
-- Job Postings Table
-- ============================================

CREATE TABLE IF NOT EXISTS job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT UNIQUE NOT NULL,
  org_name TEXT NOT NULL,
  org_type TEXT,
  title TEXT NOT NULL,
  employment_type TEXT DEFAULT 'OTHER',
  is_internship BOOLEAN DEFAULT false,

  apply_start_at TIMESTAMPTZ,
  apply_end_at TIMESTAMPTZ,

  duties_text TEXT,
  duty_categories TEXT[] DEFAULT '{}',

  headcount_text TEXT,
  headcount_num INTEGER,

  selection_steps JSONB,
  apply_method TEXT,
  apply_url TEXT,

  regions TEXT[] DEFAULT '{}',
  requirements TEXT[] DEFAULT '{}',

  source_url TEXT,
  source_updated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================

-- 채용 유형 검색
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON job_postings(employment_type);

-- 인턴십 필터
CREATE INDEX IF NOT EXISTS idx_jobs_is_internship ON job_postings(is_internship);

-- 지역 검색 (GIN for array)
CREATE INDEX IF NOT EXISTS idx_jobs_regions ON job_postings USING GIN(regions);

-- 직무 카테고리 검색 (GIN for array)
CREATE INDEX IF NOT EXISTS idx_jobs_categories ON job_postings USING GIN(duty_categories);

-- 마감일 정렬/필터
CREATE INDEX IF NOT EXISTS idx_jobs_apply_end_at ON job_postings(apply_end_at);

-- 텍스트 검색 (Full-text)
CREATE INDEX IF NOT EXISTS idx_jobs_title_fts ON job_postings USING GIN(to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS idx_jobs_org_fts ON job_postings USING GIN(to_tsvector('simple', org_name));

-- ============================================
-- Updated At Trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_job_postings_updated_at ON job_postings;

CREATE TRIGGER update_job_postings_updated_at
  BEFORE UPDATE ON job_postings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능
CREATE POLICY "Allow public read" ON job_postings
  FOR SELECT
  USING (true);

-- 서비스 역할만 쓰기 가능
CREATE POLICY "Allow service role write" ON job_postings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
