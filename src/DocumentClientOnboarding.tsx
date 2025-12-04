import { useState } from 'react';
import { Client, Goal, Account } from './types';
import { parseClientFromDocuments } from './docIngestService';

interface DocumentClientOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: (client: Client) => void;
}

// Helper to format currency for display
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function DocumentClientOnboarding({ isOpen, onClose, onClientCreated }: DocumentClientOnboardingProps) {
  const [documents, setDocuments] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedClient, setParsedClient] = useState<Client | null>(null);
  
  // Form state for editing parsed client
  const [formData, setFormData] = useState<{
    name: string;
    aum: string;
    riskProfile: Client['riskProfile'];
    advisor: string;
    goals: Goal[];
    accounts: Account[];
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    const docs: string[] = [];
    const names: string[] = [];

    for (let i = 0; i < Math.min(files.length, 3); i++) {
      const file = files[i];
      if (!file.name.endsWith('.txt')) {
        setError('Please upload only .txt files');
        return;
      }
      names.push(file.name);
      
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
      docs.push(text);
    }

    setDocuments(docs);
    setFileNames(names);
    setParsedClient(null);
    setFormData(null);
  };

  const handleParse = async () => {
    if (documents.length === 0) {
      setError('Please upload at least one document');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const client = await parseClientFromDocuments(documents);
      setParsedClient(client);
      setFormData({
        name: client.name,
        aum: client.aum.toString(),
        riskProfile: client.riskProfile,
        advisor: client.advisor,
        goals: [...client.goals],
        accounts: [...client.accounts],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse documents');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveClient = () => {
    if (!formData || !parsedClient) return;

    const client: Client = {
      id: parsedClient.id,
      name: formData.name,
      aum: parseFloat(formData.aum) || 0,
      riskProfile: formData.riskProfile,
      advisor: formData.advisor,
      lastContact: new Date().toISOString().split('T')[0],
      goals: formData.goals,
      accounts: formData.accounts,
    };

    onClientCreated(client);
    handleClose();
  };

  const handleClose = () => {
    setDocuments([]);
    setFileNames([]);
    setParsedClient(null);
    setFormData(null);
    setError(null);
    onClose();
  };

  const updateGoal = (index: number, field: keyof Goal, value: string | number) => {
    if (!formData) return;
    const newGoals = [...formData.goals];
    newGoals[index] = { ...newGoals[index], [field]: value };
    setFormData({ ...formData, goals: newGoals });
  };

  const removeGoal = (index: number) => {
    if (!formData) return;
    setFormData({ ...formData, goals: formData.goals.filter((_, i) => i !== index) });
  };

  const addGoal = () => {
    if (!formData) return;
    setFormData({
      ...formData,
      goals: [
        ...formData.goals,
        {
          id: `goal-new-${Date.now()}`,
          name: 'New Goal',
          targetAmount: 0,
          currentAmount: 0,
          targetDate: new Date().toISOString().split('T')[0],
        },
      ],
    });
  };

  const updateAccount = (index: number, field: keyof Account, value: string | number) => {
    if (!formData) return;
    const newAccounts = [...formData.accounts];
    newAccounts[index] = { ...newAccounts[index], [field]: value };
    setFormData({ ...formData, accounts: newAccounts });
  };

  const removeAccount = (index: number) => {
    if (!formData) return;
    setFormData({ ...formData, accounts: formData.accounts.filter((_, i) => i !== index) });
  };

  const addAccount = () => {
    if (!formData) return;
    setFormData({
      ...formData,
      accounts: [
        ...formData.accounts,
        {
          id: `acc-new-${Date.now()}`,
          name: 'New Account',
          type: 'Brokerage',
          balance: 0,
        },
      ],
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-black text-lg">Add Client from Documents</h2>
            <p className="text-gray-500 text-sm">Upload financial documents to automatically extract client information</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[70vh]">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: File Upload */}
          {!formData && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <label className="cursor-pointer">
                  <span className="text-black font-medium">Upload Documents</span>
                  <span className="text-gray-500 block text-sm mt-1">Select up to 3 .txt files</span>
                  <input
                    type="file"
                    multiple
                    accept=".txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {fileNames.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Selected Files:</p>
                  <ul className="space-y-1">
                    {fileNames.map((name, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleParse}
                disabled={documents.length === 0 || isParsing}
                className="w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isParsing ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Parsing Documents...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Parse Documents
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Review Form */}
          {formData && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-700 text-sm">Documents parsed successfully! Review and edit the extracted information below.</p>
              </div>

              {/* Basic Info */}
              <div>
                <h3 className="font-medium text-black mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Client Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">AUM</label>
                    <input
                      type="text"
                      value={formData.aum}
                      onChange={(e) => setFormData({ ...formData, aum: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Risk Profile</label>
                    <select
                      value={formData.riskProfile}
                      onChange={(e) => setFormData({ ...formData, riskProfile: e.target.value as Client['riskProfile'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                    >
                      <option value="Conservative">Conservative</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Moderate-Aggressive">Moderate-Aggressive</option>
                      <option value="Aggressive">Aggressive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Advisor</label>
                    <input
                      type="text"
                      value={formData.advisor}
                      onChange={(e) => setFormData({ ...formData, advisor: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                    />
                  </div>
                </div>
              </div>

              {/* Goals */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-black">Financial Goals</h3>
                  <button
                    onClick={addGoal}
                    className="text-sm text-gray-600 hover:text-black flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Goal
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.goals.map((goal, idx) => (
                    <div key={goal.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <input
                          type="text"
                          value={goal.name}
                          onChange={(e) => updateGoal(idx, 'name', e.target.value)}
                          className="font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-black focus:outline-none"
                        />
                        <button
                          onClick={() => removeGoal(idx)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <label className="text-gray-500 text-xs">Target</label>
                          <input
                            type="number"
                            value={goal.targetAmount}
                            onChange={(e) => updateGoal(idx, 'targetAmount', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-black"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500 text-xs">Current</label>
                          <input
                            type="number"
                            value={goal.currentAmount}
                            onChange={(e) => updateGoal(idx, 'currentAmount', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-black"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500 text-xs">Target Date</label>
                          <input
                            type="date"
                            value={goal.targetDate}
                            onChange={(e) => updateGoal(idx, 'targetDate', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-black"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {formData.goals.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">No goals extracted. Click "Add Goal" to create one.</p>
                  )}
                </div>
              </div>

              {/* Accounts */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-black">Accounts</h3>
                  <button
                    onClick={addAccount}
                    className="text-sm text-gray-600 hover:text-black flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Account
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.accounts.map((account, idx) => (
                    <div key={account.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <input
                          type="text"
                          value={account.name}
                          onChange={(e) => updateAccount(idx, 'name', e.target.value)}
                          className="font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-black focus:outline-none"
                        />
                        <button
                          onClick={() => removeAccount(idx)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <label className="text-gray-500 text-xs">Type</label>
                          <select
                            value={account.type}
                            onChange={(e) => updateAccount(idx, 'type', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-black"
                          >
                            <option value="IRA">IRA</option>
                            <option value="Roth IRA">Roth IRA</option>
                            <option value="401k">401k</option>
                            <option value="Brokerage">Brokerage</option>
                            <option value="Trust">Trust</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-gray-500 text-xs">Balance</label>
                          <input
                            type="number"
                            value={account.balance}
                            onChange={(e) => updateAccount(idx, 'balance', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-black"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {formData.accounts.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">No accounts extracted. Click "Add Account" to create one.</p>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-medium text-black mb-2">Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total AUM</p>
                    <p className="font-semibold text-black">{formatCurrency(parseFloat(formData.aum) || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Goals</p>
                    <p className="font-semibold text-black">{formData.goals.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Accounts</p>
                    <p className="font-semibold text-black">{formData.accounts.length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          {formData && (
            <button
              onClick={handleSaveClient}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
            >
              Save Client
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

