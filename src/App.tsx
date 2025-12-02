import { useState, useEffect } from 'react';
import { mockClients, sampleMeetingNotes } from './mockClients';
import { generateCRMUpdate } from './mockCrmService';
import {
  Client,
  CRMUpdateResult,
  FieldUpdate,
  Task,
  TimelineEntry,
} from './types';

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

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.9) return 'text-black bg-gray-100';
  if (confidence >= 0.75) return 'text-gray-700 bg-gray-100';
  return 'text-gray-500 bg-gray-100';
};

const getPriorityStyles = (priority: string): string => {
  switch (priority) {
    case 'high':
      return 'bg-black text-white border-black';
    case 'medium':
      return 'bg-gray-200 text-gray-800 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

function App() {
  const [selectedClientId, setSelectedClientId] = useState<string>(mockClients[0].id);
  const [meetingNotes, setMeetingNotes] = useState<string>('');
  const [crmResult, setCrmResult] = useState<CRMUpdateResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  const selectedClient: Client | undefined = mockClients.find(
    (c) => c.id === selectedClientId
  );

  // Load sample meeting notes when client changes
  useEffect(() => {
    setMeetingNotes(sampleMeetingNotes[selectedClientId] || '');
    setCrmResult(null);
  }, [selectedClientId]);

  const handleGenerateCRM = async () => {
    if (!selectedClient || !meetingNotes.trim()) return;

    setIsGenerating(true);
    try {
      const result = await generateCRMUpdate(selectedClientId, meetingNotes);
      setCrmResult(result);
    } catch (error) {
      console.error('Failed to generate CRM update:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePushToCRM = async () => {
    if (!crmResult || !selectedClient) return;

    setIsPushing(true);
    
    // Simulate push delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const newEntry: TimelineEntry = {
      id: `timeline-${Date.now()}`,
      date: new Date().toISOString(),
      title: `CRM Updated for ${selectedClient.name}`,
      summary: `${crmResult.fieldUpdates.length} field updates, ${crmResult.tasks.length} tasks created. ${crmResult.auditLog.summary.substring(0, 100)}...`,
      type: 'crm_update',
    };

    setTimeline((prev) => [newEntry, ...prev]);
    setCrmResult(null);
    setIsPushing(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-10 animate-fade-in border-b border-gray-200 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-4xl font-semibold text-black tracking-tight">
                ClarityWorks
              </h1>
              <p className="mt-1 text-gray-500 font-body">
                AI-Powered Meeting Intelligence for Financial Advisors
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-gray-500 text-sm">Advisor:</span>
                <span className="ml-2 text-black font-medium">Sarah Mitchell</span>
              </div>
            </div>
          </div>
        </header>

        {/* Client Selector */}
        <div className="mb-8 animate-fade-in delay-75">
          <label className="block text-gray-600 text-sm font-medium mb-2">
            Select Client
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full max-w-md px-4 py-3 bg-white border border-gray-300 rounded-lg text-black font-body focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center',
              backgroundSize: '1.5rem',
            }}
          >
            {mockClients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} — {formatCurrency(client.aum)} AUM
              </option>
            ))}
          </select>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Client Card & Notes */}
          <div className="lg:col-span-1 space-y-6">
            {/* Client Snapshot Card */}
            {selectedClient && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 animate-fade-in delay-150">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-black">
                      {selectedClient.name}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      Last contact: {formatDate(selectedClient.lastContact)}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-black text-white text-xs font-medium rounded-full">
                    {selectedClient.riskProfile}
                  </span>
                </div>

                <div className="mb-6">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                    Assets Under Management
                  </p>
                  <p className="font-display text-3xl font-semibold text-black">
                    {formatCurrency(selectedClient.aum)}
                  </p>
                </div>

                {/* Goals */}
                <div className="mb-6">
                  <h3 className="text-gray-600 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Goals
                  </h3>
                  <div className="space-y-3">
                    {selectedClient.goals.map((goal) => {
                      const progress = (goal.currentAmount / goal.targetAmount) * 100;
                      return (
                        <div key={goal.id} className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-black text-sm font-medium">
                              {goal.name}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {formatDate(goal.targetDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-black rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                            <span className="text-gray-600 text-xs font-mono">
                              {progress.toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-gray-500 text-xs mt-1">
                            {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Accounts */}
                <div>
                  <h3 className="text-gray-600 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Accounts
                  </h3>
                  <div className="space-y-2">
                    {selectedClient.accounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex justify-between items-center py-2 px-3 bg-white border border-gray-200 rounded-lg"
                      >
                        <div>
                          <p className="text-black text-sm">{account.name}</p>
                          <p className="text-gray-500 text-xs">{account.type}</p>
                        </div>
                        <p className="text-black font-mono text-sm">
                          {formatCurrency(account.balance)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Meeting Notes */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 animate-fade-in delay-225">
              <h3 className="text-black font-display text-lg font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Meeting Notes
              </h3>
              <textarea
                value={meetingNotes}
                onChange={(e) => setMeetingNotes(e.target.value)}
                placeholder="Paste or type meeting notes, transcript, or call summary here..."
                className="w-full h-64 px-4 py-3 bg-white border border-gray-300 rounded-lg text-black font-body text-sm leading-relaxed placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all resize-none"
              />
              <button
                onClick={handleGenerateCRM}
                disabled={isGenerating || !meetingNotes.trim()}
                className="mt-4 w-full px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing Notes...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate CRM Update
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column - CRM Results & Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* CRM Update Results */}
            {crmResult && (
              <div className="space-y-6 animate-fade-in">
                {/* Field Updates Table */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-black font-display text-lg font-semibold flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                      Proposed Field Updates
                    </h3>
                    <span className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-full">
                      {crmResult.fieldUpdates.length} changes
                    </span>
                  </div>
                  <div className="overflow-x-auto bg-white">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Field
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Current
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Proposed
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Confidence
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Source
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {crmResult.fieldUpdates.map((update: FieldUpdate, index: number) => (
                          <tr
                            key={update.id}
                            className="hover:bg-gray-50 transition-colors animate-slide-in"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-black font-medium text-sm">
                                {update.fieldName}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-gray-500 text-sm">
                                {update.currentValue}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-black font-medium text-sm">
                                {update.proposedValue}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span
                                className={`inline-flex px-2.5 py-1 text-xs font-mono font-medium rounded-full ${getConfidenceColor(update.confidence)}`}
                              >
                                {(update.confidence * 100).toFixed(0)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 max-w-xs">
                              <p className="text-gray-500 text-xs italic truncate" title={update.sourceSnippet}>
                                {update.sourceSnippet}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tasks List */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <h3 className="text-black font-display text-lg font-semibold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Generated Tasks
                  </h3>
                  <div className="space-y-3">
                    {crmResult.tasks.map((task: Task, index: number) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg animate-slide-in"
                        style={{ animationDelay: `${index * 75}ms` }}
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-black text-sm font-medium">
                            {task.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-gray-500 text-xs">
                              Assigned to: <span className="text-gray-700">{task.owner}</span>
                            </span>
                            {task.dueDate && (
                              <span className="text-gray-500 text-xs">
                                Due: <span className="text-gray-700">{formatDate(task.dueDate)}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`flex-shrink-0 px-2.5 py-1 text-xs font-medium rounded-full border ${getPriorityStyles(task.priority)}`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit Log */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <h3 className="text-black font-display text-lg font-semibold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Audit Log
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {crmResult.auditLog.summary}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {crmResult.auditLog.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-mono rounded-md"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-gray-400 text-xs mt-3">
                      Generated: {new Date(crmResult.auditLog.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Accept Button */}
                <button
                  onClick={handlePushToCRM}
                  disabled={isPushing}
                  className="w-full px-6 py-4 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isPushing ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Pushing to CRM...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Accept & Push to CRM
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Empty State */}
            {!crmResult && !isGenerating && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center animate-fade-in delay-300">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-black font-display text-xl font-semibold mb-2">
                  Ready to Extract Insights
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Select a client and click "Generate CRM Update" to analyze meeting notes and automatically populate CRM fields, tasks, and audit logs.
                </p>
              </div>
            )}

            {/* Timeline */}
            {timeline.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 animate-fade-in">
                <h3 className="text-black font-display text-lg font-semibold mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Activity Timeline
                </h3>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-black via-gray-300 to-transparent" />
                  
                  <div className="space-y-6">
                    {timeline.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="relative pl-12 animate-slide-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Timeline dot */}
                        <div className="absolute left-0 top-1 w-8 h-8 bg-white border-2 border-black rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-black font-medium text-sm">
                              {entry.title}
                            </h4>
                            <span className="text-gray-500 text-xs">
                              {new Date(entry.date).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">
                            {entry.summary}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

