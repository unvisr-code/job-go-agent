import { searchJobs, getJobById, getRecommendedJobs } from '@/lib/supabase/queries';
import { getOrgHistoryForPrediction } from '@/lib/supabase/stats-queries';
import { predictNextPostingWithEvidence } from '@/lib/predictions/engine';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import type { EmploymentType, DutyCategory, OrgPredictionInfo } from '@/types';

/**
 * OpenAI Function Calling Tools 정의
 */
export const agentTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_org_prediction',
      description:
        '특정 기관의 다음 채용공고 예측 정보를 조회합니다. "OO기관 언제 채용해?", "한전 공고 언제 올라와?" 같은 질문에 사용합니다.',
      parameters: {
        type: 'object',
        properties: {
          orgName: {
            type: 'string',
            description: '기관명 (예: 한국전력공사, 교통안전공단, KOTRA 등)',
          },
        },
        required: ['orgName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_jobs',
      description:
        '공공기관 인턴 공고를 검색합니다. 기본적으로 인턴 공고만 조회되며, 키워드/지역/직무로 필터링합니다.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '검색어 (기관명, 공고명, 직무내용에서 검색)',
          },
          regions: {
            type: 'array',
            items: { type: 'string' },
            description: '지역 필터 (예: ["서울", "경기"])',
          },
          dutyCategories: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'DATA',
                'DEVELOPMENT',
                'MARKETING',
                'DESIGN',
                'HR',
                'FINANCE',
                'ADMINISTRATION',
                'RESEARCH',
                'OTHER',
              ],
            },
            description: '직무분류 필터',
          },
          employmentType: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['INTERN', 'CONTRACT', 'REGULAR', 'OTHER'],
            },
            description: '고용형태 필터',
          },
          isInternship: {
            type: 'boolean',
            description: '인턴십 공고만 검색할지 여부',
          },
          limit: {
            type: 'number',
            description: '최대 결과 수 (기본: 10)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_job_detail',
      description: '특정 채용공고의 상세 정보를 조회합니다.',
      parameters: {
        type: 'object',
        properties: {
          jobId: {
            type: 'string',
            description: '채용공고 ID',
          },
        },
        required: ['jobId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recommend_jobs',
      description:
        '사용자 프로필(전공/지역/관심분야)에 맞는 인턴 공고를 추천합니다. 마감 임박 순으로 정렬됩니다.',
      parameters: {
        type: 'object',
        properties: {
          regions: {
            type: 'array',
            items: { type: 'string' },
            description: '선호 지역 (예: ["서울", "경기"])',
          },
          dutyCategories: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'DATA',
                'DEVELOPMENT',
                'MARKETING',
                'DESIGN',
                'HR',
                'FINANCE',
                'ADMINISTRATION',
                'RESEARCH',
                'OTHER',
              ],
            },
            description: '선호 직무분류',
          },
          employmentTypes: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['INTERN', 'CONTRACT', 'REGULAR', 'OTHER'],
            },
            description: '선호 고용형태',
          },
          limit: {
            type: 'number',
            description: '최대 추천 수 (기본: 5)',
          },
        },
        required: [],
      },
    },
  },
];

/**
 * Tool 실행 함수
 */
export async function executeToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'get_org_prediction': {
      const orgName = args.orgName as string;

      // 기관 히스토리 데이터 조회
      const orgHistory = await getOrgHistoryForPrediction(orgName);

      if (!orgHistory) {
        return {
          found: false,
          message: `"${orgName}"에 해당하는 기관의 채용 이력을 찾을 수 없습니다.`,
        };
      }

      // 예측 생성
      const prediction = predictNextPostingWithEvidence(
        orgHistory.orgName,
        orgHistory.postings
      );

      const result: OrgPredictionInfo = {
        orgName: orgHistory.orgName,
        prediction: prediction
          ? {
              predictedMonth: prediction.predictedMonth,
              confidence: prediction.confidence,
              confidenceLevel: prediction.confidenceLevel,
            }
          : null,
        basedOn: {
          historicalCount: orgHistory.postings.length,
          lastPostingMonth: orgHistory.postings.length > 0
            ? orgHistory.postings[orgHistory.postings.length - 1].month
            : null,
          periodicPattern: prediction?.periodicPattern || null,
          typicalMonths: prediction?.typicalMonths || [],
        },
        recentJobs: orgHistory.recentJobs,
      };

      return {
        found: true,
        ...result,
      };
    }

    case 'search_jobs': {
      // 효주님 scope: 서울/경기 인턴 관련 공고 (정규직 전환 포함)
      const { jobs, total } = await searchJobs({
        query: args.query as string | undefined,
        regions: (args.regions as string[] | undefined) || ['서울', '경기'],
        dutyCategories: args.dutyCategories as DutyCategory[] | undefined,
        employmentType: args.employmentType as EmploymentType[] | undefined,
        isInternship: args.isInternship !== false, // 기본값 true (인턴 관련 공고)
        limit: (args.limit as number) || 10,
        applyEndAfter: new Date().toISOString(), // 마감 안 된 공고만
      });

      return {
        total,
        jobs: jobs.map((job) => ({
          id: job.id,
          orgName: job.orgName,
          title: job.title,
          employmentType: job.employmentType,
          isInternship: job.isInternship,
          regions: job.regions,
          dutyCategories: job.dutyCategories,
          applyEndAt: job.applyEndAt,
        })),
      };
    }

    case 'get_job_detail': {
      const job = await getJobById(args.jobId as string);
      if (!job) {
        return { error: '해당 공고를 찾을 수 없습니다.' };
      }
      return job;
    }

    case 'recommend_jobs': {
      // 효주님 scope: 서울/경기 인턴 관련 공고 추천 (정규직 전환 포함)
      const jobs = await getRecommendedJobs({
        regions: (args.regions as string[] | undefined) || ['서울', '경기'],
        dutyCategories: args.dutyCategories as string[] | undefined,
        isInternship: true, // 인턴 관련 공고 (정규직 전환 포함)
        limit: (args.limit as number) || 5,
      });

      return {
        count: jobs.length,
        recommendations: jobs.map((job) => ({
          id: job.id,
          orgName: job.orgName,
          title: job.title,
          employmentType: job.employmentType,
          isInternship: job.isInternship,
          regions: job.regions,
          dutyCategories: job.dutyCategories,
          applyEndAt: job.applyEndAt,
        })),
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
