-- AI 분석 결과 캐싱 테이블
CREATE TABLE IF NOT EXISTS job_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  highlights TEXT[] DEFAULT '{}',
  concerns TEXT[] DEFAULT '{}',
  tip TEXT,
  match_score INTEGER DEFAULT 3 CHECK (match_score >= 1 AND match_score <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 공고당 하나의 분석만 저장
  UNIQUE(job_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_job_analyses_job_id ON job_analyses(job_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_job_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_job_analyses_updated_at ON job_analyses;
CREATE TRIGGER trigger_job_analyses_updated_at
  BEFORE UPDATE ON job_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_job_analyses_updated_at();

-- RLS 정책
ALTER TABLE job_analyses ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Anyone can read job analyses" ON job_analyses
  FOR SELECT USING (true);

-- 서비스 역할만 쓰기 가능 (API에서 처리)
CREATE POLICY "Service can insert job analyses" ON job_analyses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update job analyses" ON job_analyses
  FOR UPDATE USING (true);
