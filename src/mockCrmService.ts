import { CRMUpdateResult, FieldUpdate, Task } from './types';

// Simulated AI extraction delay
const MOCK_DELAY = 1500;

// Mock CRM update generation based on client ID
const mockCrmResults: Record<string, CRMUpdateResult> = {
  'client-001': {
    fieldUpdates: [
      {
        id: 'fu-001',
        fieldName: 'Target Retirement Age',
        currentValue: '62',
        proposedValue: '60',
        confidence: 0.92,
        sourceSnippet: '"I\'ve been thinking about maybe retiring a bit earlier, perhaps at 60 instead of 62."',
      },
      {
        id: 'fu-002',
        fieldName: 'Risk Tolerance',
        currentValue: 'Moderate',
        proposedValue: 'Moderate-Conservative',
        confidence: 0.78,
        sourceSnippet: '"Those October swings really made me nervous. I\'m wondering if we should be more conservative."',
      },
      {
        id: 'fu-003',
        fieldName: 'College Fund Target',
        currentValue: '$250,000',
        proposedValue: '$300,000',
        confidence: 0.95,
        sourceSnippet: '"We might need to increase our college savings target. Georgetown is her top choice."',
      },
      {
        id: 'fu-004',
        fieldName: 'Vacation Home Goal Status',
        currentValue: 'Active',
        proposedValue: 'On Hold',
        confidence: 0.88,
        sourceSnippet: '"With the interest rates where they are, we\'ve decided to wait another year or two on the beach house."',
      },
    ],
    tasks: [
      {
        id: 'task-001',
        owner: 'Sarah Mitchell',
        description: 'Run retirement projections for age 60 scenario',
        dueDate: '2024-12-10',
        priority: 'high',
      },
      {
        id: 'task-002',
        owner: 'Sarah Mitchell',
        description: 'Send updated risk tolerance questionnaire to Margaret',
        dueDate: '2024-12-05',
        priority: 'medium',
      },
      {
        id: 'task-003',
        owner: 'Tax Team',
        description: 'Review tax-loss harvesting opportunities before year-end',
        dueDate: '2024-12-15',
        priority: 'high',
      },
    ],
    auditLog: {
      summary: 'Client expressed interest in earlier retirement (60 vs 62), increased college funding needs, and temporary pause on vacation home goal. Risk tolerance may need adjustment following market volatility concerns.',
      tags: ['retirement-planning', 'risk-review', 'education-funding', 'goal-change'],
      timestamp: new Date().toISOString(),
    },
  },
  'client-002': {
    fieldUpdates: [
      {
        id: 'fu-005',
        fieldName: 'Charitable Giving Strategy',
        currentValue: 'Standard annual',
        proposedValue: 'DAF bunching strategy',
        confidence: 0.94,
        sourceSnippet: '"We\'d like to accelerate our donor-advised fund contributions. Can we discuss bunching our donations?"',
      },
      {
        id: 'fu-006',
        fieldName: 'Grandchildren 529 Plans',
        currentValue: 'None',
        proposedValue: '4 plans @ $50,000 each',
        confidence: 0.97,
        sourceSnippet: '"We\'ve decided to set up 529 plans for all four grandchildren. About $50,000 each to start."',
      },
      {
        id: 'fu-007',
        fieldName: 'RMD Planning Status',
        currentValue: 'Not started',
        proposedValue: 'Planning required (Robert turns 73 in 2025)',
        confidence: 0.91,
        sourceSnippet: '"What\'s our plan for required minimum distributions? I\'d prefer to minimize the tax hit."',
      },
      {
        id: 'fu-008',
        fieldName: 'Boston Property Status',
        currentValue: 'Hold',
        proposedValue: 'Considering sale',
        confidence: 0.85,
        sourceSnippet: '"We\'re considering selling the Boston property. The management hassle isn\'t worth it anymore."',
      },
      {
        id: 'fu-009',
        fieldName: 'Roth Conversion Interest',
        currentValue: 'No',
        proposedValue: 'Yes - modeling $200k-$500k tranches',
        confidence: 0.89,
        sourceSnippet: '"Can you run some scenarios on converting a portion of my 401k to Roth?"',
      },
    ],
    tasks: [
      {
        id: 'task-004',
        owner: 'Sarah Mitchell',
        description: 'Model Roth conversion scenarios ($200k, $350k, $500k tranches)',
        dueDate: '2024-12-12',
        priority: 'high',
      },
      {
        id: 'task-005',
        owner: 'Sarah Mitchell',
        description: 'Prepare DAF contribution strategy memo',
        dueDate: '2024-12-08',
        priority: 'high',
      },
      {
        id: 'task-006',
        owner: 'Operations',
        description: 'Initiate 529 plan setup for 4 grandchildren',
        dueDate: '2024-12-20',
        priority: 'medium',
      },
      {
        id: 'task-007',
        owner: 'Tax Team',
        description: 'Analyze tax implications of Boston property sale',
        dueDate: '2024-12-18',
        priority: 'medium',
      },
    ],
    auditLog: {
      summary: 'Year-end planning session covered charitable giving acceleration via DAF, new 529 plans for grandchildren ($200k total), upcoming RMD requirements, potential real estate disposition, and Roth conversion interest. Clients comfortable with current risk allocation.',
      tags: ['charitable-giving', 'education-funding', 'rmd-planning', 'roth-conversion', 'real-estate', 'year-end-planning'],
      timestamp: new Date().toISOString(),
    },
  },
};

export async function generateCRMUpdate(clientId: string, _meetingNotes: string): Promise<CRMUpdateResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
  
  // Return mock data for the client
  const result = mockCrmResults[clientId];
  
  if (!result) {
    // Return empty result for unknown clients
    return {
      fieldUpdates: [],
      tasks: [],
      auditLog: {
        summary: 'No updates extracted from meeting notes.',
        tags: [],
        timestamp: new Date().toISOString(),
      },
    };
  }
  
  // Update timestamp to current time
  return {
    ...result,
    auditLog: {
      ...result.auditLog,
      timestamp: new Date().toISOString(),
    },
  };
}

