import { Client } from './types';

export const mockClients: Client[] = [
  {
    id: 'client-001',
    name: 'Margaret Chen',
    aum: 2450000,
    riskProfile: 'Moderate',
    advisor: 'Sarah Mitchell',
    lastContact: '2024-11-15',
    goals: [
      {
        id: 'goal-001',
        name: 'Retirement at 62',
        targetAmount: 3000000,
        currentAmount: 2100000,
        targetDate: '2029-06-01',
      },
      {
        id: 'goal-002',
        name: 'College Fund (Emma)',
        targetAmount: 250000,
        currentAmount: 180000,
        targetDate: '2027-09-01',
      },
      {
        id: 'goal-003',
        name: 'Vacation Home Down Payment',
        targetAmount: 150000,
        currentAmount: 95000,
        targetDate: '2026-03-01',
      },
    ],
    accounts: [
      {
        id: 'acc-001',
        name: 'Traditional IRA',
        type: 'IRA',
        balance: 890000,
      },
      {
        id: 'acc-002',
        name: 'Joint Brokerage',
        type: 'Brokerage',
        balance: 1250000,
      },
      {
        id: 'acc-003',
        name: 'Roth IRA',
        type: 'Roth IRA',
        balance: 310000,
      },
    ],
  },
  {
    id: 'client-002',
    name: 'Robert & Diana Hartwell',
    aum: 4875000,
    riskProfile: 'Moderate-Aggressive',
    advisor: 'Sarah Mitchell',
    lastContact: '2024-11-28',
    goals: [
      {
        id: 'goal-004',
        name: 'Legacy Planning',
        targetAmount: 5000000,
        currentAmount: 4200000,
        targetDate: '2035-01-01',
      },
      {
        id: 'goal-005',
        name: 'Charitable Foundation',
        targetAmount: 1000000,
        currentAmount: 650000,
        targetDate: '2028-12-01',
      },
    ],
    accounts: [
      {
        id: 'acc-004',
        name: 'Hartwell Family Trust',
        type: 'Trust',
        balance: 2800000,
      },
      {
        id: 'acc-005',
        name: 'Robert 401(k)',
        type: '401k',
        balance: 1450000,
      },
      {
        id: 'acc-006',
        name: 'Joint Investment Account',
        type: 'Brokerage',
        balance: 625000,
      },
    ],
  },
];

export const sampleMeetingNotes: Record<string, string> = {
  'client-001': `Meeting with Margaret Chen - November 29, 2024

Margaret came in today to discuss her retirement timeline and college funding for Emma. Key points from our conversation:

"I've been thinking about maybe retiring a bit earlier, perhaps at 60 instead of 62. My husband James is already semi-retired and I'd love to spend more time traveling together."

We reviewed her current portfolio allocation. She mentioned being uncomfortable with the recent market volatility: "Those October swings really made me nervous. I'm wondering if we should be more conservative."

Discussed Emma's college plans - she's now looking at private universities on the East Coast. Margaret said: "We might need to increase our college savings target. Georgetown is her top choice and tuition keeps going up."

She also mentioned they're putting the vacation home on hold for now: "With the interest rates where they are, we've decided to wait another year or two on the beach house."

Action items discussed:
- Run new retirement projections for age 60
- Review risk tolerance questionnaire  
- Update college funding target to $300,000
- Consider tax-loss harvesting before year end

Next meeting scheduled for January 15, 2025.`,

  'client-002': `Quarterly Review with Robert & Diana Hartwell - November 28, 2024

Annual year-end planning session with the Hartwells. Both Robert (68) and Diana (65) attended via video call from their Scottsdale residence.

Robert opened with: "We're very pleased with portfolio performance this year. The tech allocation has done well."

Diana brought up their charitable giving plans: "We'd like to accelerate our donor-advised fund contributions. Can we discuss bunching our donations this year and next?"

Key discussion points:

1. Legacy planning update - They want to increase the amount going to their grandchildren: "We've decided to set up 529 plans for all four grandchildren. About $50,000 each to start."

2. RMD strategy - Robert turns 73 next year. "What's our plan for required minimum distributions? I'd prefer to minimize the tax hit."

3. Diana mentioned potential real estate sale: "We're considering selling the Boston property. It's been appreciating but the management hassle isn't worth it anymore."

Robert requested: "Can you run some scenarios on converting a portion of my 401k to Roth? I keep hearing about the benefits."

The Hartwells confirmed they're comfortable with current risk level: "We have a long time horizon for the trust assets, so we're fine staying aggressive there."

Follow-up items:
- Model Roth conversion scenarios ($200k-$500k tranches)
- DAF contribution strategy memo
- 529 plan setup for grandchildren
- Real estate sale tax implications analysis

Next review: Q1 2025`,
};

