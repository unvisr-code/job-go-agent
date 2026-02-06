import { searchJobs, getJobById, getRecommendedJobs } from '@/lib/supabase/queries';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import type { EmploymentType, DutyCategory } from '@/types';

/**
 * OpenAI Function Calling Tools 정의
 */
export const agentTools: ChatCompletionTool[] = [
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
    case 'search_jobs': {
      // 인턴 scope: 기본적으로 인턴 공고만 검색
      const { jobs, total } = await searchJobs({
        query: args.query as string | undefined,
        regions: args.regions as string[] | undefined,
        dutyCategories: args.dutyCategories as DutyCategory[] | undefined,
        employmentType: (args.employmentType as EmploymentType[] | undefined) || ['INTERN'],
        isInternship: args.isInternship !== false, // 기본값 true
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
      // 인턴 scope: 기본적으로 인턴만 추천
      const jobs = await getRecommendedJobs({
        regions: args.regions as string[] | undefined,
        dutyCategories: args.dutyCategories as string[] | undefined,
        employmentTypes: (args.employmentTypes as string[] | undefined) || ['INTERN'],
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
