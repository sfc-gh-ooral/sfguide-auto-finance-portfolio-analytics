import { NextResponse } from 'next/server';
import { isSnowflakeConfigured, liveError, notConfigured } from '@/lib/snowflake';
import { liveDealer } from '@/lib/live-queries';

export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id < 1) return liveError('id must be a dealer number', 400);
  if (!isSnowflakeConfigured()) return notConfigured();
  try {
    const dealer = await liveDealer(id);
    return dealer ? NextResponse.json(dealer) : liveError(`Dealer ${id} not found`, 404);
  } catch (e) { return liveError(e); }
}
