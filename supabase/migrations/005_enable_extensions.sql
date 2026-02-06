-- ============================================
-- Extensions for Intern Job Agent
-- ============================================

-- 텍스트 유사도 검색 (fuzzy search)
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- 벡터 임베딩 (V2 추천 고도화용)
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- HTTP 요청 (외부 API 호출용)
CREATE EXTENSION IF NOT EXISTS http SCHEMA extensions;

-- pg_cron (스케줄러 - 공고 수집용)
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA extensions;
