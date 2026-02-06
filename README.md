# 공채GO - 공공기관 채용 에이전트

AI 기반 공공기관 인턴/채용 공고 검색, 예측, 대화형 탐색 서비스

## 주요 기능

### 검색 & 필터
- **스마트 검색**: 지역, 직무분류, 고용형태별 필터링
- **실시간 데이터**: 공공데이터포털 API 연동 (30분마다 자동 동기화)
- **공고 비교**: 최대 5개 공고를 한눈에 비교

### AI 기능
- **AI 채팅**: 자연어로 채용공고 검색, 추천, 예측 질문 (GPT-4o Function Calling)
- **LLM 분석**: 공고별 장단점, 지원 팁, 적합도 분석 (결과 DB 캐싱)
- **채용 예측**: 기관별 과거 패턴 분석 기반 다음 공고 시기 예측

### 예정 공고
- **기관별 채용 패턴**: 주요 채용 시기, 총 공고 수 분석
- **예측 엔진**: 작년 동월, 주기 패턴, 빈도 분석 기반 신뢰도 계산
- **근거 공고**: 예측의 근거가 된 과거 공고 전체 표시

### UX
- **다크모드**: 라이트/다크 테마 지원
- **모바일 최적화**: 반응형 디자인, 터치 타겟 44px 보장
- **Claude 스타일 채팅**: 부드러운 스크롤, 타이핑 인디케이터

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui |
| State | TanStack Query v5 |
| DB | Supabase (PostgreSQL) |
| LLM | OpenAI GPT-4o (Function Calling) |
| Validation | Zod v4 |
| Deploy | Vercel |

## 시작하기

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

`.env.local.example`을 `.env.local`로 복사:

```bash
cp .env.local.example .env.local
```

필수 환경 변수:

| 변수 | 설명 | 발급처 |
|------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | [Supabase](https://supabase.com) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 역할 키 (ETL용) | Supabase Dashboard |
| `PUBLIC_DATA_API_KEY` | 공공데이터포털 API 키 | [공공데이터포털](https://www.data.go.kr) |
| `OPENAI_API_KEY` | OpenAI API 키 | [OpenAI](https://platform.openai.com) |
| `CRON_SECRET` | Vercel Cron 인증 시크릿 | 직접 생성 (랜덤 문자열) |

### 3. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. Project Settings → API에서 URL과 키 복사
3. SQL Editor에서 마이그레이션 실행:

```sql
-- supabase/migrations/ 디렉토리의 SQL 파일들 순서대로 실행
```

### 4. 개발 서버 실행

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000)에서 확인

### 5. 데이터 동기화 (ETL)

처음 실행 시 데이터가 없으므로 수동으로 동기화:

```bash
curl -X POST http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## 프로젝트 구조

```
job-go-agent/
├── app/
│   ├── page.tsx                   # 메인 검색 페이지
│   ├── jobs/[id]/page.tsx         # 공고 상세
│   ├── compare/page.tsx           # 공고 비교
│   ├── chat/page.tsx              # AI 채팅
│   ├── upcoming/                  # 예정 공고 페이지
│   │   ├── page.tsx
│   │   └── components/            # 예측 관련 컴포넌트
│   └── api/
│       ├── jobs/                  # 검색/상세/비교 API
│       │   └── [id]/analysis/     # LLM 분석 API (캐싱)
│       ├── chat/                  # LLM 채팅 API
│       ├── stats/                 # 통계/예측 API
│       ├── recommend/             # 추천 API
│       └── cron/                  # ETL Cron
├── components/
│   ├── ui/                        # shadcn/ui 컴포넌트
│   ├── Header.tsx
│   ├── JobCard.tsx
│   ├── JobFilters.tsx
│   └── ChatInterface.tsx          # Claude 스타일 채팅 UI
├── lib/
│   ├── supabase/                  # DB 클라이언트 & 쿼리
│   │   ├── queries.ts             # 공고 조회
│   │   ├── stats-queries.ts       # 통계/패턴 조회
│   │   └── analysis-queries.ts    # LLM 분석 캐싱
│   ├── openai/                    # LLM Agent
│   │   ├── agent.ts               # Function Calling Agent
│   │   └── tools.ts               # Agent 도구 정의
│   ├── predictions/               # 예측 엔진
│   │   └── engine.ts              # 패턴 분석 & 신뢰도 계산
│   ├── publicdata/                # 공공데이터포털 API
│   └── validation.ts              # Zod 스키마
└── types/                         # TypeScript 타입
```

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/jobs` | 검색/필터/정렬 |
| GET | `/api/jobs/:id` | 공고 상세 |
| GET | `/api/jobs/:id/analysis` | LLM 분석 (캐싱) |
| POST | `/api/jobs/compare` | 공고 비교 (2-5개) |
| POST | `/api/chat` | AI 대화 |
| GET | `/api/chat/sessions` | 채팅 세션 목록 |
| GET | `/api/recommend` | 맞춤 추천 |
| GET | `/api/stats/patterns` | 기관별 채용 패턴 |
| GET | `/api/stats/predictions` | 예정 공고 예측 |
| POST | `/api/cron/sync` | 데이터 동기화 (Cron) |

### API 사용 예시

```bash
# 검색
curl "http://localhost:3000/api/jobs?query=데이터&regions=서울&limit=10"

# AI 채팅
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "한국전력공사 언제 채용해?"}'

# LLM 분석 (캐싱됨)
curl "http://localhost:3000/api/jobs/UUID/analysis"

# 분석 재생성
curl "http://localhost:3000/api/jobs/UUID/analysis?refresh=true"
```

## AI 채팅 기능

### 사용 가능한 도구 (Function Calling)

| 도구 | 설명 |
|------|------|
| `get_org_prediction` | 특정 기관 다음 채용 예측 |
| `search_jobs` | 채용공고 검색 |
| `get_job_detail` | 공고 상세 조회 |
| `recommend_jobs` | 맞춤 공고 추천 |

### 사용 예시

```
"서울 지역 데이터 분석 인턴 찾아줘"
"마감 임박한 개발 직무 추천해줘"
"한국전력공사 언제 채용해?"
"경기도 행정 인턴 공고 검색해줘"
```

## 예측 엔진

### 신뢰도 계산 요소

| 요소 | 가중치 | 설명 |
|------|--------|------|
| 작년 동월 | +40% | 작년 같은 달에 공고가 있었는지 |
| 월별 빈도 | +25% | 해당 월의 역대 공고 빈도 (중복 제외) |
| 주기 패턴 | +20% | 분기별/6개월/연간 패턴 일치 |
| 데이터량 | +15% | 과거 공고 수 (로그 스케일) |

### 주기 패턴 감지

- **분기별**: 평균 간격 2-4개월
- **6개월**: 평균 간격 5-8개월
- **연간**: 평균 간격 9-15개월
- 표준편차 60% 초과 시 불규칙으로 판단

## 보안

- 모든 API 입력값은 Zod로 유효성 검사
- SQL Injection 방지 (쿼리 sanitize)
- UUID 형식 검증
- Cron 엔드포인트는 Authorization 헤더 필수
- 에러 메시지에 내부 정보 노출 방지

## 배포

### Vercel 배포

1. GitHub 저장소 연결
2. 환경 변수 설정 (Settings → Environment Variables)
3. 배포

Cron Job은 `vercel.json`에 정의되어 있으며, 30분마다 자동 실행됩니다:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

## 스크립트

```bash
pnpm dev      # 개발 서버
pnpm build    # 프로덕션 빌드
pnpm start    # 프로덕션 서버
pnpm lint     # ESLint 검사
```

## 라이선스

MIT
