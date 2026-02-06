'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { JobCard, JobCardSkeleton } from '@/components/JobCard';
import { JobFilters } from '@/components/JobFilters';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBookmarks } from '@/lib/hooks/useBookmarks';
import type { JobSearchParams, JobSearchResponse } from '@/types';
import { ChevronLeft, ChevronRight, Sparkles, Filter, X } from 'lucide-react';

async function searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
  const searchParams = new URLSearchParams();

  if (params.query) searchParams.set('query', params.query);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.isInternship !== undefined) {
    searchParams.set('isInternship', String(params.isInternship));
  }

  params.regions?.forEach((r) => searchParams.append('regions', r));
  params.employmentType?.forEach((t) => searchParams.append('employmentType', t));
  params.dutyCategories?.forEach((c) => searchParams.append('dutyCategories', c));

  // 마감된 공고 제외
  searchParams.set('applyEndAfter', new Date().toISOString());

  const res = await fetch(`/api/jobs?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch jobs');
  return res.json();
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Parse initial filters from URL - 기본값: 서울/경기, 인턴 공고만
  const urlRegions = searchParams.getAll('regions').filter(Boolean);
  const urlEmploymentTypes = searchParams.getAll('employmentType').filter(Boolean) as JobSearchParams['employmentType'];

  const initialFilters: JobSearchParams = {
    query: searchParams.get('query') || undefined,
    sortBy: (searchParams.get('sortBy') as 'deadline' | 'recent') || 'deadline',
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: 12,
    // 기본값: 서울, 경기
    regions: urlRegions.length > 0 ? urlRegions : ['서울', '경기'],
    // 기본값: INTERN
    employmentType: (urlEmploymentTypes && urlEmploymentTypes.length > 0) ? urlEmploymentTypes : ['INTERN'],
    dutyCategories: searchParams.getAll('dutyCategories').filter(Boolean) as JobSearchParams['dutyCategories'],
    // 기본값: true (인턴십 공고만)
    isInternship: true,
  };

  const [filters, setFilters] = useState<JobSearchParams>(initialFilters);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.query) params.set('query', filters.query);
    if (filters.sortBy && filters.sortBy !== 'deadline') params.set('sortBy', filters.sortBy);
    if (filters.page && filters.page > 1) params.set('page', String(filters.page));
    if (filters.isInternship) params.set('isInternship', 'true');
    filters.regions?.forEach((r) => params.append('regions', r));
    filters.employmentType?.forEach((t) => params.append('employmentType', t));
    filters.dutyCategories?.forEach((c) => params.append('dutyCategories', c));

    const newUrl = params.toString() ? `?${params.toString()}` : '/';
    router.replace(newUrl, { scroll: false });
  }, [filters, router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => searchJobs(filters),
  });

  const handleFiltersChange = (newFilters: JobSearchParams) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = data ? Math.ceil(data.total / (filters.limit || 12)) : 0;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Hero section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">
          효주님, 오늘의 <span className="text-primary">인턴 공고</span>
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          공공기관 인턴 채용, 공채GO가 함께합니다
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Mobile filter toggle */}
        <div className="lg:hidden flex items-center justify-between mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileFilter(true)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            필터
          </Button>

          <Select
            value={filters.sortBy || 'deadline'}
            onValueChange={(value) =>
              handleFiltersChange({
                ...filters,
                sortBy: value as 'deadline' | 'recent',
                page: 1,
              })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deadline">마감일순</SelectItem>
              <SelectItem value="recent">최신순</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile filter overlay */}
        {showMobileFilter && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowMobileFilter(false)}
            />
            <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-background p-6 overflow-y-auto animate-in slide-in-from-left">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-lg">필터</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMobileFilter(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <JobFilters
                filters={filters}
                onFiltersChange={(f) => {
                  handleFiltersChange(f);
                  setShowMobileFilter(false);
                }}
                totalResults={data?.total}
              />
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24 glass rounded-2xl p-5 border border-border/50">
            <JobFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              totalResults={data?.total}
            />
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="hidden lg:flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {data && (
                <span className="text-sm text-muted-foreground">
                  총{' '}
                  <span className="font-semibold text-foreground">
                    {data.total.toLocaleString()}
                  </span>
                  개의 공고
                </span>
              )}
            </div>

            <Select
              value={filters.sortBy || 'deadline'}
              onValueChange={(value) =>
                handleFiltersChange({
                  ...filters,
                  sortBy: value as 'deadline' | 'recent',
                  page: 1,
                })
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline">마감일순</SelectItem>
                <SelectItem value="recent">최신순</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error state */}
          {error && (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">데이터를 불러오는데 실패했습니다.</p>
              <Button onClick={() => window.location.reload()}>다시 시도</Button>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <JobCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && data?.jobs.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">검색 결과가 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                다른 검색 조건을 시도해보세요
              </p>
            </div>
          )}

          {/* Job grid */}
          {!isLoading && !error && data && data.jobs.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {data.jobs.map((job, index) => (
                  <div
                    key={job.id}
                    style={{ animationDelay: `${index * 50}ms` }}
                    className="animate-in fade-in-0 slide-in-from-bottom-4"
                  >
                    <JobCard
                      job={job}
                      onClick={(job) => router.push(`/jobs/${job.id}`)}
                      isBookmarked={isBookmarked(job.id)}
                      onToggleBookmark={toggleBookmark}
                    />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange((filters.page || 1) - 1)}
                    disabled={!filters.page || filters.page <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const page = i + 1;
                      const currentPage = filters.page || 1;
                      let displayPage = page;

                      if (totalPages > 5) {
                        if (currentPage <= 3) {
                          displayPage = page;
                        } else if (currentPage >= totalPages - 2) {
                          displayPage = totalPages - 4 + i;
                        } else {
                          displayPage = currentPage - 2 + i;
                        }
                      }

                      return (
                        <Button
                          key={displayPage}
                          variant={currentPage === displayPage ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => handlePageChange(displayPage)}
                          className="w-9 h-9"
                        >
                          {displayPage}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange((filters.page || 1) + 1)}
                    disabled={!data.hasMore}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">
            효주님, 오늘의 <span className="text-primary">인턴 공고</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            공공기관 인턴 채용, 공채GO가 함께합니다
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
