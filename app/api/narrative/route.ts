import { NextResponse } from 'next/server';
import { COMPLETE_MODEL, executeQuery, isSnowflakeConfigured, liveError, notConfigured } from '@/lib/snowflake';
import { liveDealer } from '@/lib/live-queries';
import { dealerFacts } from '@/lib/derive';

// Dealer narrative with AI_COMPLETE. The facts are computed from the dealer's rows; the prompt and
// model are bind variables, and the response uses structured output.
export async function POST(request: Request) {
  const { id } = await request.json().catch(() => ({}));
  if (!Number.isInteger(id) || id < 1) return liveError('id must be a dealer number', 400);
  if (!isSnowflakeConfigured()) return notConfigured();
  const t0 = Date.now();
  try {
    const [dealer, book] = await Promise.all([liveDealer(id),
      executeQuery<{ R: number }>('SELECT COUNT_IF(IS_FIRST_PAYMENT_DEFAULT) / COUNT(*) AS R FROM CONTRACTS WHERE MONTH_INDEX BETWEEN 14 AND 22')]);
    if (!dealer) return liveError(`Dealer ${id} not found`, 404);
    const prompt =
      'You are briefing a dealer relationship manager at an auto lender. Using only the facts below ' +
      '(synthetic data), write a headline of at most 12 words and exactly three short bullet points: what changed, ' +
      'the most likely driver shown in the facts, and one practical next step for the relationship manager. ' +
      'Do not invent numbers, causes, or people not given.\n\nFacts:\n' + dealerFacts(dealer, Number(book.rows[0]?.R)).join('\n');
    const { rows } = await executeQuery<{ R: string }>(
      `SELECT AI_COMPLETE(model => ?, prompt => ?, model_parameters => {'temperature': 0, 'max_tokens': 600},
         response_format => TYPE OBJECT(headline STRING, bullets ARRAY(STRING))) AS R`, [COMPLETE_MODEL, prompt]);
    const parsed = typeof rows[0]?.R === 'string' ? JSON.parse(rows[0].R) : rows[0]?.R;
    if (!parsed?.headline) return liveError('AI_COMPLETE returned no narrative.');
    return NextResponse.json({ headline: parsed.headline, bullets: parsed.bullets ?? [], model: COMPLETE_MODEL, latencyMs: Date.now() - t0, source: 'ai_complete' });
  } catch (e) { return liveError(e); }
}
