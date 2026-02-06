import type {
  PublicDataJobItem,
  DbJobPosting,
  EmploymentType,
  DutyCategory,
} from '@/types';

/**
 * 공공데이터포털 데이터를 DB 스키마로 정규화
 */
export function normalizeJobItem(item: PublicDataJobItem): Partial<DbJobPosting> {
  return {
    source_id: String(item.recrutPblntSn), // 고유번호
    org_name: item.instNm,
    org_type: null, // TODO: 기관유형 분류
    title: item.recrutPbancTtl,
    employment_type: parseEmploymentType(item.hireTypeNmLst),
    is_internship: isInternship(item),

    apply_start_at: parseDate(item.pbancBgngYmd),
    apply_end_at: parseDate(item.pbancEndYmd),

    duties_text: item.ncsCdNmLst || null,
    duty_categories: parseDutyCategories(item.ncsCdNmLst),

    headcount_text: item.recrutNope ? `${item.recrutNope}명` : null,
    headcount_num: item.recrutNope || null,

    selection_steps: item.scrnprcdrMthdExpln ? [{ order: 1, name: '전형절차', description: item.scrnprcdrMthdExpln }] : null,
    apply_method: null,
    apply_url: item.srcUrl || null,

    regions: parseRegions(item.workRgnNmLst),
    requirements: item.aplyQlfcCn ? [item.aplyQlfcCn] : [],

    source_url: item.srcUrl || null,
    source_updated_at: parseDate(item.pbancBgngYmd),
  };
}

/**
 * 채용유형 파싱 (hireTypeNmLst 기준)
 */
function parseEmploymentType(text: string | undefined): EmploymentType {
  if (!text) return 'OTHER';

  const lower = text.toLowerCase();

  // 청년인턴 우선 체크
  if (lower.includes('인턴') || lower.includes('실습') || lower.includes('체험')) {
    return 'INTERN';
  }
  if (lower.includes('정규직')) {
    return 'REGULAR';
  }
  if (lower.includes('비정규') || lower.includes('계약') || lower.includes('기간제')) {
    return 'CONTRACT';
  }

  return 'OTHER';
}

/**
 * 인턴십 여부 판단
 */
function isInternship(item: PublicDataJobItem): boolean {
  const titleLower = (item.recrutPbancTtl || '').toLowerCase();
  const hireTypeLower = (item.hireTypeNmLst || '').toLowerCase();

  return (
    titleLower.includes('인턴') ||
    titleLower.includes('실습') ||
    titleLower.includes('체험형') ||
    hireTypeLower.includes('인턴') ||
    hireTypeLower.includes('체험')
  );
}

/**
 * 날짜 파싱 (YYYYMMDD -> ISO string)
 */
function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.length < 8) return null;

  try {
    // YYYYMMDD 형식
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);

    const date = new Date(`${year}-${month}-${day}T23:59:59+09:00`);

    if (isNaN(date.getTime())) return null;

    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * NCS 분류를 직무 카테고리로 매핑
 */
function parseDutyCategories(ncsText: string | undefined): DutyCategory[] {
  if (!ncsText) return ['OTHER'];

  const categories: DutyCategory[] = [];
  const lower = ncsText.toLowerCase();

  // 데이터/IT
  if (
    lower.includes('데이터') ||
    lower.includes('정보') ||
    lower.includes('전산') ||
    lower.includes('it')
  ) {
    categories.push('DATA');
  }

  // 개발
  if (
    lower.includes('개발') ||
    lower.includes('프로그래') ||
    lower.includes('소프트웨어')
  ) {
    categories.push('DEVELOPMENT');
  }

  // 마케팅/홍보
  if (
    lower.includes('마케팅') ||
    lower.includes('홍보') ||
    lower.includes('광고')
  ) {
    categories.push('MARKETING');
  }

  // 디자인
  if (lower.includes('디자인') || lower.includes('ui') || lower.includes('ux')) {
    categories.push('DESIGN');
  }

  // 인사
  if (lower.includes('인사') || lower.includes('채용') || lower.includes('hr')) {
    categories.push('HR');
  }

  // 재무/회계
  if (
    lower.includes('재무') ||
    lower.includes('회계') ||
    lower.includes('세무') ||
    lower.includes('경리')
  ) {
    categories.push('FINANCE');
  }

  // 행정
  if (
    lower.includes('행정') ||
    lower.includes('사무') ||
    lower.includes('총무') ||
    lower.includes('비서')
  ) {
    categories.push('ADMINISTRATION');
  }

  // 연구
  if (
    lower.includes('연구') ||
    lower.includes('r&d') ||
    lower.includes('분석')
  ) {
    categories.push('RESEARCH');
  }

  return categories.length > 0 ? categories : ['OTHER'];
}

/**
 * 지역 파싱
 */
function parseRegions(regionText: string | undefined): string[] {
  if (!regionText) return [];

  // 콤마, 공백 등으로 분리
  const regions = regionText
    .split(/[,\s/]+/)
    .map((r) => r.trim())
    .filter((r) => r.length > 0);

  // 주요 지역명 정규화
  return regions.map(normalizeRegion);
}

/**
 * 지역명 정규화
 */
function normalizeRegion(region: string): string {
  const mapping: Record<string, string> = {
    서울특별시: '서울',
    서울시: '서울',
    부산광역시: '부산',
    부산시: '부산',
    인천광역시: '인천',
    인천시: '인천',
    대구광역시: '대구',
    대구시: '대구',
    대전광역시: '대전',
    대전시: '대전',
    광주광역시: '광주',
    광주시: '광주',
    울산광역시: '울산',
    울산시: '울산',
    세종특별자치시: '세종',
    세종시: '세종',
    경기도: '경기',
    강원도: '강원',
    강원특별자치도: '강원',
    충청북도: '충북',
    충청남도: '충남',
    전라북도: '전북',
    전북특별자치도: '전북',
    전라남도: '전남',
    경상북도: '경북',
    경상남도: '경남',
    제주도: '제주',
    제주특별자치도: '제주',
  };

  return mapping[region] || region;
}

/**
 * 여러 아이템 일괄 정규화
 */
export function normalizeJobItems(
  items: PublicDataJobItem[]
): Partial<DbJobPosting>[] {
  return items.map(normalizeJobItem);
}
