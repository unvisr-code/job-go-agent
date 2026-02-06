import { z } from 'zod';

// ============================================
// Common Schemas
// ============================================

export const EmploymentTypeSchema = z.enum(['INTERN', 'CONTRACT', 'REGULAR', 'OTHER']);
export const DutyCategorySchema = z.enum([
  'DATA',
  'DEVELOPMENT',
  'MARKETING',
  'DESIGN',
  'HR',
  'FINANCE',
  'ADMINISTRATION',
  'RESEARCH',
  'OTHER',
]);
export const SortBySchema = z.enum(['deadline', 'recent', 'relevance']);

// UUID validation
export const UUIDSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Invalid UUID format'
);

// ============================================
// API Request Schemas
// ============================================

// POST /api/chat
export const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
  sessionId: UUIDSchema.optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .max(50, 'History too long')
    .optional()
    .default([]),
});

// POST /api/jobs/compare
export const CompareRequestSchema = z.object({
  jobIds: z
    .array(UUIDSchema)
    .min(2, 'Please provide at least 2 job IDs')
    .max(5, 'Maximum 5 job IDs allowed'),
});

// GET /api/jobs query params
export const JobSearchQuerySchema = z.object({
  query: z.string().max(100).optional(),
  employmentType: z.array(EmploymentTypeSchema).optional(),
  regions: z.array(z.string().max(50)).optional(),
  dutyCategories: z.array(DutyCategorySchema).optional(),
  isInternship: z.boolean().optional(),
  applyEndAfter: z.string().datetime().optional(),
  sortBy: SortBySchema.optional().default('deadline'),
  page: z.coerce.number().int().positive().max(1000).optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// GET /api/recommend query params
export const RecommendQuerySchema = z.object({
  regions: z.array(z.string().max(50)).optional(),
  dutyCategories: z.array(DutyCategorySchema).optional(),
  employmentTypes: z.array(EmploymentTypeSchema).optional(),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
});

// ============================================
// Helper Functions
// ============================================

/**
 * Parse search params into an object with arrays
 */
export function parseSearchParams(
  searchParams: URLSearchParams,
  arrayKeys: string[]
): Record<string, string | string[] | undefined> {
  const result: Record<string, string | string[] | undefined> = {};

  for (const key of searchParams.keys()) {
    if (arrayKeys.includes(key)) {
      const values = searchParams.getAll(key).filter(Boolean);
      if (values.length > 0) {
        result[key] = values;
      }
    } else {
      const value = searchParams.get(key);
      if (value !== null) {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Format Zod errors for API response
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}
