import { useState, useEffect } from 'react';
import { generateMeetingPrep, MeetingPrep } from './openaiService';
import { getClientInteractions, addInteraction, deleteInteraction, initializeSampleInteractions } from './storageService';
import { getAllClients, addClient, deleteClient, isCustomClient, createGoal, createAccount } from './clientStorageService';
import { Client, Interaction, Goal, Account } from './types';
import { track } from './analytics';
import { DocumentClientOnboarding } from './DocumentClientOnboarding';

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};


function App() {
  // Client management state
  const [clients, setClients] = useState<Client[]>(() => getAllClients());
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    const allClients = getAllClients();
    return allClients.length > 0 ? allClients[0].id : '';
  });
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showDocOnboarding, setShowDocOnboarding] = useState(false);
  
  // New client form state
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    aum: '',
    riskProfile: 'Moderate' as Client['riskProfile'],
    advisor: 'Sarah Mitchell',
    goalsText: '', // JSON or line-by-line input
    accountsText: '', // JSON or line-by-line input
  });

  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [meetingPrep, setMeetingPrep] = useState<MeetingPrep | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New interaction form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInteraction, setNewInteraction] = useState({
    type: 'meeting' as 'meeting' | 'call' | 'email' | 'note',
    title: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    actionItems: '',
  });
  
  // View interaction modal state
  const [viewingInteraction, setViewingInteraction] = useState<Interaction | null>(null);

  const selectedClient: Client | undefined = clients.find(
    (c) => c.id === selectedClientId
  );

  // Load interactions when client changes
  useEffect(() => {
    initializeSampleInteractions(selectedClientId);
    const clientInteractions = getClientInteractions(selectedClientId);
    setInteractions(clientInteractions);
    setMeetingPrep(null);
    setError(null);
    setShowAddForm(false);
  }, [selectedClientId]);

  const handleGenerateMeetingPrep = async () => {
    if (!selectedClient) return;

    const startTime = Date.now();
    track('meeting_prep_started', { clientId: selectedClientId, clientName: selectedClient.name });
    
    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateMeetingPrep(
        selectedClient.name,
        selectedClient.aum,
        selectedClient.riskProfile,
        selectedClient.goals,
        selectedClient.accounts,
        interactions
      );
      setMeetingPrep(result);
      track('meeting_prep_success', { 
        clientId: selectedClientId, 
        clientName: selectedClient.name,
        duration: Date.now() - startTime 
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate meeting prep';
      setError(errorMessage);
      track('meeting_prep_failed', { 
        clientId: selectedClientId, 
        clientName: selectedClient.name,
        error: errorMessage,
        duration: Date.now() - startTime 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddInteraction = () => {
    if (!newInteraction.title || !newInteraction.notes) return;

    const actionItems = newInteraction.actionItems
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    addInteraction({
      clientId: selectedClientId,
      type: newInteraction.type,
      title: newInteraction.title,
      date: newInteraction.date,
      notes: newInteraction.notes,
      actionItems: actionItems.length > 0 ? actionItems : undefined,
    });

    track('interaction_added', { 
      clientId: selectedClientId, 
      interactionType: newInteraction.type,
      hasActionItems: actionItems.length > 0 
    });

    // Refresh interactions
    setInteractions(getClientInteractions(selectedClientId));
    
    // Reset form
    setNewInteraction({
      type: 'meeting',
      title: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      actionItems: '',
    });
    setShowAddForm(false);
    
    // Clear meeting prep since context changed
    setMeetingPrep(null);
  };

  const handleDeleteInteraction = (id: string) => {
    if (confirm('Delete this interaction?')) {
      deleteInteraction(id);
      setInteractions(getClientInteractions(selectedClientId));
      setMeetingPrep(null);
      track('interaction_deleted', { clientId: selectedClientId });
    }
  };

  const handleSavePrepAsInteraction = () => {
    if (!meetingPrep || !selectedClient) return;

    const notes = `CLIENT SNAPSHOT:
${meetingPrep.clientSnapshot}

RECENT CONTEXT:
${meetingPrep.recentContext}

TOPICS TO DISCUSS:
${meetingPrep.keyTopicsToDiscuss.map(t => `- ${t}`).join('\n')}

OPEN ACTION ITEMS:
${meetingPrep.openActionItems.length > 0 ? meetingPrep.openActionItems.map(a => `- ${a}`).join('\n') : '- None'}

QUESTIONS TO ASK:
${meetingPrep.questionsToAsk.map(q => `- ${q}`).join('\n')}

POTENTIAL CONCERNS:
${meetingPrep.potentialConcerns}

RELATIONSHIP NOTES:
${meetingPrep.relationshipNotes}`;

    addInteraction({
      clientId: selectedClientId,
      type: 'note',
      title: `AI Meeting Prep – ${new Date().toLocaleDateString()}`,
      date: new Date().toISOString().split('T')[0],
      notes,
      actionItems: meetingPrep.openActionItems.length > 0 ? meetingPrep.openActionItems : undefined,
    });

    setInteractions(getClientInteractions(selectedClientId));
    track('meeting_prep_saved_as_note', { clientId: selectedClientId, clientName: selectedClient.name });
  };

  const handleAddClient = () => {
    if (!newClientForm.name || !newClientForm.aum) {
      setError('Please enter client name and AUM');
      return;
    }

    // Parse goals from text (expects JSON array or simple format)
    let goals: Goal[] = [];
    if (newClientForm.goalsText.trim()) {
      try {
        // Try parsing as JSON first
        const parsed = JSON.parse(newClientForm.goalsText);
        if (Array.isArray(parsed)) {
          goals = parsed.map((g: { name: string; targetAmount: number; currentAmount: number; targetDate: string }) => 
            createGoal(g.name, g.targetAmount, g.currentAmount, g.targetDate)
          );
        }
      } catch {
        // Parse as simple line format: "Goal Name | target | current | date"
        const lines = newClientForm.goalsText.split('\n').filter(l => l.trim());
        goals = lines.map(line => {
          const parts = line.split('|').map(p => p.trim());
          return createGoal(
            parts[0] || 'Goal',
            parseFloat(parts[1]?.replace(/[^0-9.]/g, '') || '0'),
            parseFloat(parts[2]?.replace(/[^0-9.]/g, '') || '0'),
            parts[3] || new Date().toISOString().split('T')[0]
          );
        });
      }
    }

    // Parse accounts from text
    let accounts: Account[] = [];
    if (newClientForm.accountsText.trim()) {
      try {
        const parsed = JSON.parse(newClientForm.accountsText);
        if (Array.isArray(parsed)) {
          accounts = parsed.map((a: { name: string; type: Account['type']; balance: number }) => 
            createAccount(a.name, a.type, a.balance)
          );
        }
      } catch {
        // Parse as simple line format: "Account Name | type | balance"
        const lines = newClientForm.accountsText.split('\n').filter(l => l.trim());
        accounts = lines.map(line => {
          const parts = line.split('|').map(p => p.trim());
          const typeMap: Record<string, Account['type']> = {
            'ira': 'IRA',
            'traditional ira': 'IRA',
            'roth': 'Roth IRA',
            'roth ira': 'Roth IRA',
            '401k': '401k',
            '401(k)': '401k',
            'brokerage': 'Brokerage',
            'trust': 'Trust',
          };
          const rawType = (parts[1] || 'brokerage').toLowerCase();
          const type = typeMap[rawType] || 'Brokerage';
          return createAccount(
            parts[0] || 'Account',
            type,
            parseFloat(parts[2]?.replace(/[^0-9.]/g, '') || '0')
          );
        });
      }
    }

    const newClient = addClient({
      name: newClientForm.name,
      aum: parseFloat(newClientForm.aum.replace(/[^0-9.]/g, '') || '0'),
      riskProfile: newClientForm.riskProfile,
      advisor: newClientForm.advisor,
      lastContact: new Date().toISOString().split('T')[0],
      goals,
      accounts,
    });

    track('client_added', { 
      clientId: newClient.id, 
      clientName: newClient.name,
      goalsCount: goals.length,
      accountsCount: accounts.length 
    });

    // Refresh clients and select the new one
    setClients(getAllClients());
    setSelectedClientId(newClient.id);
    setShowAddClientModal(false);
    
    // Reset form
    setNewClientForm({
      name: '',
      aum: '',
      riskProfile: 'Moderate',
      advisor: 'Sarah Mitchell',
      goalsText: '',
      accountsText: '',
    });
  };

  const handleDeleteClient = (clientId: string) => {
    if (!isCustomClient(clientId)) {
      setError('Cannot delete sample clients');
      return;
    }
    if (confirm('Delete this client and all their interactions?')) {
      deleteClient(clientId);
      track('client_deleted', { clientId });
      const updatedClients = getAllClients();
      setClients(updatedClients);
      if (selectedClientId === clientId && updatedClients.length > 0) {
        setSelectedClientId(updatedClients[0].id);
      }
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'call':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
      case 'email':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-8 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-semibold text-black tracking-tight">
                ClarityWorks
              </h1>
              <p className="mt-1 text-gray-500 font-body text-sm">
                Meeting Prep & Client Intelligence
              </p>
            </div>
            <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-gray-500 text-sm">Advisor:</span>
              <span className="ml-2 text-black font-medium">Sarah Mitchell</span>
            </div>
          </div>
        </header>

        {/* Client Selector & Info */}
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-gray-600 text-sm font-medium mb-2">
                Select Client
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    const newClientId = e.target.value;
                    const client = clients.find(c => c.id === newClientId);
                    setSelectedClientId(newClientId);
                    track('client_selected', { clientId: newClientId, clientName: client?.name });
                  }}
                  className="flex-1 max-w-md px-4 py-3 bg-white border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                >
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} — {formatCurrency(client.aum)} AUM {isCustomClient(client.id) ? '(Custom)' : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setShowAddClientModal(true);
                    track('add_client_modal_opened', {});
                  }}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  title="Add new client"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Add Client</span>
                </button>
                <button
                  onClick={() => {
                    setShowDocOnboarding(true);
                    track('doc_onboarding_opened', {});
                  }}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  title="Add client from documents"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden lg:inline">From Docs</span>
                </button>
                {selectedClient && isCustomClient(selectedClient.id) && (
                  <button
                    onClick={() => handleDeleteClient(selectedClient.id)}
                    className="px-3 py-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete client"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={handleGenerateMeetingPrep}
              disabled={isGenerating}
              className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Meeting Prep
                </>
              )}
            </button>
          </div>

          {/* Client Quick Stats */}
          {selectedClient && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-gray-500 text-xs uppercase tracking-wider">AUM</p>
                <p className="text-black font-semibold text-lg">{formatCurrency(selectedClient.aum)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-gray-500 text-xs uppercase tracking-wider">Risk</p>
                <p className="text-black font-semibold text-lg">{selectedClient.riskProfile}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-gray-500 text-xs uppercase tracking-wider">Goals</p>
                <p className="text-black font-semibold text-lg">{selectedClient.goals.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-gray-500 text-xs uppercase tracking-wider">Accounts</p>
                <p className="text-black font-semibold text-lg">{selectedClient.accounts.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-gray-500 text-xs uppercase tracking-wider">Interactions</p>
                <p className="text-black font-semibold text-lg">{interactions.length}</p>
              </div>
            </div>
          )}
        </div>

        {/* Portfolio Overview Section */}
        {selectedClient && (
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Goals */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-black font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Financial Goals
              </h3>
              <div className="space-y-4">
                {selectedClient.goals.map((goal) => {
                  const progress = (goal.currentAmount / goal.targetAmount) * 100;
                  return (
                    <div key={goal.id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-black font-medium text-sm">{goal.name}</span>
                        <span className="text-gray-500 text-xs">{formatDate(goal.targetDate)}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-1">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-black rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-gray-600 text-xs font-mono w-10 text-right">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs">
                        {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Account Holdings */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-black font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Account Holdings
              </h3>
              <div className="space-y-3">
                {selectedClient.accounts.map((account) => {
                  const percentage = (account.balance / selectedClient.aum) * 100;
                  return (
                    <div key={account.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-black font-medium text-sm">{account.name}</p>
                          <p className="text-gray-500 text-xs">{account.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-black font-mono text-sm font-medium">
                            {formatCurrency(account.balance)}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {percentage.toFixed(1)}% of AUM
                          </p>
                        </div>
                      </div>
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-400 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Interaction History */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-black flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Interaction History
                </h2>
                <button
                  onClick={() => {
                    const opening = !showAddForm;
                    setShowAddForm(opening);
                    if (opening) track('add_interaction_form_opened', { clientId: selectedClientId });
                  }}
                  className="text-sm px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  + Add New
                </button>
              </div>

              {/* Add Interaction Form */}
              {showAddForm && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fade-in">
                  <h3 className="font-medium text-black mb-3">New Interaction</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newInteraction.type}
                        onChange={(e) => setNewInteraction({ ...newInteraction, type: e.target.value as 'meeting' | 'call' | 'email' | 'note' })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black"
                      >
                        <option value="meeting">Meeting</option>
                        <option value="call">Call</option>
                        <option value="email">Email</option>
                        <option value="note">Note</option>
                      </select>
                      <input
                        type="date"
                        value={newInteraction.date}
                        onChange={(e) => setNewInteraction({ ...newInteraction, date: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Title (e.g., Quarterly Review)"
                      value={newInteraction.title}
                      onChange={(e) => setNewInteraction({ ...newInteraction, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black"
                    />
                    <textarea
                      placeholder="Notes from the interaction..."
                      value={newInteraction.notes}
                      onChange={(e) => setNewInteraction({ ...newInteraction, notes: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black resize-none"
                    />
                    <textarea
                      placeholder="Action items (one per line)"
                      value={newInteraction.actionItems}
                      onChange={(e) => setNewInteraction({ ...newInteraction, actionItems: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddInteraction}
                        className="flex-1 px-3 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Interaction List */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {interactions.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No interactions yet</p>
                ) : (
                  interactions.map((interaction) => (
                    <div
                      key={interaction.id}
                      onClick={() => {
                        setViewingInteraction(interaction);
                        track('interaction_viewed', { clientId: selectedClientId, interactionType: interaction.type });
                      }}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-100 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">{getTypeIcon(interaction.type)}</span>
                          <span className="font-medium text-black text-sm">{interaction.title}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteInteraction(interaction.id);
                          }}
                          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-gray-500 text-xs mb-2">{formatDate(interaction.date)}</p>
                      <p className="text-gray-700 text-sm line-clamp-3">{interaction.notes}</p>
                      {interaction.actionItems && interaction.actionItems.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Action Items:</p>
                          <ul className="text-xs text-gray-600">
                            {interaction.actionItems.slice(0, 2).map((item, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-gray-400">•</span>
                                <span className="line-clamp-1">{item}</span>
                              </li>
                            ))}
                            {interaction.actionItems.length > 2 && (
                              <li className="text-gray-400 text-xs">+{interaction.actionItems.length - 2} more...</li>
                            )}
                          </ul>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">Click to view full details</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Meeting Prep */}
          <div className="lg:col-span-2">
            {meetingPrep ? (
              <div className="space-y-4 animate-fade-in">
                {/* Client Snapshot */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="font-semibold text-black mb-3 flex items-center gap-2">
                    <span className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center text-xs">1</span>
                    Client Snapshot
                  </h2>
                  <p className="text-gray-700 leading-relaxed">{meetingPrep.clientSnapshot}</p>
                </div>

                {/* Recent Context */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="font-semibold text-black mb-3 flex items-center gap-2">
                    <span className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center text-xs">2</span>
                    Recent Context
                  </h2>
                  <p className="text-gray-700 leading-relaxed">{meetingPrep.recentContext}</p>
                </div>

                {/* Key Topics & Action Items Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Key Topics */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="font-semibold text-black mb-3 flex items-center gap-2">
                      <span className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center text-xs">3</span>
                      Topics to Discuss
                    </h2>
                    <ul className="space-y-2">
                      {meetingPrep.keyTopicsToDiscuss.map((topic, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-700 text-sm">
                          <span className="flex-shrink-0 w-5 h-5 bg-gray-100 text-gray-600 rounded flex items-center justify-center text-xs font-medium">
                            {idx + 1}
                          </span>
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Open Action Items */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="font-semibold text-black mb-3 flex items-center gap-2">
                      <span className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center text-xs">4</span>
                      Open Action Items
                    </h2>
                    {meetingPrep.openActionItems.length > 0 ? (
                      <ul className="space-y-2">
                        {meetingPrep.openActionItems.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-700 text-sm">
                            <span className="flex-shrink-0 mt-0.5">
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            </span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-sm">No pending action items</p>
                    )}
                  </div>
                </div>

                {/* Questions to Ask */}
                <div className="bg-black text-white rounded-xl p-6">
                  <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Questions to Ask
                  </h2>
                  <div className="space-y-3">
                    {meetingPrep.questionsToAsk.map((question, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-white/10 rounded-lg p-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs font-semibold">
                          {idx + 1}
                        </span>
                        <p className="text-white/90 text-sm">{question}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Concerns & Relationship Notes Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Potential Concerns */}
                  <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
                    <h2 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Potential Concerns
                    </h2>
                    <p className="text-amber-900 text-sm leading-relaxed">{meetingPrep.potentialConcerns}</p>
                  </div>

                  {/* Relationship Notes */}
                  <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                    <h2 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      Relationship Notes
                    </h2>
                    <p className="text-blue-900 text-sm leading-relaxed">{meetingPrep.relationshipNotes}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      track('meeting_prep_regenerated', { clientId: selectedClientId });
                      handleGenerateMeetingPrep();
                    }}
                    disabled={isGenerating}
                    className="px-4 py-2 text-gray-600 hover:text-black border border-gray-300 hover:border-black rounded-lg text-sm transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate
                  </button>
                  <button
                    onClick={handleSavePrepAsInteraction}
                    className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save to Interaction History
                  </button>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h3 className="text-black font-display text-xl font-semibold mb-2">
                  Ready for Meeting Prep
                </h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  Click "Generate Meeting Prep" to create an AI-powered briefing based on {selectedClient?.name}'s interaction history.
                </p>
                <div className="text-sm text-gray-400">
                  {interactions.length} interaction{interactions.length !== 1 ? 's' : ''} available for context
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowAddClientModal(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-black text-lg">Add New Client</h2>
              <button
                onClick={() => setShowAddClientModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="px-6 py-4 overflow-y-auto max-h-[70vh] space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                  <input
                    type="text"
                    value={newClientForm.name}
                    onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                    placeholder="e.g., John & Jane Smith"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AUM *</label>
                  <input
                    type="text"
                    value={newClientForm.aum}
                    onChange={(e) => setNewClientForm({ ...newClientForm, aum: e.target.value })}
                    placeholder="e.g., 2500000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Risk Profile</label>
                  <select
                    value={newClientForm.riskProfile}
                    onChange={(e) => setNewClientForm({ ...newClientForm, riskProfile: e.target.value as Client['riskProfile'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                  >
                    <option value="Conservative">Conservative</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Moderate-Aggressive">Moderate-Aggressive</option>
                    <option value="Aggressive">Aggressive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Advisor</label>
                  <input
                    type="text"
                    value={newClientForm.advisor}
                    onChange={(e) => setNewClientForm({ ...newClientForm, advisor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Goals */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Financial Goals
                  <span className="text-gray-400 font-normal ml-2">(one per line: Name | Target | Current | Date)</span>
                </label>
                <textarea
                  value={newClientForm.goalsText}
                  onChange={(e) => setNewClientForm({ ...newClientForm, goalsText: e.target.value })}
                  placeholder={`Retirement | 3000000 | 2100000 | 2030-01-01\nCollege Fund | 250000 | 150000 | 2028-09-01\n\nOr paste JSON array from ChatGPT`}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black text-sm font-mono"
                />
              </div>

              {/* Accounts */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Accounts
                  <span className="text-gray-400 font-normal ml-2">(one per line: Name | Type | Balance)</span>
                </label>
                <textarea
                  value={newClientForm.accountsText}
                  onChange={(e) => setNewClientForm({ ...newClientForm, accountsText: e.target.value })}
                  placeholder={`Traditional IRA | IRA | 890000\nJoint Brokerage | Brokerage | 1250000\nRoth IRA | Roth IRA | 310000\n\nTypes: IRA, Roth IRA, 401k, Brokerage, Trust`}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black text-sm font-mono"
                />
              </div>

              {/* JSON Helper */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <p className="font-medium text-gray-700 mb-2">💡 Tip: Ask ChatGPT to generate data</p>
                <p className="text-gray-600">
                  You can paste JSON arrays directly. Ask ChatGPT: "Generate sample financial goals and accounts for a client with $X AUM in JSON format"
                </p>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddClientModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClient}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
              >
                Add Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interaction Detail Modal */}
      {viewingInteraction && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setViewingInteraction(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gray-500">{getTypeIcon(viewingInteraction.type)}</span>
                  <h2 className="font-semibold text-black text-lg">{viewingInteraction.title}</h2>
                </div>
                <p className="text-gray-500 text-sm">{formatDate(viewingInteraction.date)}</p>
              </div>
              <button
                onClick={() => setViewingInteraction(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              <div className="mb-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{viewingInteraction.notes}</p>
              </div>
              
              {viewingInteraction.actionItems && viewingInteraction.actionItems.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Action Items</h3>
                  <ul className="space-y-2">
                    {viewingInteraction.actionItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="flex-shrink-0 w-5 h-5 bg-gray-100 text-gray-600 rounded flex items-center justify-center text-xs font-medium">
                          {idx + 1}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  handleDeleteInteraction(viewingInteraction.id);
                  setViewingInteraction(null);
                }}
                className="px-4 py-2 text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setViewingInteraction(null)}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Client Onboarding Modal */}
      <DocumentClientOnboarding
        isOpen={showDocOnboarding}
        onClose={() => setShowDocOnboarding(false)}
        onClientCreated={(client) => {
          // Add to client storage and refresh list
          addClient(client);
          setClients(getAllClients());
          setSelectedClientId(client.id);
          track('client_added_from_docs', { clientId: client.id, clientName: client.name });
        }}
      />
    </div>
  );
}

export default App;
