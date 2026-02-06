import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cyhsjkeffkvbrjtaqoty.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHNqa2VmZmt2YnJqdGFxb3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM1MDc1NSwiZXhwIjoyMDg1OTI2NzU1fQ.DzbSx9GlH_JYKC0zcZj6XZXMJm01jm0sgl6B4MiEFco'
);

// 모드에 따라 다른 작업 수행
const mode = process.argv[2] || 'check';

async function checkDuplicates() {
  console.log('🔍 중복 공고 확인 중...\n');

  const { data: allJobs, error } = await supabase
    .from('job_postings')
    .select('id, source_id, org_name, title, apply_start_at, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ 오류:', error.message);
    return;
  }

  // source_id 기준 중복 찾기
  const sourceIdMap = new Map<string, typeof allJobs>();

  for (const job of allJobs || []) {
    const existing = sourceIdMap.get(job.source_id) || [];
    existing.push(job);
    sourceIdMap.set(job.source_id, existing);
  }

  const duplicates: { sourceId: string; jobs: typeof allJobs }[] = [];

  for (const [sourceId, jobs] of sourceIdMap.entries()) {
    if (jobs.length > 1) {
      duplicates.push({ sourceId, jobs });
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 중복 확인 결과');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`총 공고 수: ${allJobs?.length || 0}건`);
  console.log(`중복 source_id 수: ${duplicates.length}건`);
  console.log(`중복으로 인한 추가 row 수: ${duplicates.reduce((acc, d) => acc + d.jobs.length - 1, 0)}건`);
  console.log('');

  if (duplicates.length > 0) {
    console.log('📋 중복 목록 (상위 10개):');
    for (const dup of duplicates.slice(0, 10)) {
      console.log(`\n  source_id: ${dup.sourceId}`);
      console.log(`  기관: ${dup.jobs[0].org_name}`);
      console.log(`  제목: ${dup.jobs[0].title}`);
      console.log(`  중복 수: ${dup.jobs.length}개`);
      for (const job of dup.jobs) {
        console.log(`    - id: ${job.id}, created: ${job.created_at}`);
      }
    }
    console.log('\n💡 중복 제거하려면: pnpm tsx scripts/cleanup-db.ts remove-duplicates');
  } else {
    console.log('✅ 중복된 공고가 없습니다!');
  }

  return duplicates;
}

async function removeDuplicates() {
  console.log('🗑️ 중복 공고 제거 시작...\n');

  const { data: allJobs, error } = await supabase
    .from('job_postings')
    .select('id, source_id, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ 오류:', error.message);
    return;
  }

  // source_id 기준 중복 찾기 (최신 1개만 유지)
  const sourceIdMap = new Map<string, string>(); // source_id -> 최신 id
  const idsToDelete: string[] = [];

  for (const job of allJobs || []) {
    if (sourceIdMap.has(job.source_id)) {
      // 이미 있으면 이 job은 중복 (더 오래된 것)
      idsToDelete.push(job.id);
    } else {
      sourceIdMap.set(job.source_id, job.id);
    }
  }

  if (idsToDelete.length === 0) {
    console.log('✅ 중복된 공고가 없습니다!');
    return;
  }

  console.log(`🔄 ${idsToDelete.length}개의 중복 공고 삭제 중...`);

  // 배치로 삭제 (100개씩)
  for (let i = 0; i < idsToDelete.length; i += 100) {
    const batch = idsToDelete.slice(i, i + 100);
    const { error: deleteError } = await supabase
      .from('job_postings')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`❌ 배치 ${i / 100 + 1} 삭제 오류:`, deleteError.message);
    } else {
      console.log(`  ✓ 배치 ${i / 100 + 1}: ${batch.length}건 삭제`);
    }
  }

  console.log('\n✅ 중복 제거 완료!');

  // 최종 현황 확인
  await showStats();
}

async function showStats() {
  const { count: total } = await supabase.from('job_postings').select('*', { count: 'exact', head: true });

  const { data: jobs } = await supabase.from('job_postings').select('org_name, apply_start_at, title, duty_categories');

  const monthCount = new Map<string, number>();
  const orgCount = new Map<string, number>();
  let hasDutyCategories = 0;

  for (const job of jobs || []) {
    if (job.apply_start_at) {
      const month = job.apply_start_at.slice(0, 7);
      monthCount.set(month, (monthCount.get(month) || 0) + 1);
    }
    orgCount.set(job.org_name, (orgCount.get(job.org_name) || 0) + 1);
    if (job.duty_categories && job.duty_categories.length > 0) {
      hasDutyCategories++;
    }
  }

  const sortedMonths = [...monthCount.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const topOrgs = [...orgCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 DB 현황 (인턴 + 서울/경기)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📈 총 공고 수: ${total}건`);
  console.log(`📝 직무분류 있는 공고: ${hasDutyCategories}건 (${Math.round(hasDutyCategories / (total || 1) * 100)}%)`);
  console.log('');
  console.log('📅 월별 공고 수:');
  for (const [month, count] of sortedMonths) {
    const bar = '█'.repeat(Math.ceil(count / 5));
    console.log(`  ${month}: ${bar} ${count}건`);
  }
  console.log('');
  console.log('🏢 TOP 15 기관:');
  for (let i = 0; i < topOrgs.length; i++) {
    const [name, count] = topOrgs[i];
    console.log(`  ${i + 1}. ${name}: ${count}건`);
  }
}

async function cleanup() {
  console.log('🗑️ DB 정리 시작...\n');

  // 1. 인턴이 아닌 공고 삭제
  const { data: nonIntern } = await supabase
    .from('job_postings')
    .delete()
    .eq('is_internship', false)
    .select('id');

  console.log('1️⃣ 인턴 아닌 공고 삭제:', nonIntern?.length || 0, '건');

  // 2. 서울/경기가 아닌 공고 찾기 및 삭제
  const { data: allJobs } = await supabase.from('job_postings').select('id, regions');

  const nonSeoulGyeonggiIds: string[] = [];

  for (const job of allJobs || []) {
    const regions = job.regions || [];
    let hasSeoulOrGyeonggi = false;

    for (const r of regions) {
      if (r.includes('서울') || r.includes('경기')) {
        hasSeoulOrGyeonggi = true;
        break;
      }
    }

    if (!hasSeoulOrGyeonggi) {
      nonSeoulGyeonggiIds.push(job.id);
    }
  }

  if (nonSeoulGyeonggiIds.length > 0) {
    const { data: deleted } = await supabase
      .from('job_postings')
      .delete()
      .in('id', nonSeoulGyeonggiIds)
      .select('id');
    console.log('2️⃣ 서울/경기 외 지역 삭제:', deleted?.length || 0, '건');
  } else {
    console.log('2️⃣ 서울/경기 외 지역 삭제: 0건');
  }

  // 3. 중복 제거
  await removeDuplicates();
}

// 실행
async function main() {
  switch (mode) {
    case 'check':
      await checkDuplicates();
      break;
    case 'remove-duplicates':
      await removeDuplicates();
      break;
    case 'stats':
      await showStats();
      break;
    case 'cleanup':
      await cleanup();
      break;
    default:
      console.log('사용법:');
      console.log('  pnpm tsx scripts/cleanup-db.ts check           # 중복 확인');
      console.log('  pnpm tsx scripts/cleanup-db.ts remove-duplicates  # 중복 제거');
      console.log('  pnpm tsx scripts/cleanup-db.ts stats           # 통계 확인');
      console.log('  pnpm tsx scripts/cleanup-db.ts cleanup         # 전체 정리');
  }
}

main();
