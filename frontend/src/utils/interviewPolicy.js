export const INTERVIEW_TOTAL_QUESTIONS = 20;
export const SESSION_QUESTION_COUNT = 5;
export const PARTIAL_REPORT_MIN_ANSWERS = 5;

export const INTERVIEW_SESSIONS = [
  {
    key: 'cs_fundamentals',
    label: 'CS Fundamentals',
    rangeLabel: 'Q1~Q5',
    start: 1,
    end: 5,
  },
  {
    key: 'framework_usage',
    label: 'Framework Usage',
    rangeLabel: 'Q6~Q10',
    start: 6,
    end: 10,
  },
  {
    key: 'problem_solving',
    label: 'Problem Solving',
    rangeLabel: 'Q11~Q15',
    start: 11,
    end: 15,
  },
  {
    key: 'communication',
    label: 'Communication',
    rangeLabel: 'Q16~Q20',
    start: 16,
    end: 20,
  },
];

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function clampQuestionNumber(value) {
  const num = toFiniteNumber(value);
  if (num == null) return null;
  return Math.max(1, Math.min(INTERVIEW_TOTAL_QUESTIONS, Math.trunc(num)));
}

export function getEvaluationQuestionNumber(evaluation, fallbackNumber) {
  const fallback = clampQuestionNumber(fallbackNumber) ?? 1;
  const numberKeys = ['question_number', 'questionNumber', 'question_no', 'questionNo', 'q_number', 'qNumber'];

  for (const key of numberKeys) {
    const parsed = clampQuestionNumber(evaluation?.[key]);
    if (parsed != null) return parsed;
  }

  const indexKeys = ['question_index', 'questionIndex', 'q_index', 'qIndex'];
  for (const key of indexKeys) {
    const raw = toFiniteNumber(evaluation?.[key]);
    if (raw == null) continue;
    if (raw === fallback - 1) return clampQuestionNumber(raw + 1) ?? fallback;
    if (raw === fallback) return clampQuestionNumber(raw) ?? fallback;
    return clampQuestionNumber(raw) ?? fallback;
  }

  return fallback;
}

export function getCurrentQuestionNumber({ evaluations = [], serverQuestionCount, isFinished = false } = {}) {
  const answeredCount = Array.isArray(evaluations) ? evaluations.length : 0;
  if (isFinished || answeredCount >= INTERVIEW_TOTAL_QUESTIONS) {
    return INTERVIEW_TOTAL_QUESTIONS;
  }

  const fallback = clampQuestionNumber(answeredCount + 1) ?? 1;
  const serverNumber = clampQuestionNumber(serverQuestionCount);
  if (serverNumber != null && serverNumber >= fallback) return serverNumber;
  return fallback;
}

export function getSessionForQuestion(questionNumber) {
  const safeNumber = clampQuestionNumber(questionNumber) ?? 1;
  return (
    INTERVIEW_SESSIONS.find(({ start, end }) => safeNumber >= start && safeNumber <= end) ??
    INTERVIEW_SESSIONS[0]
  );
}

function normalizeScore10(score) {
  const num = toFiniteNumber(score);
  if (num == null) return null;
  const score10 = num > 10 ? num / 10 : num;
  return Math.max(0, Math.min(10, score10));
}

export function formatSessionScore(score10) {
  const normalized = normalizeScore10(score10);
  if (normalized == null) return '평가 부족';
  return `${Number.isInteger(normalized) ? normalized : normalized.toFixed(1)}/10`;
}

export function buildSessionProgress({
  evaluations = [],
  currentQuestionNumber,
  reportScores = {},
  isFinished = false,
} = {}) {
  const evalsByQuestion = new Map();

  (Array.isArray(evaluations) ? evaluations : []).forEach((evaluation, index) => {
    const questionNumber = getEvaluationQuestionNumber(evaluation, index + 1);
    evalsByQuestion.set(questionNumber, {
      evaluation,
      evaluationIndex: index,
      questionNumber,
    });
  });

  return INTERVIEW_SESSIONS.map((session) => {
    const items = Array.from({ length: SESSION_QUESTION_COUNT }, (_, offset) => {
      const questionNumber = session.start + offset;
      const evalEntry = evalsByQuestion.get(questionNumber);
      const status = evalEntry
        ? 'completed'
        : !isFinished && questionNumber === currentQuestionNumber
        ? 'current'
        : 'waiting';

      return {
        questionNumber,
        status,
        evaluation: evalEntry?.evaluation ?? null,
        evaluationIndex: evalEntry?.evaluationIndex ?? null,
      };
    });

    const completedItems = items.filter((item) => item.status === 'completed');
    const completedScores = completedItems
      .map((item) => normalizeScore10(item.evaluation?.score))
      .filter((score) => score != null);
    const derivedAverage =
      completedScores.length > 0
        ? completedScores.reduce((sum, score) => sum + score, 0) / completedScores.length
        : null;
    const legacyScore = normalizeScore10(reportScores?.[session.key]);
    const isComplete = completedItems.length === SESSION_QUESTION_COUNT;
    const averageScore10 = isComplete ? derivedAverage ?? legacyScore : null;

    return {
      ...session,
      items,
      completedCount: completedItems.length,
      progress: completedItems.length / SESSION_QUESTION_COUNT,
      isActive: items.some((item) => item.status === 'current'),
      isComplete,
      averageScore10,
      score100: averageScore10 == null ? 0 : Math.round(averageScore10 * 10),
    };
  });
}
