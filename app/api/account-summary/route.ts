import { NextResponse } from 'next/server';
import { COMPLETE_MODEL, executeQuery, isSnowflakeConfigured, liveError, notConfigured } from '@/lib/snowflake';
import { liveAccount } from '@/lib/live-queries';
import { accountFacts } from '@/lib/derive';

// Account summary for the collector with AI_COMPLETE. The facts come from the account's own rows;
// the prompt and model are bind variables, and the response uses structured output. It suggests,
// it does not decide: the collector chooses the action.
export async function POST(request: Request) {
  const { id } = await request.json().catch(() => ({}));
  if (!Number.isInteger(id) || id < 0) return liveError('id must be a contract number', 400);
  if (!isSnowflakeConfigured()) return notConfigured();
  const t0 = Date.now();
  try {
    const account = await liveAccount(id);
    if (!account) return liveError(`Contract ${id} is not in the collections queue`, 404);
    const prompt =
      'You are preparing a collector at an auto lender for an outbound call. Using only the facts below ' +
      '(synthetic data), write a headline of at most 12 words and exactly three short bullet points: the ' +
      'account situation, the main risk drivers named in the facts, and one suggested next step for the collector ' +
      'to consider (for example a promise-to-pay amount). Plain, respectful language. Do not invent numbers, ' +
      'reasons for hardship, or contact details.\n\nFacts:\n' + accountFacts(account).join('\n');
    const { rows } = await executeQuery<{ R: string }>(
      `SELECT AI_COMPLETE(model => ?, prompt => ?, model_parameters => {'temperature': 0, 'max_tokens': 500},
         response_format => TYPE OBJECT(headline STRING, bullets ARRAY(STRING))) AS R`, [COMPLETE_MODEL, prompt]);
    const parsed = typeof rows[0]?.R === 'string' ? JSON.parse(rows[0].R) : rows[0]?.R;
    if (!parsed?.headline) return liveError('AI_COMPLETE returned no summary.');
    return NextResponse.json({ headline: parsed.headline, bullets: parsed.bullets ?? [], model: COMPLETE_MODEL, latencyMs: Date.now() - t0, source: 'ai_complete' });
  } catch (e) { return liveError(e); }
}
