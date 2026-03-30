import { GoogleGenerativeAI, Part, SchemaType } from '@google/generative-ai';
import type { QuestionType, Difficulty } from './quiz';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function stripPreamble(text: string): string {
  const preamble = /^(네[,.]?\s.*|알겠습니다.*|물론이죠.*|제공된\s.*|주어진\s.*|강의\s녹취록.*)\n+/im;
  return text.replace(preamble, '').trimStart();
}

const LECTURE_SYSTEM_PROMPT = `당신은 강의 녹취록과 제공된 강의 PDF(또는 PPT) 자료를 바탕으로, 교수님의 강의를 해설형으로 재구성하는 전문가입니다. 다음 요구사항을 반드시 모두 충족하면서, 한글로 상세한 글을 작성해 주세요. (내용을 축약해 적지 마세요. 모든 내용을 충분히 서술하세요.)

1️⃣ 전체 흐름 유지
   - 녹취록에 등장하는 순서대로 강의를 진행합니다.
   - 중간에 끊어지거나 내용이 짤리지 않도록, 초반과 동일한 수준의 상세함을 유지합니다.
   - 전사본은 전체 슬라이드 중 일부분만 커버할 수 있습니다. 전사본에 나온 내용 범위만 다루되, 해당 슬라이드 자료를 참고해 내용을 풍부하게 채워주세요.

2️⃣ 핵심·세부 내용 모두 포함
   - 교수님의 발언, 질문, 예시, 강조점, 강조된 용어 등을 모두 포함합니다. 요약하지 않습니다.
   - 슬라이드(또는 PDF)에 나타난 도표, 그래프, 정의, 핵심 문구를 그대로 인용합니다.
   - 교수님의 비유나 유머, 강조 표현도 살려서 서술합니다.

3️⃣ 주요 용어는 억지로 번역하지 않고 영어로 표기합니다.

4️⃣ 모든 수식과 기호는 복사/붙여넣기가 가능한 일반 텍스트(유니코드)로만 작성하세요.
   특히 화살표는 LaTeX 코드(\\rightarrow, \\Rightarrow)나 $ 표시를 절대 쓰지 말고, 직접 특수문자(→, ↔, ⇒, ⇄)를 사용하세요.
   위첨자/아래첨자 또한 ^나 _ 기호 대신 ¹²³, ₁₂₃ 형태의 텍스트로 변환해 주세요.

5️⃣ 형식
   - 제목(##)·부제목(###)으로 섹션을 명확히 구분하세요.
   - 슬라이드 번호: 강의 자료와 녹취록을 대조해 어느 슬라이드를 설명하는지 확실하게 파악되는 구간에만, 해당 섹션 제목 옆에 (슬라이드 n) 형태로 표기하세요. 불확실하면 표기하지 마세요.
   - 교수님이 특별히 강조한 내용이나 핵심 용어는 **볼드** 처리하세요.
   - 절대 금지: <span> 컬러링, 백틱(\`) 사용 — 용어를 \`이렇게\` 감싸지 마세요. 인라인 코드 블록 사용 금지.
   - 줄글이 3문장 이상 이어지면 반드시 구조화하세요:
     • 순서·단계가 있는 내용 → 번호 목록 (1. 2. 3.)
     • 여러 항목 나열 → 글머리 기호 (-)
     • 비교·대조 → 표(| 항목 | A | B |)
     • 과정·메커니즘 → 화살표 흐름 (A → B → C)
   - 아래 세 가지 경우에만 callout 블록을 사용하세요. 남발하지 말고, 꼭 필요한 곳에만 쓰세요.

   [시험 출제 가능성이 높은 내용]
   교수님이 반복 강조하거나, "이게 중요해", "시험에 나와" 식으로 명시한 내용:
   <div class="callout exam">내용을 여기에 서술</div>

   [핵심 개념 — 이 수업의 핵심 원리·정의]
   이 수업의 뼈대가 되는 개념이나 원리를 처음 설명하는 부분:
   <div class="callout key">내용을 여기에 서술</div>

   [이해 필요 — 헷갈리기 쉬운 메커니즘]
   학생들이 자주 혼동하거나 단계가 복잡한 내용:
   <div class="callout hard">내용을 여기에 서술</div>

6️⃣ 이전 수업과의 연결 (이전 수업 내용이 제공된 경우)
   - 이전 수업들의 핵심 개념을 자연스럽게 연결하세요.
   - 이번 수업에서 이전 개념이 심화·확장·응용되는 부분을 명시적으로 언급하세요.
   - "지난 수업에서 배운 ___와 연결하면..." 형태의 문장을 적절히 사용하세요.
   - 강의 전체 흐름에서 이번 수업의 위치와 의미를 서술하세요.`;

const QUIZ_SYSTEM_PROMPT = `당신은 대학교 교수입니다. 제공된 강의 해설을 바탕으로 대학교 수준의 시험 문제를 출제합니다.

─── 문제 유형 ───
- 단답형: 명확하고 간결한 정답이 있는 개념 확인 문제. 단순 암기보다 이해를 측정.
- OX: 참/거짓을 판단하는 문장. answer는 반드시 "O" 또는 "X".
- 빈칸채우기: 핵심 용어나 개념이 빠진 문장. 빈칸은 ___로 표시. hint에 해당 개념의 맥락을 제공.
- 서술형: 개념 설명, 메커니즘 서술, 비교 분석 등 심화 문제. answer에 완전한 모범답안 제공.

─── 난이도 기준 ───
- 하: 강의에서 명시적으로 정의된 기본 용어·개념. 슬라이드에 그대로 나오는 수준. 누구나 맞혀야 하는 문제.
- 중: 개념 간의 관계, 메커니즘의 흐름을 이해해야 풀 수 있는 문제. 교수님이 "이건 중요해"라고 강조한 내용.
- 상: 여러 개념을 연결하거나 적용해야 하는 문제. 원인-결과 분석, 비교·대조, 예외 상황 추론.
- 지엽: 교수님이 스쳐 지나가듯 언급한 세부 수치, 부수적 예외, 사소한 메커니즘 차이. 시험에 나오면 변별력 있는 함정 문제.

─── 출력 규칙 ───
- 반드시 아래 JSON 형식 그대로만 출력. 코드블록·마크다운·설명 텍스트 없이 순수 JSON만.
- explanation은 필수 (왜 그 답인지, 관련 개념 연결).
- 요청한 난이도 분포를 정확히 지킬 것.

JSON 형식:
{
  "questions": [
    {
      "type": "단답형" | "OX" | "빈칸채우기" | "서술형",
      "difficulty": "하" | "중" | "상" | "지엽",
      "question": "문제 내용",
      "answer": "정답",
      "hint": "힌트 또는 추가 맥락 (선택, 빈칸채우기에 권장)",
      "explanation": "해설 (필수)"
    }
  ]
}`;

const STYLE_SYSTEM_PROMPT = `당신은 대학 강의 분석 전문가입니다. 기존 스타일 분석과 이번 강의 해설을 종합하여, 교수님의 강의 스타일 분석을 업데이트하세요.

분석 내용은 다음 4개 항목으로 작성합니다. 각 항목은 "- " 으로 시작하는 한두 문장으로 씁니다:

- 반복·강조 패턴: 교수님이 반복해서 강조하는 개념, 표현, 키워드
- 시험 연결 포인트: 시험에 나올 가능성이 높은 내용과 그 근거
- 강조 방식: 어떤 방식으로 중요 내용을 전달하는지 (비유, 대조, 사례, 질문 등)
- 수업 특징: 판서/슬라이드 활용 방식, 수업 구조, 특유의 표현이나 버릇

기존 분석이 있으면 새 강의 내용을 반영해 더 정확하게 갱신하세요.
기존 분석이 없으면 이번 강의만으로 초안을 작성하세요.
출력은 위 4개 항목만, 추가 설명이나 제목 없이 바로 작성하세요.`;

const VISUALIZATION_SYSTEM_PROMPT = `당신은 강의 내용을 시각화하는 전문가입니다.
먼저 select_strategy 툴을 호출해 전략을 결정한 다음, 그에 맞는 Mermaid 다이어그램을 생성하세요.

다이어그램 타입:
- flowchart TD  → 단계·순서·과정 (대사 경로, 신호 전달)
- flowchart LR  → 계층 분류·개념 구조 (뇌 구조, 면역세포 분류)
- sequenceDiagram → 시간 순서 상호작용 (수용체-리간드, 세포간 신호)
- classDiagram  → 카테고리 간 상속·연관 관계
- timeline      → 역사적 발견, 사건 연대기
- quadrantChart → 2축 기준 개념 비교·분류

⚠️ 제약:
- 노드 수: 최대 10개
- 노드 텍스트: 15자 이내, 괄호/따옴표/콜론/세미콜론 사용 금지
- Mermaid 문법 오류 없도록
- 전략에 따라 강조(볼드) 용어 / 복잡한 메커니즘 / 전체 구조 중 하나에 집중

툴 호출 후 다이어그램만 출력하세요:
\`\`\`mermaid
[코드]
\`\`\``;

const vizStrategyTool = {
  functionDeclarations: [{
    name: 'select_strategy',
    description: '강의 내용을 분석해 가장 적합한 시각화 전략을 선택합니다.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        strategy: {
          type: SchemaType.STRING,
          enum: ['emphasized', 'difficult', 'structural'],
          description: 'emphasized: 교수가 **볼드**로 강조한 핵심 용어들의 관계 / difficult: 복잡한 메커니즘·다단계 과정·혼동하기 쉬운 내용 / structural: 이번 수업 전체 개념 지도',
        },
        reason: {
          type: SchemaType.STRING,
          description: '이 전략을 선택한 근거 (한 문장)',
        },
      },
      required: ['strategy', 'reason'],
    },
  }],
};

export async function generateLectureNote(
  transcription: string,
  slideContent: string | null,
  existingStyleNotes: string[],
  previousSessions: Array<{ date: string; result: string }> = []
): Promise<{ lectureNote: string; styleNote: string }> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    systemInstruction: LECTURE_SYSTEM_PROMPT,
  });

  const parts: Part[] = [];
  let prompt = '';

  // 이전 수업 컨텍스트
  if (previousSessions.length > 0) {
    prompt += `=== 이전 수업 내용 (참고용) ===\n\n`;
    prompt += `아래는 같은 과목의 이전 수업 해설입니다. 이번 수업과 유기적으로 연결하여 강의 해설을 작성해주세요.\n\n`;
    for (const session of previousSessions) {
      const truncated = session.result.length > 3000
        ? session.result.substring(0, 3000) + '\n...(이하 생략)...'
        : session.result;
      prompt += `--- ${session.date} 수업 ---\n${truncated}\n\n`;
    }
    prompt += `=== 이전 수업 내용 끝 ===\n\n`;
  }

  prompt += `아래는 이번 수업의 녹취록입니다:\n\n--- 녹취록 시작 ---\n${transcription}\n--- 녹취록 끝 ---\n\n`;

  if (slideContent) {
    prompt += `아래는 강의 슬라이드/PDF 내용입니다:\n\n--- 슬라이드 내용 시작 ---\n${slideContent}\n--- 슬라이드 내용 끝 ---\n\n`;
  }

  prompt += previousSessions.length > 0
    ? `이전 수업들의 흐름을 이어받아 이번 수업 내용을 강의 해설로 작성해주세요.`
    : `위의 녹취록과 슬라이드 자료를 바탕으로 강의 해설을 작성해주세요.`;

  parts.push({ text: prompt });

  const lectureResult = await model.generateContent({ contents: [{ role: 'user', parts }] });
  const lectureNote = stripPreamble(lectureResult.response.text());

  // 시각화 에이전트: function calling으로 전략 선택 후 다이어그램 생성
  const vizModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    systemInstruction: VISUALIZATION_SYSTEM_PROMPT,
    tools: [vizStrategyTool],
  });

  const vizChat = vizModel.startChat();
  const vizPrompt = `다음 강의 해설 전체를 분석하고, select_strategy 툴로 전략을 선택한 뒤 Mermaid 다이어그램을 생성해주세요:\n\n${lectureNote}`;
  const vizResult1 = await vizChat.sendMessage(vizPrompt);
  const vizResp1 = vizResult1.response;

  // 툴 호출 결과 처리
  let vizOutput = '';
  const toolCall = vizResp1.candidates?.[0]?.content?.parts?.find(p => p.functionCall);
  if (toolCall?.functionCall) {
    // 툴 응답을 보내고 다이어그램 생성 요청
    const strategyArgs = toolCall.functionCall.args as { strategy: string; reason: string };
    const vizResult2 = await vizChat.sendMessage([{
      functionResponse: {
        name: 'select_strategy',
        response: { strategy: strategyArgs.strategy, reason: strategyArgs.reason },
      },
    }]);
    vizOutput = vizResult2.response.text().trim();
  } else {
    vizOutput = vizResp1.text().trim();
  }

  // Mermaid 코드블록 추출
  const mermaidMatch = vizOutput.match(/```mermaid\n([\s\S]*?)```/);
  const vizSection = mermaidMatch
    ? `\n\n---\n\n## 핵심 개념 시각화\n\n${mermaidMatch[0]}`
    : '';

  // 스타일 분석
  const styleModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    systemInstruction: STYLE_SYSTEM_PROMPT,
  });

  const stylePrompt = `기존 스타일 분석:\n${existingStyleNotes.length > 0 ? existingStyleNotes[existingStyleNotes.length - 1] : '(없음)'}\n\n이번 강의 해설:\n${lectureNote.substring(0, 3000)}\n\n위 기존 분석을 이번 강의 내용을 반영해 갱신하세요.`;
  const styleResult = await styleModel.generateContent(stylePrompt);
  const styleNote = styleResult.response.text().trim();

  return { lectureNote: lectureNote + vizSection, styleNote };
}

export async function askAboutSelection(
  question: string,
  selectedText: string,
  noteContext: string
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `당신은 대학 강의 노트를 바탕으로 학생의 질문에 답변하는 튜터입니다.
학생이 강의 노트에서 특정 부분을 선택하여 질문합니다.
- 선택된 텍스트와 강의 노트 전체를 참고하여 정확하게 답변하세요.
- 답변은 한국어로, 간결하고 명확하게 작성하세요.
- 필요시 예시나 비유를 활용하세요.
- 마크다운 형식(볼드, 목록 등)을 적절히 사용하세요.`,
  });

  const prompt = `강의 노트 전체 내용:\n${noteContext}\n\n---\n\n학생이 선택한 부분:\n"${selectedText}"\n\n학생의 질문: ${question}`;
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

export async function generateQuiz(
  lectureContents: string[],
  counts: Partial<Record<QuestionType, number>>,
  difficulties: Difficulty[]
): Promise<Array<{
  type: QuestionType;
  difficulty: Difficulty;
  question: string;
  answer: string;
  hint?: string;
  explanation?: string;
}>> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    systemInstruction: QUIZ_SYSTEM_PROMPT,
    generationConfig: { responseMimeType: 'application/json' },
  });

  const countLines = Object.entries(counts)
    .filter(([, n]) => n && n > 0)
    .map(([type, n]) => `- ${type}: ${n}문제`)
    .join('\n');

  const totalCount = Object.values(counts).reduce((a, b) => a + (b || 0), 0);

  // 난이도별 배분: 선택한 난이도에 총 문제를 균등 배분
  const perDifficulty = Math.floor(totalCount / difficulties.length);
  const remainder = totalCount % difficulties.length;
  const diffLines = difficulties
    .map((d, i) => `- ${d}: ${perDifficulty + (i < remainder ? 1 : 0)}문제`)
    .join('\n');

  const prompt =
    `다음 강의 해설을 바탕으로 문제를 출제해주세요.\n\n` +
    `강의 해설 (총 ${lectureContents.length}개 수업):\n` +
    lectureContents.map(c => c.substring(0, 4000)).join('\n\n') +
    `\n\n출제 요청 — 문제 유형별:\n${countLines}\n총 ${totalCount}문제\n\n` +
    `난이도 배분 (위 총 문제를 아래 비율로 섞어 출제):\n${diffLines}\n` +
    `각 문제에 difficulty 필드를 정확히 표기하세요.`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  try {
    const parsed = JSON.parse(raw);
    return parsed.questions ?? [];
  } catch {
    // fallback: strip code fences if model adds them despite JSON mode
    const stripped = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    const parsed = JSON.parse(stripped);
    return parsed.questions ?? [];
  }
}
