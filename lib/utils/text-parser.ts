/**
 * 채용공고 텍스트 파싱 유틸리티
 * 공공데이터포털 API의 비정형 텍스트를 구조화된 형태로 변환
 */

/**
 * 지원자격 텍스트를 개별 항목으로 파싱
 */
export function parseRequirements(text: string): string[] {
  if (!text || text.trim() === '') return [];

  // 다양한 구분자로 분리 시도
  const separators = [
    /\s*○\s*/,           // ○ 기호
    /\s*●\s*/,           // ● 기호
    /\s*◎\s*/,           // ◎ 기호
    /\s*-\s+/,           // - 기호 (공백 필수)
    /\s*\d+\)\s*/,       // 1) 2) 형식
    /\s*\d+\.\s*/,       // 1. 2. 형식
    /\s*[가-힣]\)\s*/,   // 가) 나) 형식
    /\n+/,               // 줄바꿈
  ];

  let items: string[] = [text];

  for (const sep of separators) {
    const newItems: string[] = [];
    for (const item of items) {
      const parts = item.split(sep).filter(p => p.trim().length > 0);
      if (parts.length > 1) {
        newItems.push(...parts);
      } else {
        newItems.push(item);
      }
    }
    items = newItems;
  }

  // 각 항목 정리
  return items
    .map(item => item.trim())
    .filter(item => item.length > 5) // 너무 짧은 항목 제외
    .map(item => {
      // 앞의 특수문자/번호 제거
      return item.replace(/^[\s○●◎\-\d\)\.\가-힣]+/, '').trim();
    })
    .filter(item => item.length > 0);
}

/**
 * 직무내용 텍스트를 가독성 있게 포맷팅
 */
export function formatDutiesText(text: string): string[] {
  if (!text || text.trim() === '') return [];

  // 쉼표나 마침표로 구분된 경우 분리
  const items = text
    .split(/[,،.]/)
    .map(item => item.trim())
    .filter(item => item.length > 0);

  // 단순 나열이면 그대로 반환
  if (items.length > 1 && items.every(item => item.length < 30)) {
    return items;
  }

  // 긴 텍스트면 문단 구분 시도
  const paragraphs = text
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return paragraphs.length > 1 ? paragraphs : [text];
}

/**
 * 전형절차 텍스트를 단계별로 파싱
 */
export function parseSelectionSteps(text: string): { order: number; name: string; description?: string }[] {
  if (!text || text.trim() === '') return [];

  const steps: { order: number; name: string; description?: string }[] = [];

  // 화살표로 구분된 경우
  if (text.includes('→')) {
    const parts = text.split('→').map(p => p.trim()).filter(p => p.length > 0);
    parts.forEach((part, index) => {
      // 숫자 제거하고 이름만 추출
      const name = part.replace(/^\d+[차\.\)]\s*/, '').trim();
      if (name.length > 0 && name.length < 30) {
        steps.push({ order: index + 1, name });
      }
    });
    if (steps.length > 0) return steps;
  }

  // "1차", "2차" 패턴
  const matches = [...text.matchAll(/(\d)차[:\s]*([^→\n○●\d]{2,20})/g)];
  if (matches.length > 0) {
    matches.forEach(match => {
      steps.push({
        order: parseInt(match[1]),
        name: match[2].trim()
      });
    });
    return steps;
  }

  // 일반적인 전형 키워드 추출
  const keywords = ['서류', '필기', '면접', '인성', '신체', '최종'];
  const found: string[] = [];

  keywords.forEach(keyword => {
    const regex = new RegExp(`${keyword}[가-힣]*(?:전형|심사|평가|검사)`, 'g');
    const matches = text.match(regex);
    if (matches) {
      matches.forEach(m => {
        if (!found.includes(m)) found.push(m);
      });
    }
  });

  if (found.length > 0) {
    found.forEach((name, index) => {
      steps.push({ order: index + 1, name });
    });
    return steps;
  }

  return [];
}

/**
 * 긴 텍스트를 읽기 쉽게 포맷팅 (줄바꿈, 들여쓰기 등)
 */
export function formatLongText(text: string): string {
  if (!text) return '';

  return text
    // ○, ●, - 앞에 줄바꿈 추가
    .replace(/\s*(○|●|◎)\s*/g, '\n$1 ')
    // 숫자. 앞에 줄바꿈 추가
    .replace(/\s+(\d+\.)\s*/g, '\n$1 ')
    // 연속 공백 제거
    .replace(/\s{2,}/g, ' ')
    // 시작 줄바꿈 제거
    .replace(/^\n+/, '')
    .trim();
}

/**
 * 날짜 관련 텍스트 추출
 */
export function extractDates(text: string): { start?: string; end?: string } {
  const datePattern = /(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/g;
  const dates = [...text.matchAll(datePattern)].map(m => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`);

  return {
    start: dates[0],
    end: dates[1] || dates[0]
  };
}
