import { Client, Goal, Account } from './types';
import { mockClients } from './mockClients';

const CLIENTS_KEY = 'clarityworks_clients';

// Get all clients (mock + custom)
export function getAllClients(): Client[] {
  const customClients = getCustomClients();
  return [...mockClients, ...customClients];
}

// Get only custom (user-created) clients
export function getCustomClients(): Client[] {
  try {
    const data = localStorage.getItem(CLIENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Add a new client
export function addClient(client: Omit<Client, 'id'>): Client {
  const customClients = getCustomClients();
  const newClient: Client = {
    ...client,
    id: `client-custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  customClients.push(newClient);
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(customClients));
  return newClient;
}

// Update an existing custom client
export function updateClient(id: string, updates: Partial<Client>): Client | null {
  const customClients = getCustomClients();
  const index = customClients.findIndex(c => c.id === id);
  if (index === -1) return null;
  
  customClients[index] = { ...customClients[index], ...updates };
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(customClients));
  return customClients[index];
}

// Delete a custom client
export function deleteClient(id: string): boolean {
  const customClients = getCustomClients();
  const filtered = customClients.filter(c => c.id !== id);
  if (filtered.length === customClients.length) return false;
  
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(filtered));
  return true;
}

// Check if a client is a custom client (can be edited/deleted)
export function isCustomClient(id: string): boolean {
  return id.startsWith('client-custom-');
}

// Helper to create a new goal
export function createGoal(name: string, targetAmount: number, currentAmount: number, targetDate: string): Goal {
  return {
    id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    targetAmount,
    currentAmount,
    targetDate,
  };
}

// Helper to create a new account
export function createAccount(name: string, type: Account['type'], balance: number): Account {
  return {
    id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    type,
    balance,
  };
}

