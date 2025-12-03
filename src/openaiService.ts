import { Interaction } from './types';

export interface MeetingPrep {
  clientSnapshot: string;
  recentContext: string;
  keyTopicsToDiscuss: string[];
  openActionItems: string[];
  questionsToAsk: string[];
  potentialConcerns: string;
  relationshipNotes: string;
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function generateMeetingPrep(
  clientName: string,
  aum: number,
  riskProfile: string,
  goals: { name: string; targetAmount: number; currentAmount: number; targetDate: string }[],
  accounts: { name: string; type: string; balance: number }[],
  interactions: Interaction[],
): Promise<MeetingPrep> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OpenAI API key. Set VITE_OPENAI_API_KEY in your .env file.');
  }
  const goalsText = goals
    .map(g => {
      const progress = ((g.currentAmount / g.targetAmount) * 100).toFixed(0);
      return `- ${g.name}: ${progress}% complete ($${g.currentAmount.toLocaleString()} / $${g.targetAmount.toLocaleString()}, target: ${g.targetDate})`;
    })
    .join('\n');
  
  const accountsText = accounts
    .map(a => `- ${a.name} (${a.type}): $${a.balance.toLocaleString()}`)
    .join('\n');

  const interactionsText = interactions.length > 0
    ? interactions.map(i => `
[${i.date}] ${i.type.toUpperCase()}: ${i.title}
Notes: ${i.notes}
${i.actionItems?.length ? `Action Items: ${i.actionItems.join(', ')}` : ''}
`).join('\n---\n')
    : 'No previous interactions recorded.';

  const prompt = `You are a financial advisor assistant preparing a quick-reference meeting prep for an upcoming client meeting.

CLIENT PROFILE:
Name: ${clientName}
Assets Under Management: $${aum.toLocaleString()}
Risk Profile: ${riskProfile}

FINANCIAL GOALS:
${goalsText}

ACCOUNTS:
${accountsText}

INTERACTION HISTORY (most recent first):
${interactionsText}

Based on this information, create a meeting prep guide. Return a JSON object with:
{
  "clientSnapshot": "2-3 sentence quick overview of who this client is, their situation, and relationship tenure",
  "recentContext": "What happened in recent interactions? What's top of mind for this client right now?",
  "keyTopicsToDiscuss": ["Array of 4-5 specific topics/agenda items for this meeting based on history"],
  "openActionItems": ["Array of any pending action items from previous meetings that should be addressed"],
  "questionsToAsk": ["Array of 3-4 thoughtful questions to ask the client to deepen the relationship"],
  "potentialConcerns": "Any concerns or sensitive topics to be aware of based on past interactions",
  "relationshipNotes": "Personal details, family info, preferences mentioned that help personalize the conversation"
}

Be specific and actionable. Reference actual details from the interaction history.`;

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful financial advisor assistant that creates concise, actionable meeting prep guides. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from OpenAI');
  }

  try {
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    
    const parsed = JSON.parse(jsonContent);
    
    const ensureString = (value: unknown): string => {
      if (typeof value === 'string') return value;
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);
    };
    
    const ensureStringArray = (value: unknown): string[] => {
      if (!value) return [];
      if (Array.isArray(value)) return value.map(v => ensureString(v));
      return [ensureString(value)];
    };
    
    return {
      clientSnapshot: ensureString(parsed.clientSnapshot),
      recentContext: ensureString(parsed.recentContext),
      keyTopicsToDiscuss: ensureStringArray(parsed.keyTopicsToDiscuss),
      openActionItems: ensureStringArray(parsed.openActionItems),
      questionsToAsk: ensureStringArray(parsed.questionsToAsk),
      potentialConcerns: ensureString(parsed.potentialConcerns),
      relationshipNotes: ensureString(parsed.relationshipNotes),
    };
  } catch (e) {
    console.error('Failed to parse:', content);
    throw new Error('Failed to parse AI response. Please try again.');
  }
}
