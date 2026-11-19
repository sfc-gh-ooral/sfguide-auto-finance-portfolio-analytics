import { NextResponse } from 'next/server';
import { isSnowflakeConfigured, liveError, notConfigured } from '@/lib/snowflake';
import { liveAccount } from '@/lib/live-queries';

export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id < 0) return liveError('id must be a contract number', 400);
  if (!isSnowflakeConfigured()) return notConfigured();
  try {
    const a = await liveAccount(id);
    return a ? NextResponse.json(a) : liveError(`Contract ${id} is not in the collections queue`, 404);
  } catch (e) { return liveError(e); }
}
