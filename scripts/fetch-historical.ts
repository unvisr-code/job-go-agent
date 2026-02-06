/**
 * 과거 인턴 채용 공고 수집 스크립트
 * - 인턴/청년인턴 공고만
 * - 서울/경기 지역만
 * - 최근 1년간
 *
 * 실행: npx tsx scripts/fetch-historical.ts
 */

import { createClient } from '@supabase/supabase-js';

// 환경 변수
const API_KEY = 'a35df10ade93c5b0ea6b642e95cf7dc63f74a70dbdbde84454a1a543a16b5248';
const SUPABASE_URL = 'https://cyhsjkeffkvbrjtaqoty.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHNqa2VmZmt2YnJqdGFxb3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM1MDc1NSwiZXhwIjoyMDg1OTI2NzU1fQ.DzbSx9GlH_JYKC0zcZj6XZXMJm01jm0sgl6B4MiEFco';

const API_BASE_URL = 'https://apis.data.go.kr/1051000/recruitment';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 수집 기간 설정 (인자로 받거나 기본값 사용)
// 사용법: npx tsx scripts/fetch-historical.ts [startDate] [endDate]
// 예: npx tsx scripts/fetch-historical.ts 20250101 20250131
const args = process.argv.slice(2);
const START_DATE_STR = args[0] || (() => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return oneYearAgo.toISOString().slice(0, 10).replace(/-/g, '');
})();
const END_DATE_STR = args[1] || new Date().toISOString().slice(0, 10).replace(/-/g, '');

interface PublicDataJobItem {
  recrutPblntSn: number;
  pblntInstCd: string;
  instNm: string;
  ncsCdNmLst: string;
  hireTypeLst: string;
  hireTypeNmLst: string;
  workRgnLst: string;
  workRgnNmLst: string;
  recrutSe: string;
  recrutSeNm: string;
  recrutNope: number;
  pbancBgngYmd: string;
  pbancEndYmd: string;
  recrutPbancTtl: string;
  srcUrl: string;
  replmprYn: string;
  aplyQlfcCn?: string;
  disqlfcRsn?: string;
  scrnprcdrMthdExpln?: string;
  prefCn?: string;
  acbgCondNmLst?: string;
  ongoingYn: string;
  decimalDay?: number;
}

interface ApiResponse {
  resultCode: number;
  resultMsg: string;
  totalCount: number;
  result: PublicDataJobItem[];
}

// 인턴 공고인지 확인
function isInternJob(item: PublicDataJobItem): boolean {
  const hireTypes = (item.hireTypeNmLst || '').toLowerCase();
  const title = (item.recrutPbancTtl || '').toLowerCase();

  return (
    hireTypes.includes('인턴') ||
    hireTypes.includes('청년인턴') ||
    title.includes('인턴') ||
    title.includes('청년인턴') ||
    title.includes('체험형') ||
    title.includes('전환형')
  );
}

// 서울/경기 지역인지 확인
function isSeoulOrGyeonggi(item: PublicDataJobItem): boolean {
  const regions = (item.workRgnNmLst || '').toLowerCase();
  return regions.includes('서울') || regions.includes('경기');
}

// 지정 기간 내 공고인지 확인
function isWithinDateRange(item: PublicDataJobItem): boolean {
  const startDate = item.pbancBgngYmd;
  if (!startDate || startDate.length !== 8) return false;
  return startDate >= START_DATE_STR && startDate <= END_DATE_STR;
}

async function fetchPage(pageNo: number, ongoingYn: 'Y' | 'N' = 'N'): Promise<{
  items: PublicDataJobItem[];
  totalCount: number;
}> {
  const searchParams = new URLSearchParams({
    serviceKey: API_KEY,
    pageNo: String(pageNo),
    numOfRows: '100',
    resultType: 'json',
    ongoingYn,
  });

  const url = `${API_BASE_URL}/list?${searchParams.toString()}`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const data: ApiResponse = await response.json();

  if (data.resultCode !== 200) {
    throw new Error(`API Error: ${data.resultMsg}`);
  }

  return {
    items: data.result || [],
    totalCount: data.totalCount,
  };
}

function normalizeJob(item: PublicDataJobItem) {
  const parseDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.length !== 8) return null;
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    return `${year}-${month}-${day}T00:00:00+09:00`;
  };

  const hireTypes = item.hireTypeNmLst?.toLowerCase() || '';
  let employmentType: 'INTERN' | 'CONTRACT' | 'REGULAR' | 'OTHER' = 'INTERN';

  if (hireTypes.includes('정규') || hireTypes.includes('무기계약')) {
    employmentType = 'REGULAR';
  } else if (hireTypes.includes('계약') || hireTypes.includes('기간제')) {
    employmentType = 'CONTRACT';
  }

  const regions = item.workRgnNmLst
    ? item.workRgnNmLst.split(',').map((r) => r.trim()).filter(Boolean)
    : [];

  const dutyCategories: string[] = [];
  const ncsCodes = item.ncsCdNmLst?.toLowerCase() || '';
  const title = item.recrutPbancTtl?.toLowerCase() || '';

  if (ncsCodes.includes('데이터') || ncsCodes.includes('빅데이터') || title.includes('데이터')) {
    dutyCategories.push('DATA');
  }
  if (ncsCodes.includes('개발') || ncsCodes.includes('프로그래밍') || ncsCodes.includes('소프트웨어') || title.includes('개발')) {
    dutyCategories.push('DEVELOPMENT');
  }
  if (ncsCodes.includes('마케팅') || ncsCodes.includes('홍보') || title.includes('마케팅')) {
    dutyCategories.push('MARKETING');
  }
  if (ncsCodes.includes('디자인') || title.includes('디자인')) {
    dutyCategories.push('DESIGN');
  }
  if (ncsCodes.includes('인사') || ncsCodes.includes('총무') || title.includes('인사')) {
    dutyCategories.push('HR');
  }
  if (ncsCodes.includes('재무') || ncsCodes.includes('회계') || title.includes('재무') || title.includes('회계')) {
    dutyCategories.push('FINANCE');
  }
  if (ncsCodes.includes('행정') || ncsCodes.includes('사무') || title.includes('행정')) {
    dutyCategories.push('ADMINISTRATION');
  }
  if (ncsCodes.includes('연구') || title.includes('연구')) {
    dutyCategories.push('RESEARCH');
  }
  if (dutyCategories.length === 0) {
    dutyCategories.push('OTHER');
  }

  return {
    source_id: `publicdata_${item.recrutPblntSn}`,
    org_name: item.instNm || '알 수 없음',
    org_type: null,
    title: item.recrutPbancTtl || '제목 없음',
    employment_type: employmentType,
    is_internship: true,
    apply_start_at: parseDate(item.pbancBgngYmd),
    apply_end_at: parseDate(item.pbancEndYmd),
    duties_text: item.ncsCdNmLst || null,
    duty_categories: dutyCategories,
    headcount_text: item.recrutNope ? `${item.recrutNope}명` : null,
    headcount_num: item.recrutNope || null,
    selection_steps: item.scrnprcdrMthdExpln
      ? [{ order: 1, name: item.scrnprcdrMthdExpln }]
      : null,
    apply_method: null,
    apply_url: item.srcUrl || null,
    regions,
    requirements: item.aplyQlfcCn ? [item.aplyQlfcCn] : [],
    source_url: item.srcUrl || null,
    source_updated_at: parseDate(item.pbancBgngYmd),
  };
}

async function main() {
  console.log('🚀 인턴 채용 공고 수집 시작 (서울/경기)\n');
  console.log(`📅 수집 기간: ${START_DATE_STR.slice(0,4)}.${START_DATE_STR.slice(4,6)}.${START_DATE_STR.slice(6,8)} ~ ${END_DATE_STR.slice(0,4)}.${END_DATE_STR.slice(4,6)}.${END_DATE_STR.slice(6,8)}\n`);

  const filteredItems: PublicDataJobItem[] = [];
  let pageNo = 1;
  let hasMore = true;
  const maxPages = 150;
  let totalScanned = 0;
  let oldDataCount = 0;

  // 종료된 공고 + 진행중 공고 모두 수집
  for (const ongoingYn of ['N', 'Y'] as const) {
    console.log(`\n📥 ${ongoingYn === 'N' ? '종료된' : '진행중인'} 공고 수집 중...`);
    pageNo = 1;
    hasMore = true;
    oldDataCount = 0;

    while (hasMore && pageNo <= maxPages) {
      try {
        const { items, totalCount } = await fetchPage(pageNo, ongoingYn);
        totalScanned += items.length;

        // 필터링: 인턴 + 서울/경기 + 지정 기간
        for (const item of items) {
          if (!isWithinDateRange(item)) {
            oldDataCount++;
            continue;
          }
          if (isInternJob(item) && isSeoulOrGyeonggi(item)) {
            filteredItems.push(item);
          }
        }

        process.stdout.write(`\r  Page ${pageNo}: 스캔 ${totalScanned}건, 필터링 ${filteredItems.length}건`);

        // 기간 외 데이터가 많아지면 중단 (데이터가 날짜순 정렬되어 있다고 가정)
        if (oldDataCount > 500) {
          console.log(`\n  ℹ️ 기간 외 데이터 도달, 다음 단계로...`);
          break;
        }

        const fetchedCount = pageNo * 100;
        hasMore = fetchedCount < totalCount;
        pageNo++;

        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`\n❌ Page ${pageNo} 에러:`, error);
        break;
      }
    }
  }

  console.log(`\n\n✅ 필터링 완료: ${filteredItems.length}건 (총 스캔: ${totalScanned}건)\n`);

  if (filteredItems.length === 0) {
    console.log('⚠️ 조건에 맞는 데이터가 없습니다.');
    return;
  }

  // 중복 제거
  const uniqueItems = Array.from(
    new Map(filteredItems.map(item => [item.recrutPblntSn, item])).values()
  );
  console.log(`🔄 중복 제거 후: ${uniqueItems.length}건\n`);

  // 데이터 정규화
  console.log('🔄 데이터 정규화 중...');
  const normalizedJobs = uniqueItems.map(normalizeJob);
  console.log(`✅ ${normalizedJobs.length}건 정규화 완료\n`);

  // Supabase에 저장
  console.log('💾 Supabase에 저장 중...');

  const BATCH_SIZE = 200;
  let totalUpserted = 0;

  for (let i = 0; i < normalizedJobs.length; i += BATCH_SIZE) {
    const batch = normalizedJobs.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(normalizedJobs.length / BATCH_SIZE);

    try {
      const { data, error } = await supabase
        .from('job_postings')
        .upsert(batch, {
          onConflict: 'source_id',
          ignoreDuplicates: false,
        })
        .select('id');

      if (error) {
        console.error(`\n❌ Batch ${batchNum} 에러:`, error.message);
      } else {
        totalUpserted += data?.length || 0;
        process.stdout.write(`\r  Batch ${batchNum}/${totalBatches}: ${totalUpserted}건 저장됨`);
      }
    } catch (error) {
      console.error(`\n❌ Batch ${batchNum} 예외:`, error);
    }
  }

  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 수집 결과 (인턴 + 서울/경기)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  총 스캔: ${totalScanned}건`);
  console.log(`  필터링 후: ${uniqueItems.length}건`);
  console.log(`  저장 완료: ${totalUpserted}건`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // DB 통계
  const { count } = await supabase
    .from('job_postings')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📈 DB 총 공고 수: ${count}건`);
}

main().catch(console.error);
