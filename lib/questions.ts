// Suggested questions on the Ask screen. Sample mode replays answers captured from a Live run of
// exactly these questions (data/captured/ask.json, written by scripts/capture-live.mjs).
export interface Question { id: string; question: string; persona: string; chart: 'line' | 'bar' | 'none'; verified: boolean }

export const SUGGESTED: Question[] = [
  { id: 'Q1', persona: 'Credit risk', question: 'What is the 30+ DPD rate by FICO band last month?', chart: 'bar', verified: true },
  { id: 'Q2', persona: 'Credit risk', question: 'Show the 30+ DPD rate by month for the 580-619 FICO band', chart: 'line', verified: true },
  { id: 'Q3', persona: 'Finance', question: 'What are total charge-offs by vintage quarter?', chart: 'bar', verified: true },
  { id: 'Q4', persona: 'Dealer sales', question: 'Which dealers have the highest first-payment default rate in 2026?', chart: 'bar', verified: true },
  { id: 'Q5', persona: 'Dealer sales', question: 'What is the monthly decline rate for Sunbelt Motors Group?', chart: 'line', verified: true },
  { id: 'Q6', persona: 'Operations', question: 'How does look-to-book compare on weekends versus weekdays?', chart: 'bar', verified: true },
  { id: 'Q7', persona: 'Finance', question: 'What is the average APR on funded contracts by loan term?', chart: 'bar', verified: false },
];
