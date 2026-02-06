import type { PublicDataResponse, PublicDataJobItem } from '@/types';

const API_BASE_URL = 'https://apis.data.go.kr/1051000/recruitment';
const API_KEY = process.env.PUBLIC_DATA_API_KEY;

if (!API_KEY) {
  console.warn('PUBLIC_DATA_API_KEY is not set. ETL will not work.');
}

export interface FetchJobsParams {
  pageNo?: number;
  numOfRows?: number;
  ongoingYn?: 'Y' | 'N';
}

/**
 * 공공데이터포털 채용정보 API 호출
 */
export async function fetchPublicJobs(params: FetchJobsParams = {}): Promise<{
  items: PublicDataJobItem[];
  totalCount: number;
  pageNo: number;
}> {
  const { pageNo = 1, numOfRows = 100, ongoingYn = 'Y' } = params;

  const searchParams = new URLSearchParams({
    serviceKey: API_KEY || '',
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
    resultType: 'json',
    ongoingYn,
  });

  const url = `${API_BASE_URL}/list?${searchParams.toString()}`;

  console.log(`[PublicData] Fetching page ${pageNo}...`);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    next: { revalidate: 0 }, // No caching for ETL
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[PublicData] API Error:', text);
    throw new Error(`공공데이터포털 API 오류: ${response.status}`);
  }

  const data: PublicDataResponse = await response.json();

  if (data.resultCode !== 200) {
    throw new Error(
      `공공데이터포털 API 오류: ${data.resultMsg}`
    );
  }

  return {
    items: data.result || [],
    totalCount: data.totalCount,
    pageNo,
  };
}

/**
 * 모든 공고 가져오기 (페이지네이션 처리)
 */
export async function fetchAllPublicJobs(
  maxPages: number = 10
): Promise<PublicDataJobItem[]> {
  const allItems: PublicDataJobItem[] = [];
  let pageNo = 1;
  let hasMore = true;

  while (hasMore && pageNo <= maxPages) {
    const { items, totalCount } = await fetchPublicJobs({ pageNo, numOfRows: 100 });

    allItems.push(...items);

    const fetchedCount = pageNo * 100;
    hasMore = fetchedCount < totalCount;
    pageNo++;

    // Rate limiting
    if (hasMore) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log(`[PublicData] Total fetched: ${allItems.length} jobs`);
  return allItems;
}
