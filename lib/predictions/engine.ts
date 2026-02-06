import type {
  JobPrediction,
  JobPredictionExtended,
  PredictionEvidence,
  ConfidenceLevel,
  DutyCategory,
} from '@/types';

interface OrgHistory {
  orgName: string;
  postings: { month: string; year: number; monthNum: number; jobId?: string; title?: string }[];
}

interface OrgHistoryExtended {
  orgName: string;
  postings: { month: string; year: number; monthNum: number; jobId: string; title: string }[];
}

/**
 * 신뢰도를 레벨로 변환
 */
function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.55) return 'medium';
  return 'low';
}

/**
 * 예측 엔진
 * 과거 채용 데이터를 기반으로 향후 공고 예측
 */
export function generatePredictions(
  historicalData: OrgHistory[],
  predictMonths: number = 3 // 향후 N개월 예측
): JobPrediction[] {
  const predictions: JobPrediction[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // 예측 대상 월 생성
  const targetMonths: { year: number; monthNum: number; monthKey: string }[] = [];
  for (let i = 1; i <= predictMonths; i++) {
    const targetDate = new Date(now);
    targetDate.setMonth(targetDate.getMonth() + i);
    targetMonths.push({
      year: targetDate.getFullYear(),
      monthNum: targetDate.getMonth() + 1,
      monthKey: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`,
    });
  }

  for (const org of historicalData) {
    const { orgName, postings } = org;

    // 최소 2개 이상의 데이터 포인트 필요
    if (postings.length < 2) continue;

    // 월별 패턴 분석
    const monthFrequency = new Map<number, number>();
    for (const posting of postings) {
      monthFrequency.set(
        posting.monthNum,
        (monthFrequency.get(posting.monthNum) || 0) + 1
      );
    }

    // 주기성 분석
    const periodicPattern = analyzePeriodicPattern(postings);

    // 작년 동월 확인
    const lastYear = currentYear - 1;
    const lastYearPostings = postings.filter(p => p.year === lastYear);

    for (const target of targetMonths) {
      // 1. 작년 동월 체크
      const lastYearSameMonth = lastYearPostings.some(
        p => p.monthNum === target.monthNum
      );

      // 2. 월별 빈도 체크 (작년 동월 제외하여 중복 가산 방지)
      const monthFreq = monthFrequency.get(target.monthNum) || 0;
      const maxFreq = Math.max(...monthFrequency.values());

      // 3. 신뢰도 계산 (개선됨)
      let confidence = 0;

      // 작년 동월에 공고가 있었다면 +40%
      if (lastYearSameMonth) {
        confidence += 0.4;
      }

      // 월별 빈도 점수 (작년 동월 보너스와 중복 방지)
      // 작년 동월이 있으면 해당 월 빈도에서 1을 빼고 계산
      if (maxFreq > 0) {
        const adjustedMonthFreq = lastYearSameMonth ? Math.max(0, monthFreq - 1) : monthFreq;
        const adjustedMaxFreq = lastYearSameMonth ? Math.max(1, maxFreq - 1) : maxFreq;
        if (adjustedMaxFreq > 0 && adjustedMonthFreq > 0) {
          confidence += (adjustedMonthFreq / adjustedMaxFreq) * 0.25;
        }
      }

      // 주기적 패턴 일치 시 +20%
      if (periodicPattern && isPatternMatch(periodicPattern, target.monthNum, postings)) {
        confidence += 0.2;
      }

      // 데이터 포인트 보너스 - 로그 스케일 (최대 +15%)
      const dataPointBonus = Math.min(Math.log10(postings.length + 1) / 1.2, 1) * 0.15;
      confidence += dataPointBonus;

      // 신뢰도 상한 90% (예측은 불확실성 내포)
      confidence = Math.min(confidence, 0.9);

      // 최소 신뢰도 50% 이상만 예측에 포함
      if (confidence >= 0.5) {
        predictions.push({
          orgName,
          predictedMonth: target.monthKey,
          confidence: Math.round(confidence * 100) / 100,
          basedOn: {
            historicalCount: postings.length,
            lastYearSameMonth,
            periodicPattern,
          },
        });
      }
    }
  }

  // 신뢰도 기준 정렬 및 예측 월별 그룹화
  return predictions
    .sort((a, b) => {
      // 먼저 월 기준 정렬, 그 다음 신뢰도 기준
      if (a.predictedMonth !== b.predictedMonth) {
        return a.predictedMonth.localeCompare(b.predictedMonth);
      }
      return b.confidence - a.confidence;
    });
}

/**
 * 주기적 패턴 분석 (개선됨)
 * - 표준편차 검증으로 불규칙 패턴 오탐지 방지
 * - 확장된 범위 지원
 */
function analyzePeriodicPattern(
  postings: { month: string; year: number; monthNum: number }[]
): string | null {
  if (postings.length < 3) return null;

  // 시간순 정렬 (year-month 기반으로 정확하게)
  const sorted = [...postings].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.monthNum - b.monthNum;
  });

  // 연속 간격 계산
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const monthsDiff = (sorted[i].year - sorted[i - 1].year) * 12 +
      (sorted[i].monthNum - sorted[i - 1].monthNum);
    if (monthsDiff > 0) {
      intervals.push(monthsDiff);
    }
  }

  if (intervals.length === 0) return null;

  // 평균 및 표준편차 계산
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);

  // 표준편차가 평균의 60% 이상이면 불규칙 (패턴 없음)
  if (avgInterval > 0 && stdDev / avgInterval > 0.6) {
    return null;
  }

  // 주기성 판단 (확장된 범위)
  if (avgInterval >= 2 && avgInterval <= 4) return '분기별';
  if (avgInterval >= 5 && avgInterval <= 8) return '6개월';
  if (avgInterval >= 9 && avgInterval <= 15) return '연간';

  return null;
}

/**
 * 패턴 일치 여부 확인 (개선됨)
 * - 고정 월 하드코딩 제거
 * - 실제 데이터 기반 패턴 매칭
 */
function isPatternMatch(
  pattern: string,
  targetMonth: number,
  postings: { monthNum: number }[]
): boolean {
  const historicalMonths = [...new Set(postings.map(p => p.monthNum))];

  switch (pattern) {
    case '분기별':
      // 과거 데이터 기반 분기 패턴 - 같은 분기에 공고한 적 있는지
      const targetQuarter = Math.ceil(targetMonth / 3);
      const historicalQuarters = historicalMonths.map(m => Math.ceil(m / 3));
      return historicalQuarters.includes(targetQuarter);

    case '6개월':
      // 6개월 간격 패턴 - 과거 월과 6개월 차이나는지
      return historicalMonths.some(m => {
        const diff = Math.abs(targetMonth - m);
        return diff === 0 || diff === 6;
      });

    case '연간':
      // 같은 월에 공고한 적 있는지
      return historicalMonths.includes(targetMonth);

    default:
      return false;
  }
}

/**
 * 특정 기관의 다음 공고 예측
 */
export function predictNextPosting(
  orgName: string,
  postings: { month: string; year: number; monthNum: number }[]
): { predictedMonth: string; confidence: number; confidenceLevel: ConfidenceLevel } | null {
  if (postings.length < 2) return null;

  const sorted = [...postings].sort((a, b) => b.month.localeCompare(a.month));
  const latest = sorted[0];

  // 주기성 분석
  const pattern = analyzePeriodicPattern(postings);

  if (!pattern) {
    // 주기성 없으면 작년 동월 기반 예측
    const now = new Date();
    const nextYear = now.getFullYear();
    const candidateMonths = [...new Set(postings.map(p => p.monthNum))];

    for (const month of candidateMonths) {
      if (month > now.getMonth() + 1) {
        const confidence = 0.5;
        return {
          predictedMonth: `${nextYear}-${String(month).padStart(2, '0')}`,
          confidence,
          confidenceLevel: getConfidenceLevel(confidence),
        };
      }
    }

    // 내년으로
    if (candidateMonths.length > 0) {
      const firstMonth = Math.min(...candidateMonths);
      const confidence = 0.4;
      return {
        predictedMonth: `${nextYear + 1}-${String(firstMonth).padStart(2, '0')}`,
        confidence,
        confidenceLevel: getConfidenceLevel(confidence),
      };
    }
  }

  // 주기성 기반 예측
  const latestDate = new Date(latest.year, latest.monthNum - 1);
  let intervalMonths = 12;

  if (pattern === '분기별') intervalMonths = 3;
  else if (pattern === '6개월') intervalMonths = 6;

  const predictedDate = new Date(latestDate);
  predictedDate.setMonth(predictedDate.getMonth() + intervalMonths);

  // 현재보다 과거면 한 주기 더 추가
  const now = new Date();
  while (predictedDate <= now) {
    predictedDate.setMonth(predictedDate.getMonth() + intervalMonths);
  }

  // 신뢰도 계산 (개선됨) - 로그 스케일 + 상한 90%
  const dataBonus = Math.min(Math.log10(postings.length + 1) / 1.2, 1) * 0.15;
  const confidence = Math.min(0.55 + dataBonus + (pattern ? 0.15 : 0), 0.9);
  return {
    predictedMonth: `${predictedDate.getFullYear()}-${String(predictedDate.getMonth() + 1).padStart(2, '0')}`,
    confidence: Math.round(confidence * 100) / 100,
    confidenceLevel: getConfidenceLevel(confidence),
  };
}

/**
 * 예측 생성 (데이터 기간: 2025-02 ~ 2026-02)
 * - 예측 기간: 2026-03 ~ 2026-12 (향후 예측)
 * 근거(evidence) 포함
 */
export function generatePredictionsExtended(
  historicalData: OrgHistoryExtended[]
): JobPredictionExtended[] {
  const predictions: JobPredictionExtended[] = [];

  // 현재 날짜 기준으로 향후 10개월 예측 (2026-03 ~ 2026-12)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // 예측 대상 월 생성 (현재 월부터 향후 10개월)
  const targetMonths: { year: number; monthNum: number; monthKey: string }[] = [];
  for (let i = 0; i <= 10; i++) {
    const targetDate = new Date(now);
    targetDate.setMonth(targetDate.getMonth() + i);
    targetMonths.push({
      year: targetDate.getFullYear(),
      monthNum: targetDate.getMonth() + 1,
      monthKey: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`,
    });
  }

  for (const org of historicalData) {
    const { orgName, postings } = org;

    if (postings.length < 2) continue;

    // 월별 패턴 분석
    const monthFrequency = new Map<number, number>();
    for (const posting of postings) {
      monthFrequency.set(
        posting.monthNum,
        (monthFrequency.get(posting.monthNum) || 0) + 1
      );
    }

    const periodicPattern = analyzePeriodicPattern(postings);

    // 작년 동월 데이터 (2025년 데이터)
    const lastYearPostings = postings.filter(p => p.year === currentYear - 1);

    for (const target of targetMonths) {
      // 작년 동월 체크
      const lastYearSameMonth = lastYearPostings.some(
        p => p.monthNum === target.monthNum
      );

      const monthFreq = monthFrequency.get(target.monthNum) || 0;
      const maxFreq = Math.max(...monthFrequency.values());

      // 신뢰도 계산 (개선됨)
      let confidence = 0;

      // 작년 동월에 공고가 있었다면 +40%
      if (lastYearSameMonth) {
        confidence += 0.4;
      }

      // 월별 빈도 점수 (작년 동월 보너스와 중복 방지)
      if (maxFreq > 0) {
        const adjustedMonthFreq = lastYearSameMonth ? Math.max(0, monthFreq - 1) : monthFreq;
        const adjustedMaxFreq = lastYearSameMonth ? Math.max(1, maxFreq - 1) : maxFreq;
        if (adjustedMaxFreq > 0 && adjustedMonthFreq > 0) {
          confidence += (adjustedMonthFreq / adjustedMaxFreq) * 0.25;
        }
      }

      // 주기적 패턴 일치 시 +20%
      if (periodicPattern && isPatternMatch(periodicPattern, target.monthNum, postings)) {
        confidence += 0.2;
      }

      // 데이터 포인트 보너스 - 로그 스케일 (최대 +15%)
      const dataPointBonus = Math.min(Math.log10(postings.length + 1) / 1.2, 1) * 0.15;
      confidence += dataPointBonus;

      // 신뢰도 상한 90%
      confidence = Math.min(confidence, 0.9);

      if (confidence >= 0.5) {
        // 근거 생성 - 전체 과거 공고 포함
        const evidenceJobs: PredictionEvidence[] = [];
        const addedJobIds = new Set<string>();

        // 1. 작년 동월 공고 (가장 강한 근거)
        const sameMonthJobs = postings.filter(p =>
          p.year === currentYear - 1 && p.monthNum === target.monthNum
        );
        for (const job of sameMonthJobs) {
          if (!addedJobIds.has(job.jobId)) {
            evidenceJobs.push({
              jobId: job.jobId,
              title: job.title,
              applyStartAt: job.month,
              matchReason: 'same_month_last_year',
            });
            addedJobIds.add(job.jobId);
          }
        }

        // 2. 같은 월의 다른 연도 공고
        const otherYearSameMonth = postings.filter(p =>
          p.monthNum === target.monthNum && p.year !== currentYear - 1
        );
        for (const job of otherYearSameMonth) {
          if (!addedJobIds.has(job.jobId)) {
            evidenceJobs.push({
              jobId: job.jobId,
              title: job.title,
              applyStartAt: job.month,
              matchReason: 'periodic_pattern',
            });
            addedJobIds.add(job.jobId);
          }
        }

        // 3. 나머지 공고 (최근 순으로)
        const remainingJobs = postings
          .filter(p => !addedJobIds.has(p.jobId))
          .sort((a, b) => b.month.localeCompare(a.month));
        for (const job of remainingJobs) {
          evidenceJobs.push({
            jobId: job.jobId,
            title: job.title,
            applyStartAt: job.month,
            matchReason: 'high_frequency',
          });
        }

        predictions.push({
          orgName,
          predictedMonth: target.monthKey,
          confidence: Math.round(confidence * 100) / 100,
          confidenceLevel: getConfidenceLevel(confidence),
          basedOn: {
            historicalCount: postings.length,
            lastYearSameMonth,
            periodicPattern,
          },
          evidenceJobs, // 전체 표시
        });
      }
    }
  }

  return predictions.sort((a, b) => {
    if (a.predictedMonth !== b.predictedMonth) {
      return a.predictedMonth.localeCompare(b.predictedMonth);
    }
    return b.confidence - a.confidence;
  });
}

/**
 * AI 채팅용: 특정 기관의 다음 예측 (근거 포함)
 */
export function predictNextPostingWithEvidence(
  orgName: string,
  postings: { month: string; year: number; monthNum: number; jobId: string; title: string }[]
): {
  predictedMonth: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  periodicPattern: string | null;
  typicalMonths: number[];
  evidenceJobs: PredictionEvidence[];
} | null {
  if (postings.length < 2) return null;

  const sorted = [...postings].sort((a, b) => b.month.localeCompare(a.month));
  const latest = sorted[0];

  const pattern = analyzePeriodicPattern(postings);

  // 월별 빈도 계산 후 상위 4개만 추출
  const monthCounts = new Map<number, number>();
  for (const p of postings) {
    monthCounts.set(p.monthNum, (monthCounts.get(p.monthNum) || 0) + 1);
  }
  const typicalMonths = [...monthCounts.entries()]
    .sort((a, b) => b[1] - a[1]) // 빈도 높은 순
    .slice(0, 4) // 상위 4개월만
    .map(([month]) => month)
    .sort((a, b) => a - b); // 월 순서로 정렬

  let predictedMonth: string;
  let confidence: number;

  // 신뢰도 기본값 및 데이터 보너스 계산
  const dataBonus = Math.min(Math.log10(postings.length + 1) / 1.2, 1) * 0.15;

  if (!pattern) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 올해 남은 월 중 가장 빠른 것
    const futureMonths = typicalMonths.filter(m => m > currentMonth);
    if (futureMonths.length > 0) {
      const targetMonth = futureMonths[0];
      predictedMonth = `${currentYear}-${String(targetMonth).padStart(2, '0')}`;
      confidence = Math.min(0.45 + dataBonus, 0.9);
    } else if (typicalMonths.length > 0) {
      // 내년 첫 달
      const firstMonth = typicalMonths[0];
      predictedMonth = `${currentYear + 1}-${String(firstMonth).padStart(2, '0')}`;
      confidence = Math.min(0.4 + dataBonus, 0.9);
    } else {
      return null;
    }
  } else {
    const latestDate = new Date(latest.year, latest.monthNum - 1);
    let intervalMonths = 12;

    if (pattern === '분기별') intervalMonths = 3;
    else if (pattern === '6개월') intervalMonths = 6;

    const predictedDate = new Date(latestDate);
    predictedDate.setMonth(predictedDate.getMonth() + intervalMonths);

    const now = new Date();
    while (predictedDate <= now) {
      predictedDate.setMonth(predictedDate.getMonth() + intervalMonths);
    }

    predictedMonth = `${predictedDate.getFullYear()}-${String(predictedDate.getMonth() + 1).padStart(2, '0')}`;
    confidence = Math.min(0.55 + dataBonus + 0.15, 0.9); // 패턴 있으면 +15%
  }

  // 근거 공고 생성
  const evidenceJobs: PredictionEvidence[] = [];
  const [predictedYear, predictedMonthNum] = predictedMonth.split('-').map(Number);

  // 작년 동월
  const lastYearSame = postings.filter(p =>
    p.year === predictedYear - 1 && p.monthNum === predictedMonthNum
  );
  for (const job of lastYearSame.slice(0, 2)) {
    evidenceJobs.push({
      jobId: job.jobId,
      title: job.title,
      applyStartAt: job.month,
      matchReason: 'same_month_last_year',
    });
  }

  // 같은 월 다른 연도
  const otherYearSame = postings.filter(p =>
    p.monthNum === predictedMonthNum && p.year !== predictedYear - 1
  );
  for (const job of otherYearSame.slice(0, 2)) {
    if (evidenceJobs.length < 3) {
      evidenceJobs.push({
        jobId: job.jobId,
        title: job.title,
        applyStartAt: job.month,
        matchReason: 'periodic_pattern',
      });
    }
  }

  return {
    predictedMonth,
    confidence: Math.round(confidence * 100) / 100,
    confidenceLevel: getConfidenceLevel(confidence),
    periodicPattern: pattern,
    typicalMonths,
    evidenceJobs: evidenceJobs.slice(0, 3),
  };
}
