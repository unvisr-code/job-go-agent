// ============================================
// Job Posting Types
// ============================================

export type EmploymentType = 'INTERN' | 'CONTRACT' | 'REGULAR' | 'OTHER';

export type DutyCategory =
  | 'DATA'
  | 'DEVELOPMENT'
  | 'MARKETING'
  | 'DESIGN'
  | 'HR'
  | 'FINANCE'
  | 'ADMINISTRATION'
  | 'RESEARCH'
  | 'OTHER';

export interface SelectionStep {
  order: number;
  name: string;
  description?: string;
}

export interface JobPosting {
  id: string;
  sourceId: string;
  orgName: string;
  orgType: string | null;
  title: string;
  employmentType: EmploymentType;
  isInternship: boolean;

  applyStartAt: string | null;
  applyEndAt: string | null;

  dutiesText: string | null;
  dutyCategories: DutyCategory[];

  headcountText: string | null;
  headcountNum: number | null;

  selectionSteps: SelectionStep[] | null;
  applyMethod: string | null;
  applyUrl: string | null;

  regions: string[];
  requirements: string[];

  sourceUrl: string | null;
  sourceUpdatedAt: string | null;

  createdAt: string;
  updatedAt: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface JobSearchParams {
  query?: string;
  employmentType?: EmploymentType[];
  regions?: string[];
  dutyCategories?: DutyCategory[];
  isInternship?: boolean;
  applyEndAfter?: string;
  sortBy?: 'deadline' | 'recent' | 'relevance';
  page?: number;
  limit?: number;
}

export interface JobSearchResponse {
  jobs: JobPosting[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface JobCompareRequest {
  jobIds: string[];
}

export interface JobCompareResponse {
  jobs: JobPosting[];
  comparison: {
    field: string;
    values: Record<string, string | null>;
  }[];
}

// ============================================
// Chat Types
// ============================================

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatSession {
  id: string;
  title: string;
  preview: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbChatSession {
  id: string;
  title: string;
  preview: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  sessionId?: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  toolCalls?: ToolCall[];
}

export interface DbChatMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface ChatRequest {
  messages: Pick<ChatMessage, 'role' | 'content'>[];
  sessionId?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

// ============================================
// Recommendation Types
// ============================================

export interface RecommendationRequest {
  preferences?: {
    regions?: string[];
    dutyCategories?: DutyCategory[];
    employmentTypes?: EmploymentType[];
  };
  limit?: number;
}

export interface RecommendationResponse {
  recommendations: {
    job: JobPosting;
    score: number;
    reasons: string[];
  }[];
}

// ============================================
// Public Data API Types (공공데이터포털)
// ============================================

export interface PublicDataJobItem {
  recrutPblntSn: number;     // 채용공고 고유번호
  pblntInstCd: string;       // 기관코드
  instNm: string;            // 기관명
  ncsCdNmLst: string;        // NCS 분류
  hireTypeLst: string;       // 채용유형 코드
  hireTypeNmLst: string;     // 채용유형명 (정규직, 비정규직, 청년인턴 등)
  workRgnLst: string;        // 근무지역 코드
  workRgnNmLst: string;      // 근무지역명
  recrutSe: string;          // 채용구분 코드
  recrutSeNm: string;        // 채용구분명 (신입, 경력, 신입+경력)
  recrutNope: number;        // 채용인원
  pbancBgngYmd: string;      // 공고시작일 (YYYYMMDD)
  pbancEndYmd: string;       // 공고종료일 (YYYYMMDD)
  recrutPbancTtl: string;    // 채용공고 제목
  srcUrl: string;            // 상세페이지 URL
  replmprYn: string;         // 대체인력 여부
  aplyQlfcCn?: string;       // 지원자격
  disqlfcRsn?: string;       // 결격사유
  scrnprcdrMthdExpln?: string; // 전형절차
  prefCn?: string;           // 우대사항
  acbgCondNmLst?: string;    // 학력조건
  ongoingYn: string;         // 진행여부 (Y/N)
  decimalDay?: number;       // D-day
}

export interface PublicDataResponse {
  resultCode: number;
  resultMsg: string;
  totalCount: number;
  result: PublicDataJobItem[];
}

// ============================================
// User Profile Types (인턴 취준생)
// ============================================

export type EducationLevel = '고졸' | '대학재학' | '대학졸업' | '대학원';

export interface UserProfile {
  id: string;
  userId: string | null;
  nickname: string | null;
  educationLevel: EducationLevel | null;
  major: string | null;
  graduationYear: number | null;
  preferredRoles: string[];
  preferredRegions: string[];
  availableStart: string | null;
  availableEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbUserProfile {
  id: string;
  user_id: string | null;
  nickname: string | null;
  education_level: string | null;
  major: string | null;
  graduation_year: number | null;
  preferred_roles: string[];
  preferred_regions: string[];
  available_start: string | null;
  available_end: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Saved Jobs Types (즐겨찾기)
// ============================================

export interface SavedJob {
  id: string;
  userId: string;
  jobId: string;
  notes: string | null;
  appliedAt: string | null;
  createdAt: string;
  job?: JobPosting; // joined
}

export interface DbSavedJob {
  id: string;
  user_id: string;
  job_id: string;
  notes: string | null;
  applied_at: string | null;
  created_at: string;
}

// ============================================
// Alert Rules Types (알림 구독)
// ============================================

export interface AlertRule {
  id: string;
  userId: string;
  name: string;
  regions: string[];
  dutyCategories: string[];
  keywords: string[];
  notifyNewJobs: boolean;
  notifyDeadlineDays: number[];
  email: string | null;
  isActive: boolean;
  lastNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbAlertRule {
  id: string;
  user_id: string;
  name: string;
  regions: string[];
  duty_categories: string[];
  keywords: string[];
  notify_new_jobs: boolean;
  notify_deadline_days: number[];
  email: string | null;
  is_active: boolean;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Job Analysis Types (AI 분석 결과)
// ============================================

export interface JobAnalysis {
  id: string;
  jobId: string;
  summary: string;
  highlights: string[];
  concerns: string[];
  tip: string | null;
  matchScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbJobAnalysis {
  id: string;
  job_id: string;
  summary: string;
  highlights: string[];
  concerns: string[];
  tip: string | null;
  match_score: number;
  created_at: string;
  updated_at: string;
}

export function dbToJobAnalysis(db: DbJobAnalysis): JobAnalysis {
  return {
    id: db.id,
    jobId: db.job_id,
    summary: db.summary,
    highlights: db.highlights,
    concerns: db.concerns,
    tip: db.tip,
    matchScore: db.match_score,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// ============================================
// Database Types (Supabase snake_case)
// ============================================

export interface DbJobPosting {
  id: string;
  source_id: string;
  org_name: string;
  org_type: string | null;
  title: string;
  employment_type: EmploymentType;
  is_internship: boolean;

  apply_start_at: string | null;
  apply_end_at: string | null;

  duties_text: string | null;
  duty_categories: DutyCategory[];

  headcount_text: string | null;
  headcount_num: number | null;

  selection_steps: SelectionStep[] | null;
  apply_method: string | null;
  apply_url: string | null;

  regions: string[];
  requirements: string[];

  source_url: string | null;
  source_updated_at: string | null;

  created_at: string;
  updated_at: string;
}

// ============================================
// Utility Functions
// ============================================

export function dbToJobPosting(db: DbJobPosting): JobPosting {
  return {
    id: db.id,
    sourceId: db.source_id,
    orgName: db.org_name,
    orgType: db.org_type,
    title: db.title,
    employmentType: db.employment_type,
    isInternship: db.is_internship,
    applyStartAt: db.apply_start_at,
    applyEndAt: db.apply_end_at,
    dutiesText: db.duties_text,
    dutyCategories: db.duty_categories,
    headcountText: db.headcount_text,
    headcountNum: db.headcount_num,
    selectionSteps: db.selection_steps,
    applyMethod: db.apply_method,
    applyUrl: db.apply_url,
    regions: db.regions,
    requirements: db.requirements,
    sourceUrl: db.source_url,
    sourceUpdatedAt: db.source_updated_at,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// ============================================
// Statistics & Predictions Types (예측/통계)
// ============================================

export interface MonthlyStats {
  month: string; // 'YYYY-MM' format
  count: number;
  internCount: number;
}

export interface OrganizationPattern {
  orgName: string;
  totalJobs: number;
  avgPerYear: number;
  typicalMonths: number[]; // 1-12
  lastPostedAt: string | null;
  mostRecentTitle: string | null;
}

export interface JobPrediction {
  orgName: string;
  predictedMonth: string; // 'YYYY-MM' format
  confidence: number; // 0-1
  basedOn: {
    historicalCount: number;
    lastYearSameMonth: boolean;
    periodicPattern: string | null; // '3개월', '6개월', '12개월' 등
  };
}

export interface StatsApiResponse<T> {
  success: boolean;
  data: T;
  generatedAt: string;
}

export interface PredictionsApiResponse {
  success: boolean;
  predictions: JobPrediction[];
  generatedAt: string;
}

export interface AIAnalysisResult {
  summary: string;
  insights: string[];
  recommendations: string[];
}

// ============================================
// Extended Statistics Types (예정공고 페이지 확장)
// ============================================

// 과거 공고 정보 (상세)
export interface HistoricalJob {
  id: string;
  title: string;
  applyStartAt: string;
  applyEndAt: string | null;
  dutyCategories: DutyCategory[];
}

// 기관 패턴 확장 (상세 정보 포함)
export interface OrganizationPatternExtended extends OrganizationPattern {
  historicalJobs: HistoricalJob[];
}

// 예측 근거
export interface PredictionEvidence {
  jobId: string;
  title: string;
  applyStartAt: string;
  matchReason: 'same_month_last_year' | 'periodic_pattern' | 'high_frequency';
}

// 신뢰도 레벨
export type ConfidenceLevel = 'high' | 'medium' | 'low';

// 예측 확장 (근거 포함)
export interface JobPredictionExtended extends JobPrediction {
  confidenceLevel: ConfidenceLevel;
  evidenceJobs: PredictionEvidence[];
  predictedDutyCategories?: DutyCategory[];
}

// 기관 검색 파라미터
export interface OrganizationSearchParams {
  query?: string;
  page?: number;
  limit?: number;
}

// 기관 검색 응답
export interface OrganizationSearchResponse {
  patterns: OrganizationPatternExtended[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// AI 채팅용 기관 예측 정보
export interface OrgPredictionInfo {
  orgName: string;
  prediction: {
    predictedMonth: string;
    confidence: number;
    confidenceLevel: ConfidenceLevel;
  } | null;
  basedOn: {
    historicalCount: number;
    lastPostingMonth: string | null;
    periodicPattern: string | null;
    typicalMonths: number[];
  };
  recentJobs?: {
    id: string;
    title: string;
    applyEndAt: string | null;
  }[];
}

export function jobPostingToDb(job: Partial<JobPosting>): Partial<DbJobPosting> {
  const result: Partial<DbJobPosting> = {};

  if (job.sourceId !== undefined) result.source_id = job.sourceId;
  if (job.orgName !== undefined) result.org_name = job.orgName;
  if (job.orgType !== undefined) result.org_type = job.orgType;
  if (job.title !== undefined) result.title = job.title;
  if (job.employmentType !== undefined) result.employment_type = job.employmentType;
  if (job.isInternship !== undefined) result.is_internship = job.isInternship;
  if (job.applyStartAt !== undefined) result.apply_start_at = job.applyStartAt;
  if (job.applyEndAt !== undefined) result.apply_end_at = job.applyEndAt;
  if (job.dutiesText !== undefined) result.duties_text = job.dutiesText;
  if (job.dutyCategories !== undefined) result.duty_categories = job.dutyCategories;
  if (job.headcountText !== undefined) result.headcount_text = job.headcountText;
  if (job.headcountNum !== undefined) result.headcount_num = job.headcountNum;
  if (job.selectionSteps !== undefined) result.selection_steps = job.selectionSteps;
  if (job.applyMethod !== undefined) result.apply_method = job.applyMethod;
  if (job.applyUrl !== undefined) result.apply_url = job.applyUrl;
  if (job.regions !== undefined) result.regions = job.regions;
  if (job.requirements !== undefined) result.requirements = job.requirements;
  if (job.sourceUrl !== undefined) result.source_url = job.sourceUrl;
  if (job.sourceUpdatedAt !== undefined) result.source_updated_at = job.sourceUpdatedAt;

  return result;
}
