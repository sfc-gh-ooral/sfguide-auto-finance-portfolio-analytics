import { NextResponse } from 'next/server';
import { isSnowflakeConfigured, liveError, notConfigured } from '@/lib/snowflake';
import { runAgent } from '@/lib/agent';
import type { AskAnswer } from '@/lib/types';

// Live Ask: the question goes to AUTO_FINANCE_AGENT, which writes SQL with Cortex Analyst over the
// AUTO_FINANCE_SV semantic view and runs it on the example warehouse.
export async function POST(request: Request) {
  const { question } = await request.json().catch(() => ({}));
  if (typeof question !== 'string' || !question.trim() || question.length > 500) return liveError('question is required (max 500 characters)', 400);
  if (!isSnowflakeConfigured()) return notConfigured();
  const t0 = Date.now();
  try {
    const reply = await runAgent(question);
    const answer: AskAnswer = { question, text: reply.text, sql: reply.sql, verifiedQueryUsed: reply.verifiedQueryUsed,
      result: reply.result, source: 'cortex-agent', latencyMs: Date.now() - t0 };
    return NextResponse.json(answer);
  } catch (e) { return liveError(e); }
}
