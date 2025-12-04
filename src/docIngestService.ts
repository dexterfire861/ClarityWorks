import { Client, Goal, Account } from './types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function parseClientFromDocuments(docs: string[]): Promise<Client> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OpenAI API key. Set VITE_OPENAI_API_KEY in your .env file.');
  }

  const joinedDocs = docs.join('\n\n----\n\n');

  const systemPrompt = `You are a financial document parser. Extract client information from the provided documents and respond ONLY with valid JSON matching this exact schema:

{
  "id": "string (generate a unique ID like 'client-doc-' followed by timestamp)",
  "name": "string (client's full name or household name)",
  "aum": number (total assets under management in dollars),
  "riskProfile": "Conservative" | "Moderate" | "Moderate-Aggressive" | "Aggressive",
  "advisor": "string (advisor name if mentioned, otherwise 'Unassigned')",
  "lastContact": "string (ISO date, use today's date if not mentioned)",
  "goals": [
    {
      "id": "string (unique goal ID)",
      "name": "string (goal name like 'Retirement', 'College Fund', etc.)",
      "targetAmount": number,
      "currentAmount": number,
      "targetDate": "string (ISO date format YYYY-MM-DD)"
    }
  ],
  "accounts": [
    {
      "id": "string (unique account ID)",
      "name": "string (account name)",
      "type": "IRA" | "Brokerage" | "401k" | "Roth IRA" | "Trust",
      "balance": number
    }
  ]
}

Extract as much information as possible from the documents. If a field is not explicitly mentioned:
- For goals: infer reasonable targets based on context
- For accounts: create entries for any mentioned accounts/holdings
- For riskProfile: infer from investment preferences or age mentioned
- Generate unique IDs with format 'goal-doc-X' or 'acc-doc-X'

Respond ONLY with the JSON object, no additional text or markdown.`;

  const userPrompt = `Parse the following financial documents and extract client information:

${joinedDocs}

Return a single JSON object matching the Client schema.`;

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
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
    const parsed = JSON.parse(content);
    
    // Validate and coerce the parsed data into a proper Client object
    const client: Client = {
      id: parsed.id || `client-doc-${Date.now()}`,
      name: parsed.name || 'Unknown Client',
      aum: typeof parsed.aum === 'number' ? parsed.aum : parseFloat(parsed.aum) || 0,
      riskProfile: validateRiskProfile(parsed.riskProfile),
      advisor: parsed.advisor || 'Unassigned',
      lastContact: parsed.lastContact || new Date().toISOString().split('T')[0],
      goals: validateGoals(parsed.goals),
      accounts: validateAccounts(parsed.accounts),
    };

    return client;
  } catch (e) {
    console.error('Failed to parse response:', content);
    throw new Error('Failed to parse client data from documents. Please try again.');
  }
}

function validateRiskProfile(profile: string): Client['riskProfile'] {
  const validProfiles: Client['riskProfile'][] = ['Conservative', 'Moderate', 'Moderate-Aggressive', 'Aggressive'];
  if (validProfiles.includes(profile as Client['riskProfile'])) {
    return profile as Client['riskProfile'];
  }
  return 'Moderate';
}

function validateGoals(goals: unknown[]): Goal[] {
  if (!Array.isArray(goals)) return [];
  
  return goals.map((g, idx) => {
    const goal = g as Record<string, unknown>;
    return {
      id: (goal.id as string) || `goal-doc-${idx}-${Date.now()}`,
      name: (goal.name as string) || 'Unnamed Goal',
      targetAmount: typeof goal.targetAmount === 'number' ? goal.targetAmount : parseFloat(goal.targetAmount as string) || 0,
      currentAmount: typeof goal.currentAmount === 'number' ? goal.currentAmount : parseFloat(goal.currentAmount as string) || 0,
      targetDate: (goal.targetDate as string) || new Date().toISOString().split('T')[0],
    };
  });
}

function validateAccounts(accounts: unknown[]): Account[] {
  if (!Array.isArray(accounts)) return [];
  
  const validTypes: Account['type'][] = ['IRA', 'Brokerage', '401k', 'Roth IRA', 'Trust'];
  
  return accounts.map((a, idx) => {
    const account = a as Record<string, unknown>;
    const type = account.type as string;
    return {
      id: (account.id as string) || `acc-doc-${idx}-${Date.now()}`,
      name: (account.name as string) || 'Unnamed Account',
      type: validTypes.includes(type as Account['type']) ? (type as Account['type']) : 'Brokerage',
      balance: typeof account.balance === 'number' ? account.balance : parseFloat(account.balance as string) || 0,
    };
  });
}

