import { supabase } from './client';
import type {
  MonthlyStats,
  OrganizationPattern,
  OrganizationPatternExtended,
  OrganizationSearchParams,
  OrganizationSearchResponse,
  HistoricalJob,
  DutyCategory,
} from '@/types';

// ============================================
// Monthly Statistics
// ============================================

/**
 * 월별 공고 수 통계 조회
 * @param months 조회할 개월 수 (기본 12개월)
 */
export async function getMonthlyStats(months: number = 12): Promise<MonthlyStats[]> {
  const safeMonths = Math.max(1, Math.min(months, 36)); // 최대 3년

  // 시작 날짜 계산 (N개월 전 1일)
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - safeMonths);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('job_postings')
    .select('apply_start_at, is_internship')
    .gte('apply_start_at', startDate.toISOString());

  if (error) {
    console.error('[Stats] Monthly stats error:', error);
    throw new Error('Failed to get monthly stats');
  }

  // 월별로 집계
  const monthlyMap = new Map<string, { count: number; internCount: number }>();

  for (const job of data || []) {
    if (!job.apply_start_at) continue;

    const date = new Date(job.apply_start_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const existing = monthlyMap.get(monthKey) || { count: 0, internCount: 0 };
    existing.count++;
    if (job.is_internship) {
      existing.internCount++;
    }
    monthlyMap.set(monthKey, existing);
  }

  // 배열로 변환 및 정렬
  const result: MonthlyStats[] = [];
  for (const [month, stats] of monthlyMap.entries()) {
    result.push({
      month,
      count: stats.count,
      internCount: stats.internCount,
    });
  }

  return result.sort((a, b) => a.month.localeCompare(b.month));
}

// ============================================
// Organization Patterns
// ============================================

/**
 * 기관별 채용 패턴 분석
 * @param limit 조회할 기관 수 (기본 20개)
 */
export async function getOrganizationPatterns(limit: number = 20): Promise<OrganizationPattern[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));

  // 최근 3년 데이터 조회
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const { data, error } = await supabase
    .from('job_postings')
    .select('org_name, title, apply_start_at')
    .gte('apply_start_at', threeYearsAgo.toISOString())
    .order('apply_start_at', { ascending: false });

  if (error) {
    console.error('[Stats] Organization patterns error:', error);
    throw new Error('Failed to get organization patterns');
  }

  // 기관별 집계
  const orgMap = new Map<string, {
    jobs: { month: number; title: string; date: string }[];
  }>();

  for (const job of data || []) {
    if (!job.org_name || !job.apply_start_at) continue;

    const existing = orgMap.get(job.org_name) || { jobs: [] };
    const date = new Date(job.apply_start_at);

    existing.jobs.push({
      month: date.getMonth() + 1, // 1-12
      title: job.title,
      date: job.apply_start_at,
    });

    orgMap.set(job.org_name, existing);
  }

  // 패턴 분석
  const patterns: OrganizationPattern[] = [];

  for (const [orgName, orgData] of orgMap.entries()) {
    const jobs = orgData.jobs;
    if (jobs.length < 2) continue; // 최소 2개 공고 이상

    // 월별 빈도 계산
    const monthCounts = new Map<number, number>();
    for (const job of jobs) {
      monthCounts.set(job.month, (monthCounts.get(job.month) || 0) + 1);
    }

    // 상위 빈도 월 추출
    const typicalMonths = [...monthCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([month]) => month)
      .sort((a, b) => a - b);

    // 최신 공고 정보
    const sortedJobs = jobs.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // 연평균 계산 - 실제 데이터 기간 기준
    const oldestDate = new Date(sortedJobs[sortedJobs.length - 1].date);
    const newestDate = new Date(sortedJobs[0].date);
    const yearsSpan = Math.max(1, (newestDate.getTime() - oldestDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const avgPerYear = jobs.length / yearsSpan;

    patterns.push({
      orgName,
      totalJobs: jobs.length,
      avgPerYear: Math.round(avgPerYear * 10) / 10,
      typicalMonths,
      lastPostedAt: sortedJobs[0]?.date || null,
      mostRecentTitle: sortedJobs[0]?.title || null,
    });
  }

  // 공고 수 기준 정렬 및 제한
  return patterns
    .sort((a, b) => b.totalJobs - a.totalJobs)
    .slice(0, safeLimit);
}

// ============================================
// Historical Data for Predictions
// ============================================

/**
 * 예측을 위한 기관별 히스토리 데이터 조회
 */
export async function getHistoricalDataForPredictions(): Promise<{
  orgName: string;
  postings: { month: string; year: number; monthNum: number; jobId: string; title: string }[];
}[]> {
  // 최근 3년 데이터
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const { data, error } = await supabase
    .from('job_postings')
    .select('id, org_name, title, apply_start_at')
    .gte('apply_start_at', threeYearsAgo.toISOString())
    .not('apply_start_at', 'is', null);

  if (error) {
    console.error('[Stats] Historical data error:', error);
    throw new Error('Failed to get historical data');
  }

  // 기관별 집계
  const orgMap = new Map<string, { month: string; year: number; monthNum: number; jobId: string; title: string }[]>();

  for (const job of data || []) {
    if (!job.org_name || !job.apply_start_at) continue;

    const date = new Date(job.apply_start_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const existing = orgMap.get(job.org_name) || [];
    existing.push({
      month: monthKey,
      year: date.getFullYear(),
      monthNum: date.getMonth() + 1,
      jobId: job.id,
      title: job.title,
    });
    orgMap.set(job.org_name, existing);
  }

  const result = [];
  for (const [orgName, postings] of orgMap.entries()) {
    if (postings.length >= 2) { // 최소 2개 포스팅
      result.push({
        orgName,
        postings: postings.sort((a, b) => a.month.localeCompare(b.month)),
      });
    }
  }

  return result;
}

// ============================================
// Extended Queries for Upcoming Page
// ============================================

/**
 * 기관 검색 + 상세 데이터 조회
 */
export async function searchOrganizationPatterns(
  params: OrganizationSearchParams
): Promise<OrganizationSearchResponse> {
  const { query, page = 1, limit = 20 } = params;
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const offset = (page - 1) * safeLimit;

  // 최근 3년 데이터 조회
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const { data, error } = await supabase
    .from('job_postings')
    .select('id, org_name, title, apply_start_at, apply_end_at, duty_categories')
    .gte('apply_start_at', threeYearsAgo.toISOString())
    .order('apply_start_at', { ascending: false });

  if (error) {
    console.error('[Stats] Search organization patterns error:', error);
    throw new Error('Failed to search organization patterns');
  }

  // 기관별 집계
  const orgMap = new Map<string, {
    jobs: {
      id: string;
      title: string;
      applyStartAt: string;
      applyEndAt: string | null;
      dutyCategories: DutyCategory[];
      month: number;
    }[];
  }>();

  for (const job of data || []) {
    if (!job.org_name || !job.apply_start_at) continue;

    // 검색어 필터링
    if (query && !job.org_name.toLowerCase().includes(query.toLowerCase())) {
      continue;
    }

    const existing = orgMap.get(job.org_name) || { jobs: [] };
    const date = new Date(job.apply_start_at);

    existing.jobs.push({
      id: job.id,
      title: job.title,
      applyStartAt: job.apply_start_at,
      applyEndAt: job.apply_end_at,
      dutyCategories: job.duty_categories || [],
      month: date.getMonth() + 1,
    });

    orgMap.set(job.org_name, existing);
  }

  // 패턴 생성
  const allPatterns: OrganizationPatternExtended[] = [];

  for (const [orgName, orgData] of orgMap.entries()) {
    const jobs = orgData.jobs;
    if (jobs.length < 2) continue;

    // 월별 빈도 계산
    const monthCounts = new Map<number, number>();
    for (const job of jobs) {
      monthCounts.set(job.month, (monthCounts.get(job.month) || 0) + 1);
    }

    const typicalMonths = [...monthCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([month]) => month)
      .sort((a, b) => a - b);

    const sortedJobs = jobs.sort((a, b) =>
      new Date(b.applyStartAt).getTime() - new Date(a.applyStartAt).getTime()
    );

    // 연평균 계산 - 실제 데이터 기간 기준
    const oldestDate = new Date(sortedJobs[sortedJobs.length - 1].applyStartAt);
    const newestDate = new Date(sortedJobs[0].applyStartAt);
    const yearsSpan = Math.max(1, (newestDate.getTime() - oldestDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const avgPerYear = jobs.length / yearsSpan;

    allPatterns.push({
      orgName,
      totalJobs: jobs.length,
      avgPerYear: Math.round(avgPerYear * 10) / 10,
      typicalMonths,
      lastPostedAt: sortedJobs[0]?.applyStartAt || null,
      mostRecentTitle: sortedJobs[0]?.title || null,
      historicalJobs: sortedJobs.slice(0, 10).map(j => ({
        id: j.id,
        title: j.title,
        applyStartAt: j.applyStartAt,
        applyEndAt: j.applyEndAt,
        dutyCategories: j.dutyCategories,
      })),
    });
  }

  // 공고 수 기준 정렬
  allPatterns.sort((a, b) => b.totalJobs - a.totalJobs);

  const total = allPatterns.length;
  const patterns = allPatterns.slice(offset, offset + safeLimit);

  return {
    patterns,
    total,
    page,
    limit: safeLimit,
    hasMore: offset + safeLimit < total,
  };
}

/**
 * 특정 기관의 히스토리 데이터 조회 (AI 채팅용)
 */
export async function getOrgHistoryForPrediction(
  orgName: string
): Promise<{
  orgName: string;
  postings: { month: string; year: number; monthNum: number; jobId: string; title: string }[];
  recentJobs: { id: string; title: string; applyEndAt: string | null }[];
} | null> {
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  // ilike로 유연한 검색
  const { data, error } = await supabase
    .from('job_postings')
    .select('id, org_name, title, apply_start_at, apply_end_at')
    .ilike('org_name', `%${orgName}%`)
    .gte('apply_start_at', threeYearsAgo.toISOString())
    .order('apply_start_at', { ascending: false });

  if (error) {
    console.error('[Stats] Get org history error:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  // 가장 많이 매칭되는 기관명 찾기
  const orgCounts = new Map<string, number>();
  for (const job of data) {
    orgCounts.set(job.org_name, (orgCounts.get(job.org_name) || 0) + 1);
  }

  const exactOrgName = [...orgCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0][0];

  const filteredJobs = data.filter(j => j.org_name === exactOrgName);

  const postings: { month: string; year: number; monthNum: number; jobId: string; title: string }[] = [];

  for (const job of filteredJobs) {
    if (!job.apply_start_at) continue;
    const date = new Date(job.apply_start_at);
    postings.push({
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      year: date.getFullYear(),
      monthNum: date.getMonth() + 1,
      jobId: job.id,
      title: job.title,
    });
  }

  return {
    orgName: exactOrgName,
    postings: postings.sort((a, b) => a.month.localeCompare(b.month)),
    recentJobs: filteredJobs.slice(0, 5).map(j => ({
      id: j.id,
      title: j.title,
      applyEndAt: j.apply_end_at,
    })),
  };
}

/**
 * 2025년 월별 통계 고정 조회
 */
export async function getMonthlyStats2025(): Promise<MonthlyStats[]> {
  const { data, error } = await supabase
    .from('job_postings')
    .select('apply_start_at, is_internship')
    .gte('apply_start_at', '2025-01-01')
    .lt('apply_start_at', '2026-01-01');

  if (error) {
    console.error('[Stats] Monthly stats 2025 error:', error);
    throw new Error('Failed to get monthly stats 2025');
  }

  // 1~12월 모든 월 초기화
  const monthlyMap = new Map<string, { count: number; internCount: number }>();
  for (let m = 1; m <= 12; m++) {
    const monthKey = `2025-${String(m).padStart(2, '0')}`;
    monthlyMap.set(monthKey, { count: 0, internCount: 0 });
  }

  for (const job of data || []) {
    if (!job.apply_start_at) continue;

    const date = new Date(job.apply_start_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const existing = monthlyMap.get(monthKey);
    if (existing) {
      existing.count++;
      if (job.is_internship) {
        existing.internCount++;
      }
    }
  }

  const result: MonthlyStats[] = [];
  for (const [month, stats] of monthlyMap.entries()) {
    result.push({
      month,
      count: stats.count,
      internCount: stats.internCount,
    });
  }

  return result.sort((a, b) => a.month.localeCompare(b.month));
}
