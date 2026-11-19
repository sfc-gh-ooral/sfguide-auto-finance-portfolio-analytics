import { NextResponse } from 'next/server';
import { isSnowflakeConfigured, liveError, notConfigured } from '@/lib/snowflake';
import { liveAggregates } from '@/lib/live-queries';

export async function GET() {
  if (!isSnowflakeConfigured()) return notConfigured();
  try { return NextResponse.json(await liveAggregates()); } catch (e) { return liveError(e); }
}
