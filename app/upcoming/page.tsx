'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Building2, BarChart3, ChevronLeft, ChevronRight, MapPin, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MonthlyChart, MonthlyChartSkeleton } from './components/MonthlyChart';
import {
  OrganizationPatternCard,
  OrganizationPatternCardSkeleton,
} from './components/OrganizationPatternCard';
import {
  PredictionList,
  PredictionListSkeleton,
} from './components/PredictionList';
import { OrganizationSearch } from './components/OrganizationSearch';
import { OrganizationDetailModal } from './components/OrganizationDetailModal';
import { PredictionEvidenceModal } from './components/PredictionEvidenceModal';
import type {
  MonthlyStats,
  OrganizationPatternExtended,
  JobPrediction,
  JobPredictionExtended,
  StatsApiResponse,
  OrganizationSearchResponse,
} from '@/types';

const ITEMS_PER_PAGE = 6;

// 2025-02 ~ 2026-02 데이터 기간 기준 월별 통계
async function fetchMonthlyStats(): Promise<MonthlyStats[]> {
  const res = await fetch('/api/stats/monthly?period=data');
  if (!res.ok) throw new Error('Failed to fetch monthly stats');
  const data: StatsApiResponse<MonthlyStats[]> = await res.json();
  return data.data;
}

// 기관별 패턴 (상세 데이터 포함) - 전체 데이터 가져옴
async function fetchOrganizationPatterns(
  query?: string
): Promise<OrganizationSearchResponse> {
  const params = new URLSearchParams({
    extended: 'true',
    limit: '200', // 전체 데이터
  });
  if (query) params.set('query', query);

  const res = await fetch(`/api/stats/organizations?${params}`);
  if (!res.ok) throw new Error('Failed to fetch organization patterns');
  const data: StatsApiResponse<OrganizationSearchResponse> = await res.json();
  return data.data;
}

// 예측 (근거 포함)
async function fetchPredictions(): Promise<JobPredictionExtended[]> {
  const res = await fetch('/api/stats/predictions?extended=true&months=10');
  if (!res.ok) throw new Error('Failed to fetch predictions');
  const data = await res.json();
  return data.predictions;
}

export default function UpcomingPage() {
  // 검색 상태
  const [searchQuery, setSearchQuery] = useState('');
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);

  // 모달 상태
  const [selectedOrg, setSelectedOrg] = useState<OrganizationPatternExtended | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<JobPredictionExtended | null>(null);

  // 데이터 쿼리
  const {
    data: monthlyStats,
    isLoading: isLoadingMonthly,
    error: monthlyError,
  } = useQuery({
    queryKey: ['stats', 'monthly', 'data-period'],
    queryFn: fetchMonthlyStats,
  });

  const {
    data: orgResponse,
    isLoading: isLoadingPatterns,
    error: patternsError,
  } = useQuery({
    queryKey: ['stats', 'organizations', 'extended', searchQuery],
    queryFn: () => fetchOrganizationPatterns(searchQuery),
  });

  const {
    data: predictions,
    isLoading: isLoadingPredictions,
    error: predictionsError,
  } = useQuery({
    queryKey: ['stats', 'predictions', 'extended'],
    queryFn: fetchPredictions,
  });

  // 페이지네이션 계산
  const patterns = orgResponse?.patterns || [];
  const totalPages = Math.ceil(patterns.length / ITEMS_PER_PAGE);
  const paginatedPatterns = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return patterns.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [patterns, currentPage]);

  // 핸들러
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // 검색 시 첫 페이지로
  }, []);

  const handleOrgClick = useCallback((pattern: OrganizationPatternExtended) => {
    setSelectedOrg(pattern);
  }, []);

  const handlePredictionClick = useCallback((prediction: JobPrediction | JobPredictionExtended) => {
    if ('confidenceLevel' in prediction) {
      setSelectedPrediction(prediction as JobPredictionExtended);
    }
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Hero section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">
          효주님, <span className="text-primary">예정 공고</span>를 예측해봤어요
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto mb-4">
          2025.02 ~ 2026.02 채용 데이터를 분석해 다가올 공고를 미리 알려드려요
        </p>
        {/* 범위 표시 */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1.5">
            <MapPin className="w-3 h-3" />
            서울 · 경기
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <Briefcase className="w-3 h-3" />
            인턴 · 청년인턴
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Charts & Organizations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Monthly Chart */}
          <div className="glass rounded-2xl p-5 border border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">월별 인턴 공고 현황</h2>
              <span className="text-xs text-muted-foreground ml-auto">
                서울/경기 기준
              </span>
            </div>

            {isLoadingMonthly && <MonthlyChartSkeleton />}
            {monthlyError && (
              <div className="text-center py-8 text-muted-foreground">
                데이터를 불러오는데 실패했습니다
              </div>
            )}
            {monthlyStats && <MonthlyChart data={monthlyStats} />}
          </div>

          {/* Organization Patterns with Search & Pagination */}
          <div className="glass rounded-2xl p-5 border border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">기관별 채용 패턴</h2>
              {orgResponse && (
                <span className="text-xs text-muted-foreground ml-auto">
                  총 {orgResponse.total}개 기관
                </span>
              )}
            </div>

            {/* Search */}
            <div className="mb-4">
              <OrganizationSearch
                onSearch={handleSearch}
                placeholder="기관명으로 검색..."
              />
            </div>

            {isLoadingPatterns && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                  <OrganizationPatternCardSkeleton key={i} />
                ))}
              </div>
            )}
            {patternsError && (
              <div className="text-center py-8 text-muted-foreground">
                데이터를 불러오는데 실패했습니다
              </div>
            )}
            {paginatedPatterns.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[420px]">
                  {paginatedPatterns.map((pattern) => (
                    <OrganizationPatternCard
                      key={pattern.orgName}
                      pattern={pattern}
                      onClick={() => handleOrgClick(pattern)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border/50">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2.5 rounded-lg hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`min-w-[44px] min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                              currentPage === pageNum
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2.5 rounded-lg hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            )}
            {patterns.length === 0 && !isLoadingPatterns && (
              <div className="text-center py-8 text-muted-foreground min-h-[420px] flex items-center justify-center">
                {searchQuery
                  ? `"${searchQuery}"에 해당하는 기관이 없습니다`
                  : '아직 충분한 데이터가 없습니다'}
              </div>
            )}
          </div>
        </div>

        {/* Right column - Predictions */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          {/* Predictions */}
          <div className="glass rounded-2xl p-5 border border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">예측 공고</h2>
              <span className="text-xs text-muted-foreground ml-auto">
                2월~12월
              </span>
            </div>

            {isLoadingPredictions && <PredictionListSkeleton />}
            {predictionsError && (
              <div className="text-center py-8 text-muted-foreground">
                데이터를 불러오는데 실패했습니다
              </div>
            )}
            {predictions && (
              <div className="max-h-[600px] overflow-y-auto pr-1">
                <PredictionList
                  predictions={predictions}
                  onPredictionClick={handlePredictionClick}
                  initialCollapsed={true}
                />
              </div>
            )}

            {/* 안내 */}
            {predictions && predictions.length > 0 && (
              <p className="text-xs text-muted-foreground text-center mt-4 pt-4 border-t border-border/50">
                * 클릭하면 예측 근거를 확인할 수 있어요
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Organization Detail Modal */}
      {selectedOrg && (
        <OrganizationDetailModal
          pattern={selectedOrg}
          onClose={() => setSelectedOrg(null)}
        />
      )}

      {/* Prediction Evidence Modal */}
      {selectedPrediction && (
        <PredictionEvidenceModal
          prediction={selectedPrediction}
          onClose={() => setSelectedPrediction(null)}
        />
      )}
    </div>
  );
}
