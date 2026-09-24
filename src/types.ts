export interface Associate {
  id: string;
  name: string;
  phone: string;
  password?: string;
  email?: string;
  address?: string;
  status: 'active' | 'inactive';
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  project: string;
  price: number;
  advance: number;
  associateId?: string;
  date: string;
}

export interface Transaction {
  id: string;
  date: string;
  clientId: string;
  associateId: string;
  shareType: string;
  amount: number;
  profit: number;
  kind: 'referral' | 'equal' | 'held';
  distributionId?: string;
}

export interface Payment {
  id: string;
  associateId: string;
  date: string;
  amount: number;
  parts?: Record<string, number>;
  allocations?: string[];
}

export interface Session {
  role: 'admin' | 'associate';
  id?: string;
  name: string;
  phone?: string;
}

export interface Message {
  id: string;
  senderRole: 'associate' | 'admin';
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName?: string;
  associateId: string; // Used to group conversation thread by associate
  subject?: string;
  content: string;
  timestamp: string;
  read: boolean;
  priority?: 'normal' | 'urgent';
  category?: 'general' | 'payment' | 'project' | 'site_visit' | 'technical';
  isEdited?: boolean;
  editedAt?: string;
}

export interface AppDatabase {
  admin: { username: string; password: string };
  associates: Associate[];
  clients: Client[];
  transactions: Transaction[];
  payments: Payment[];
  messages: Message[];
}

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  filePath: string;
  autoSync: boolean;
}

export interface GitHubCommitLog {
  id: string;
  sha: string;
  message: string;
  action: 'push' | 'update' | 'delete' | 'pull';
  filePath: string;
  date: string;
  status: 'success' | 'failed';
  htmlUrl?: string;
  author?: string;
}

export interface GitHubRepoFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: string;
  download_url?: string;
}

export type TabKey =
  | 'dashboard'
  | 'associates'
  | 'clients'
  | 'profit'
  | 'transactions'
  | 'messages'
  | 'github'
  | 'myprofile';
