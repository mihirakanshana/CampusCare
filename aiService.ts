import { AIAnalysisResult, IntelligenceReport } from '../types/campuscare';

export interface AnalyzeIssuePayload {
  title: string;
  description: string;
  category?: string;
  building?: string;
  roomNumber?: string;
  imageBase64?: string;
  imageMimeType?: string;
  existingReportsSummary?: Array<{
    reportId: string;
    title: string;
    category: string;
    building: string;
    location: string;
    status: string;
  }>;
}

async function postJsonWithTimeout<T>(url: string, body: unknown, timeoutMs = 25000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'AI service request failed.');
    }
    return data as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('AI request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function analyzeIssueWithAI(
  payload: AnalyzeIssuePayload
): Promise<AIAnalysisResult> {
  return postJsonWithTimeout<AIAnalysisResult>('/api/ai/analyze-issue', payload, 25000);
}

export type AssistantLanguage = 'auto' | 'english' | 'sinhala' | 'singlish';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function sendAssistantMessage(
  message: string,
  history: ChatMessage[],
  userRole: 'student' | 'admin',
  language: AssistantLanguage = 'auto'
): Promise<string> {
  const data = await postJsonWithTimeout<{ reply: string }>(
    '/api/ai/chat',
    { message, history, userRole, language },
    25000
  );
  return data.reply;
}

export async function generateIntelligenceInsights(stats: {
  totalReports: number;
  demoReportsCount: number;
  verifiedReportsCount: number;
  pendingCount: number;
  inProgressCount: number;
  resolvedCount: number;
  highAndUrgentCount: number;
  avgResolutionHours: number | null;
  categoryBreakdown: Array<{ name: string; count: number }>;
  buildingBreakdown: Array<{ name: string; count: number }>;
  priorityBreakdown: Array<{ name: string; count: number }>;
}): Promise<IntelligenceReport> {
  return postJsonWithTimeout<IntelligenceReport>('/api/ai/intelligence', { stats }, 25000);
}
