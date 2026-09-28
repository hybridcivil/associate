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

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  organization?: string;
  designation?: string;
  category: 'client' | 'contractor' | 'engineer' | 'vendor' | 'consultant' | 'official' | 'other';
  address?: string;
  notes?: string;
  associateId: string;
  associateName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BalanceTransfer {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  amount: number;
  date: string;
  note?: string;
  status: 'completed' | 'cancelled';
  senderPaymentId?: string;
  receiverTxId?: string;
}

export interface Director {
  id: string;
  name: string;
  designation: string;
  salary: number; // Base salary in BDT, used for proportional 90% share calculation
  phone: string;
  email?: string;
  status: 'active' | 'inactive';
  associateId?: string; // Optional link to an Associate account
  nid?: string;
  joiningDate: string;
  bankInfo?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DirectorShareItem {
  directorId: string;
  directorName: string;
  designation: string;
  salary: number;
  salaryPercentage: number; // Proportional percentage of total active director salaries
  shareAmount: number; // Proportional 90% share of total profit pool
  status: 'pending' | 'paid';
  paidDate?: string;
  paymentMethod?: string;
}

export interface DirectorDistribution {
  id: string;
  date: string;
  title: string;
  totalProfitPool: number; // Total company profit or surplus considered
  directorSharePercentage: number; // Always 90%
  directorPoolAmount: number; // 90% of total profit pool
  companyRetainedAmount: number; // 10% retained for operational reserves
  totalDirectorsSalary: number; // Sum of salaries of active directors at calculation time
  activeDirectorsCount: number;
  distributionItems: DirectorShareItem[];
  notes?: string;
  recordedBy: string;
  status: 'recorded' | 'disbursed';
  createdAt: string;
}

export interface AppDatabase {
  admin: { username: string; password: string };
  associates: Associate[];
  clients: Client[];
  transactions: Transaction[];
  payments: Payment[];
  messages: Message[];
  contacts?: Contact[];
  balanceTransfers?: BalanceTransfer[];
  directors?: Director[];
  directorDistributions?: DirectorDistribution[];
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

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  autoSync: boolean;
}

export interface SaveStatus {
  success: boolean;
  localSaved: boolean;
  supabaseSaved?: boolean;
  githubSaved: boolean;
  githubCommitSha?: string | null;
  githubCommitUrl?: string | null;
  warning?: string;
  error?: string;
  message?: string;
  authError?: boolean;
  data?: AppDatabase;
}

export type TabKey =
  | 'dashboard'
  | 'associates'
  | 'directors'
  | 'clients'
  | 'contacts'
  | 'profit'
  | 'transactions'
  | 'transfers'
  | 'messages'
  | 'supabase'
  | 'github'
  | 'myprofile';
