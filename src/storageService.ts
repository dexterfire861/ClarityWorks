import { Interaction } from './types';

const INTERACTIONS_KEY = 'clarityworks_interactions';

// Get all interactions for a specific client
export function getClientInteractions(clientId: string): Interaction[] {
  const all = getAllInteractions();
  return all
    .filter(i => i.clientId === clientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Get all interactions
export function getAllInteractions(): Interaction[] {
  try {
    const data = localStorage.getItem(INTERACTIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Add a new interaction
export function addInteraction(interaction: Omit<Interaction, 'id' | 'createdAt'>): Interaction {
  const all = getAllInteractions();
  const newInteraction: Interaction = {
    ...interaction,
    id: `interaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  all.push(newInteraction);
  localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(all));
  return newInteraction;
}

// Update an existing interaction
export function updateInteraction(id: string, updates: Partial<Interaction>): Interaction | null {
  const all = getAllInteractions();
  const index = all.findIndex(i => i.id === id);
  if (index === -1) return null;
  
  all[index] = { ...all[index], ...updates };
  localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(all));
  return all[index];
}

// Delete an interaction
export function deleteInteraction(id: string): boolean {
  const all = getAllInteractions();
  const filtered = all.filter(i => i.id !== id);
  if (filtered.length === all.length) return false;
  
  localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(filtered));
  return true;
}

// Initialize with sample data if empty
export function initializeSampleInteractions(clientId: string): void {
  const existing = getClientInteractions(clientId);
  if (existing.length > 0) return;

  const sampleInteractions: Omit<Interaction, 'id' | 'createdAt'>[] = clientId === 'client-001' 
    ? [
        {
          clientId: 'client-001',
          date: '2024-11-15',
          type: 'meeting',
          title: 'Quarterly Portfolio Review',
          notes: `Met with Margaret to review Q3 performance. She expressed concerns about market volatility affecting her retirement timeline. Discussed her daughter Emma's college plans - now looking at Georgetown. Margaret mentioned possibly retiring at 60 instead of 62 since James is already semi-retired.`,
          actionItems: ['Run retirement projection for age 60', 'Research Georgetown tuition costs', 'Review risk allocation'],
        },
        {
          clientId: 'client-001',
          date: '2024-10-20',
          type: 'call',
          title: 'Market Volatility Check-in',
          notes: `Quick call after October market swings. Margaret was nervous about the drops. Reassured her about long-term strategy. She asked about moving some funds to more conservative positions. Agreed to discuss at next meeting.`,
          actionItems: ['Prepare conservative rebalancing options'],
        },
        {
          clientId: 'client-001',
          date: '2024-09-05',
          type: 'meeting',
          title: 'Annual Planning Session',
          notes: `Annual review with Margaret and James. Goals remain: retirement at 62, college fund for Emma, vacation home. Vacation home timeline pushed back due to interest rates. All accounts performing well. Discussed tax-loss harvesting opportunities.`,
          actionItems: ['Update financial plan document', 'Schedule tax planning call with accountant'],
        },
      ]
    : [
        {
          clientId: 'client-002',
          date: '2024-11-28',
          type: 'meeting',
          title: 'Year-End Planning Session',
          notes: `Met with Robert and Diana via video call from Scottsdale. Discussed charitable giving strategy - they want to accelerate DAF contributions and bunch donations. Robert turns 73 next year, need to plan for RMDs. They're considering selling the Boston property. Also want to set up 529 plans for all four grandchildren.`,
          actionItems: ['Model Roth conversion scenarios', 'Prepare DAF strategy memo', 'Initiate 529 setup', 'Analyze Boston property sale tax impact'],
        },
        {
          clientId: 'client-002',
          date: '2024-10-15',
          type: 'call',
          title: 'Trust Document Update',
          notes: `Diana called about updating trust beneficiaries. Want to add provisions for grandchildren. Referred to estate attorney for document updates. Also asked about increasing charitable foundation contributions.`,
          actionItems: ['Connect with estate attorney', 'Review foundation contribution limits'],
        },
        {
          clientId: 'client-002',
          date: '2024-08-22',
          type: 'meeting',
          title: 'Mid-Year Review',
          notes: `Strong first half performance. Tech allocation doing well. Robert happy with returns. Discussed legacy planning goals - on track. Diana mentioned grandchildren more frequently, hinting at future education planning.`,
          actionItems: ['Research 529 options for next meeting'],
        },
      ];

  sampleInteractions.forEach(interaction => addInteraction(interaction));
}

