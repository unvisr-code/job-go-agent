-- ============================================
-- Saved Jobs Table (즐겨찾기/북마크)
-- ============================================

CREATE TABLE IF NOT EXISTS saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,

  notes TEXT, -- 개인 메모
  applied_at TIMESTAMPTZ, -- 지원 완료 표시

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, job_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job ON saved_jobs(job_id);

-- RLS
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own saved jobs" ON saved_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved jobs" ON saved_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved jobs" ON saved_jobs
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update own saved jobs" ON saved_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access saved_jobs" ON saved_jobs
  FOR ALL USING (auth.role() = 'service_role');
