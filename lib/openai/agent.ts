import { openai, CHAT_MODEL } from './client';
import { agentTools, executeToolCall } from './tools';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const SYSTEM_PROMPT = `당신은 효주님의 개인 취업 코치 '공채GO'입니다.

## 역할
- 효주님의 공공기관 인턴/취업 공고 탐색을 도와드리는 AI 어시스턴트
- 원하는 조건의 공고를 검색하고, 맞춤 추천을 제공

## 사용 가능한 도구
1. search_jobs: 채용공고 검색 (키워드, 지역, 직무 필터)
2. get_job_detail: 특정 공고 상세 조회
3. recommend_jobs: 맞춤 공고 추천

## 응답 스타일
- 효주님께 친근하고 따뜻하게 대화
- 핵심 정보를 깔끔하게 정리
- 마감 임박 공고는 강조 표시
- 간결하되 필요한 정보는 빠짐없이

## 공고 정보 포맷
📌 **[기관명]** 공고 제목 [상세보기](/jobs/{id})
- 📅 접수기간: MM/DD ~ MM/DD
- 📍 지역: 서울 등
- 💼 직무: 행정/데이터 등
- 👥 모집인원: N명

검색/추천 결과의 각 공고에는 반드시 상세보기 링크 (/jobs/{공고ID})를 포함하세요.

## 직무분류
- DATA: 데이터, 정보, 전산
- DEVELOPMENT: 개발, IT
- MARKETING: 마케팅, 홍보
- ADMINISTRATION: 행정, 사무
- RESEARCH: 연구, 분석

## 주의사항
- 정확한 정보만 제공 (추측 금지)
- 불확실한 내용은 "공고 원문 확인 필요"로 안내

검색 결과가 없으면 다른 조건을 제안해주세요.`;

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Agent 실행
 * Function Calling을 통해 도구를 실행하고 응답을 생성
 */
export async function runAgent(
  userMessage: string,
  conversationHistory: AgentMessage[] = []
): Promise<string> {
  // 대화 히스토리 구성
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  // 최대 5번의 tool call 반복 허용
  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    iterations++;

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      tools: agentTools,
      tool_choice: 'auto',
      temperature: 0.7,
    });

    const message = response.choices[0].message;

    // Tool call이 없으면 최종 응답
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content || '응답을 생성하지 못했습니다.';
    }

    // Tool call 실행
    messages.push(message as ChatCompletionMessageParam);

    for (const toolCall of message.tool_calls) {
      // Handle different tool call types
      if (toolCall.type !== 'function') continue;

      const functionName = toolCall.function.name;

      // Safely parse function arguments
      let functionArgs: Record<string, unknown>;
      try {
        functionArgs = JSON.parse(toolCall.function.arguments || '{}');
      } catch (parseError) {
        console.error(`[Agent] Failed to parse arguments for ${functionName}:`, parseError);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            error: 'Invalid function arguments',
          }),
        });
        continue;
      }

      console.log(`[Agent] Calling tool: ${functionName}`, functionArgs);

      try {
        const result = await executeToolCall(functionName, functionArgs);

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result, null, 2),
        });
      } catch (error) {
        console.error(`[Agent] Tool error: ${functionName}`, error);

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            error: error instanceof Error ? error.message : 'Tool execution failed',
          }),
        });
      }
    }
  }

  return '죄송합니다. 요청을 처리하는 데 시간이 너무 오래 걸렸습니다. 다시 시도해주세요.';
}
