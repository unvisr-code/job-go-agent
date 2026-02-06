import { supabase } from './client';
import type { JobAnalysis, DbJobAnalysis } from '@/types';
import { dbToJobAnalysis } from '@/types';

/**
 * 캐시된 AI 분석 결과 조회
 */
export async function getCachedAnalysis(jobId: string): Promise<JobAnalysis | null> {
  const { data, error } = await supabase
    .from('job_analyses')
    .select('*')
    .eq('job_id', jobId)
    .single();

  if (error || !data) {
    return null;
  }

  return dbToJobAnalysis(data as DbJobAnalysis);
}

/**
 * AI 분석 결과 저장 (upsert)
 */
export async function saveAnalysis(
  jobId: string,
  analysis: {
    summary: string;
    highlights: string[];
    concerns: string[];
    tip: string;
    matchScore: number;
  }
): Promise<JobAnalysis | null> {
  const { data, error } = await supabase
    .from('job_analyses')
    .upsert(
      {
        job_id: jobId,
        summary: analysis.summary,
        highlights: analysis.highlights,
        concerns: analysis.concerns,
        tip: analysis.tip,
        match_score: analysis.matchScore,
      },
      { onConflict: 'job_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('[DB] Failed to save analysis:', error);
    return null;
  }

  return dbToJobAnalysis(data as DbJobAnalysis);
}

/**
 * 분석 결과 삭제 (재분석 필요시)
 */
export async function deleteAnalysis(jobId: string): Promise<boolean> {
  const { error } = await supabase
    .from('job_analyses')
    .delete()
    .eq('job_id', jobId);

  return !error;
}
