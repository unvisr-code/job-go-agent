'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { DutyCategory, JobSearchParams } from '@/types';
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  Briefcase,
  RotateCcw,
} from 'lucide-react';

interface JobFiltersProps {
  filters: JobSearchParams;
  onFiltersChange: (filters: JobSearchParams) => void;
  totalResults?: number;
}

// 효주님 취업 준비 지역: 서울, 경기만
const REGIONS = ['서울', '경기'];

const DUTY_CATEGORIES: { value: DutyCategory; label: string }[] = [
  { value: 'DATA', label: '데이터' },
  { value: 'DEVELOPMENT', label: '개발' },
  { value: 'MARKETING', label: '마케팅' },
  { value: 'DESIGN', label: '디자인' },
  { value: 'HR', label: '인사' },
  { value: 'FINANCE', label: '재무/회계' },
  { value: 'ADMINISTRATION', label: '행정' },
  { value: 'RESEARCH', label: '연구' },
  { value: 'OTHER', label: '기타' },
];

export function JobFilters({
  filters,
  onFiltersChange,
  totalResults,
}: JobFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    regions: true,
    dutyCategories: true,
  });

  const [searchValue, setSearchValue] = useState(filters.query || '');

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSearch = () => {
    onFiltersChange({ ...filters, query: searchValue || undefined, page: 1 });
  };

  const toggleArrayFilter = <T extends string>(
    key: 'regions' | 'dutyCategories',
    value: T
  ) => {
    const current = (filters[key] as T[]) || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    onFiltersChange({ ...filters, [key]: updated.length > 0 ? updated : undefined, page: 1 });
  };

  const clearFilters = () => {
    setSearchValue('');
    // 기본값 유지: 서울/경기, 인턴 공고만
    onFiltersChange({
      page: 1,
      limit: filters.limit,
      sortBy: filters.sortBy,
      regions: ['서울', '경기'],
      employmentType: ['INTERN'],
      isInternship: true,
    });
  };

  // 검색어나 직무분류가 설정되어 있으면 필터 활성 상태
  const hasActiveFilters =
    filters.query ||
    (filters.dutyCategories?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="기관명, 공고명 검색..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 pr-4 h-11 bg-background border-border/50 focus:border-primary/50"
          />
        </div>
        <Button
          onClick={handleSearch}
          className="w-full h-10 font-medium"
          size="sm"
        >
          검색
        </Button>
      </div>

      {/* Result count & Clear */}
      <div className="flex items-center justify-between">
        {totalResults !== undefined && (
          <span className="text-sm text-muted-foreground">
            총 <span className="font-semibold text-foreground">{totalResults.toLocaleString()}</span>개
          </span>
        )}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            초기화
          </button>
        )}
      </div>

      {/* Active filters badges */}
      {filters.query && (
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="secondary"
            className="pl-2 pr-1 py-1 gap-1 cursor-pointer hover:bg-destructive/10"
            onClick={() => {
              setSearchValue('');
              onFiltersChange({ ...filters, query: undefined, page: 1 });
            }}
          >
            &quot;{filters.query}&quot;
            <X className="w-3 h-3" />
          </Badge>
        </div>
      )}

      <Separator />

      {/* 서울/경기 고정 표시 */}
      <div className="text-center py-3 bg-primary/5 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 inline mr-1" />
          <span className="font-medium text-foreground">서울 · 경기</span> 지역
          <span className="font-medium text-primary ml-1">인턴</span> 공고만 표시
        </p>
      </div>

      <Separator />

      {/* Region filter - 간단한 토글 */}
      <FilterSection
        title="근무 지역"
        icon={<MapPin className="w-4 h-4" />}
        expanded={expandedSections.regions}
        onToggle={() => toggleSection('regions')}
        activeCount={filters.regions?.length}
      >
        <div className="flex flex-wrap gap-2 pt-2">
          {REGIONS.map((region) => (
            <Badge
              key={region}
              variant={filters.regions?.includes(region) ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer transition-all hover:scale-105 px-3 py-1.5 text-sm min-h-[36px]',
                filters.regions?.includes(region)
                  ? 'bg-primary hover:bg-primary/90'
                  : 'hover:bg-muted'
              )}
              onClick={() => toggleArrayFilter('regions', region)}
            >
              {region}
            </Badge>
          ))}
        </div>
      </FilterSection>

      <Separator />

      {/* Duty category filter */}
      <FilterSection
        title="직무분류"
        icon={<Briefcase className="w-4 h-4" />}
        expanded={expandedSections.dutyCategories}
        onToggle={() => toggleSection('dutyCategories')}
        activeCount={filters.dutyCategories?.length}
      >
        <div className="flex flex-wrap gap-2 pt-2">
          {DUTY_CATEGORIES.map(({ value, label }) => (
            <Badge
              key={value}
              variant={filters.dutyCategories?.includes(value) ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer transition-all hover:scale-105 px-3 py-1.5 text-sm min-h-[36px]',
                filters.dutyCategories?.includes(value)
                  ? 'bg-primary hover:bg-primary/90'
                  : 'hover:bg-muted'
              )}
              onClick={() => toggleArrayFilter('dutyCategories', value)}
            >
              {label}
            </Badge>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}

// Filter section component
function FilterSection({
  title,
  icon,
  expanded,
  onToggle,
  activeCount,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  activeCount?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 text-sm font-medium hover:text-primary transition-colors min-h-[44px]"
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span>{title}</span>
          {activeCount && activeCount > 0 && (
            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {expanded && children}
    </div>
  );
}
