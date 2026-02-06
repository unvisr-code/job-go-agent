-- ============================================
-- Alert Rules Table (알림 구독)
-- ============================================

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- 알림 조건
  name TEXT NOT NULL, -- 알림 이름 (예: "서울 데이터 인턴")
  regions TEXT[] DEFAULT '{}',
  duty_categories TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}', -- 키워드 필터

  -- 알림 설정
  notify_new_jobs BOOLEAN DEFAULT true, -- 새 공고 알림
  notify_deadline_days INTEGER[] DEFAULT '{3, 1}', -- D-3, D-1 마감 알림

  -- 알림 채널 (향후 확장)
  email TEXT,
  is_active BOOLEAN DEFAULT true,

  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alert_rules_user ON alert_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON alert_rules(is_active) WHERE is_active = true;

-- Updated At Trigger
DROP TRIGGER IF EXISTS update_alert_rules_updated_at ON alert_rules;
CREATE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own alert rules" ON alert_rules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access alert_rules" ON alert_rules
  FOR ALL USING (auth.role() = 'service_role');
