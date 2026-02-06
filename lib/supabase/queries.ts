import { createServerClient, supabase } from './client';
import type {
  DbJobPosting,
  JobPosting,
  JobSearchParams,
} from '@/types';
import { dbToJobPosting as convertToJobPosting } from '@/types';

// ============================================
// Utility: Sanitize search query
// ============================================

function sanitizeSearchQuery(query: string): string {
  // Escape special characters for LIKE pattern matching
  // Also limit length to prevent abuse
  return query
    .slice(0, 100) // Max 100 characters
    .replace(/[%_\\]/g, '\\$&') // Escape LIKE wildcards
    .trim();
}

// ============================================
// Utility: Validate UUID format
// ============================================

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ============================================
// Job Search Query
// ============================================

export async function searchJobs(params: JobSearchParams): Promise<{
  jobs: JobPosting[];
  total: number;
}> {
  const {
    query,
    employmentType,
    regions,
    dutyCategories,
    isInternship,
    applyEndAfter,
    sortBy = 'deadline',
    page = 1,
    limit = 20,
  } = params;

  // Validate pagination params
  const safePage = Math.max(1, Math.min(page, 1000));
  const safeLimit = Math.max(1, Math.min(limit, 100));

  let queryBuilder = supabase
    .from('job_postings')
    .select('*', { count: 'exact' });

  // Text search with sanitized query
  if (query) {
    const sanitizedQuery = sanitizeSearchQuery(query);
    if (sanitizedQuery) {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${sanitizedQuery}%,org_name.ilike.%${sanitizedQuery}%,duties_text.ilike.%${sanitizedQuery}%`
      );
    }
  }

  // Employment type filter
  if (employmentType && employmentType.length > 0) {
    queryBuilder = queryBuilder.in('employment_type', employmentType);
  }

  // Region filter (array overlap)
  if (regions && regions.length > 0) {
    queryBuilder = queryBuilder.overlaps('regions', regions);
  }

  // Duty category filter (array overlap)
  if (dutyCategories && dutyCategories.length > 0) {
    queryBuilder = queryBuilder.overlaps('duty_categories', dutyCategories);
  }

  // Internship filter
  if (isInternship !== undefined) {
    queryBuilder = queryBuilder.eq('is_internship', isInternship);
  }

  // Deadline filter
  if (applyEndAfter) {
    queryBuilder = queryBuilder.gte('apply_end_at', applyEndAfter);
  }

  // Sorting
  switch (sortBy) {
    case 'deadline':
      queryBuilder = queryBuilder.order('apply_end_at', { ascending: true, nullsFirst: false });
      break;
    case 'recent':
      queryBuilder = queryBuilder.order('created_at', { ascending: false });
      break;
    default:
      queryBuilder = queryBuilder.order('apply_end_at', { ascending: true, nullsFirst: false });
  }

  // Pagination
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;
  queryBuilder = queryBuilder.range(from, to);

  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error('[Supabase] Search jobs error:', error);
    throw new Error('Failed to search jobs');
  }

  const jobs = (data as DbJobPosting[]).map(convertToJobPosting);

  return {
    jobs,
    total: count ?? 0,
  };
}

// ============================================
// Get Job by ID
// ============================================

export async function getJobById(id: string): Promise<JobPosting | null> {
  // Validate UUID format
  if (!isValidUUID(id)) {
    return null;
  }

  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('[Supabase] Get job error:', error);
    throw new Error('Failed to get job');
  }

  return convertToJobPosting(data as DbJobPosting);
}

// ============================================
// Get Jobs by IDs (for comparison)
// ============================================

export async function getJobsByIds(ids: string[]): Promise<JobPosting[]> {
  // Validate and filter valid UUIDs
  const validIds = ids.filter(isValidUUID);

  if (validIds.length === 0) {
    return [];
  }

  // Limit to max 10 jobs
  const limitedIds = validIds.slice(0, 10);

  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .in('id', limitedIds);

  if (error) {
    console.error('[Supabase] Get jobs by ids error:', error);
    throw new Error('Failed to get jobs');
  }

  return (data as DbJobPosting[]).map(convertToJobPosting);
}

// ============================================
// Upsert Jobs (for ETL)
// ============================================

export async function upsertJobs(jobs: Partial<DbJobPosting>[]): Promise<number> {
  if (jobs.length === 0) {
    return 0;
  }

  const client = createServerClient();

  const { data, error } = await client
    .from('job_postings')
    .upsert(jobs, {
      onConflict: 'source_id',
      ignoreDuplicates: false,
    })
    .select('id');

  if (error) {
    console.error('[Supabase] Upsert jobs error:', error);
    throw new Error('Failed to upsert jobs');
  }

  return data?.length ?? 0;
}

// ============================================
// Get Recommended Jobs
// ============================================

export async function getRecommendedJobs(params: {
  regions?: string[];
  dutyCategories?: string[];
  employmentTypes?: string[];
  limit?: number;
}): Promise<JobPosting[]> {
  const { regions, dutyCategories, employmentTypes, limit = 10 } = params;
  const safeLimit = Math.max(1, Math.min(limit, 50));

  let queryBuilder = supabase
    .from('job_postings')
    .select('*')
    .gte('apply_end_at', new Date().toISOString());

  // Prefer matching regions
  if (regions && regions.length > 0) {
    queryBuilder = queryBuilder.overlaps('regions', regions);
  }

  // Prefer matching categories
  if (dutyCategories && dutyCategories.length > 0) {
    queryBuilder = queryBuilder.overlaps('duty_categories', dutyCategories);
  }

  // Filter by employment types
  if (employmentTypes && employmentTypes.length > 0) {
    queryBuilder = queryBuilder.in('employment_type', employmentTypes);
  }

  queryBuilder = queryBuilder
    .order('apply_end_at', { ascending: true })
    .limit(safeLimit);

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('[Supabase] Get recommended jobs error:', error);
    throw new Error('Failed to get recommendations');
  }

  return (data as DbJobPosting[]).map(convertToJobPosting);
}

// ============================================
// Get Statistics
// ============================================

export async function getJobStats(): Promise<{
  totalJobs: number;
  activeJobs: number;
  internships: number;
}> {
  const now = new Date().toISOString();

  // Total count
  const totalResult = await supabase
    .from('job_postings')
    .select('*', { count: 'exact', head: true });

  if (totalResult.error) {
    console.error('[Supabase] Get total jobs error:', totalResult.error);
    throw new Error('Failed to get job stats');
  }

  // Active jobs
  const activeResult = await supabase
    .from('job_postings')
    .select('*', { count: 'exact', head: true })
    .gte('apply_end_at', now);

  if (activeResult.error) {
    console.error('[Supabase] Get active jobs error:', activeResult.error);
    throw new Error('Failed to get job stats');
  }

  // Internships
  const internResult = await supabase
    .from('job_postings')
    .select('*', { count: 'exact', head: true })
    .eq('is_internship', true)
    .gte('apply_end_at', now);

  if (internResult.error) {
    console.error('[Supabase] Get internships error:', internResult.error);
    throw new Error('Failed to get job stats');
  }

  return {
    totalJobs: totalResult.count ?? 0,
    activeJobs: activeResult.count ?? 0,
    internships: internResult.count ?? 0,
  };
}
