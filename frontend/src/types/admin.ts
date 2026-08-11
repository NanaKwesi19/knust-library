// ==========================================
// ADMIN DASHBOARD TYPE DEFINITIONS
// ==========================================

export type AdminTab = 
  | 'dashboard' | 'users' | 'inventory' | 'borrowing' 
  | 'reservations' | 'fines' | 'digital' | 'analytics' 
  | 'ai' | 'audit' | 'config' | 'backup';

export interface MenuItem {
  id: AdminTab;
  label: string;
  icon: string; // Lucide icon name
  badge?: number;
}

// ==========================================
// SYSTEM STATS
// ==========================================
export interface SystemStats {
  activeLoans: number;
  totalUsers: number;
  securityLogsCount: number;
  totalBooks: number;
  totalFines: number;
  overdueLoans: number;
}

// ==========================================
// USER MANAGEMENT
// ==========================================
export interface UserRegistryRecord {
  id: number;
  email: string;
  fullName: string;
  studentId: string | null;
  role: 'STUDENT' | 'LIBRARIAN' | 'ADMIN' | 'STAFF';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_CLEARANCE';
  programme?: string | null;
  department?: string | null;
  yearOfStudy?: number | null;
  phone?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface BulkUserAction {
  userIds: number[];
  action: 'ACTIVATE' | 'SUSPEND' | 'DELETE';
}

// ==========================================
// BOOK INVENTORY
// ==========================================
export interface BookCopyRecord {
  id: number;
  barcode: string;
  status: 'AVAILABLE' | 'BORROWED' | 'MAINTENANCE' | 'RESERVED' | 'LOST';
  condition?: string | null;
}

export interface BookRecord {
  id: number;
  title: string;
  author: string;
  isbn: string;
  category: string;
  shelfLocation: string;
  description?: string | null;
  publisher?: string | null;
  publishYear?: number | null;
  edition?: string | null;
  pages?: number | null;
  coverImage?: string | null;
  coverUrl?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  copies: BookCopyRecord[];
}

export interface NewBookPayload {
  title: string;
  author: string;
  isbn: string;
  category: string;
  shelfLocation: string;
  barcode: string;
  description?: string;
  publisher?: string;
  publishYear?: number;
  edition?: string;
  pages?: number;
}

// ==========================================
// BORROWING MANAGEMENT
// ==========================================
export interface ComprehensiveLoanRecord {
  id: number;
  loanUuid: string;
  dueDate: string;
  returnedAt: string | null;
  status: 'BORROWED' | 'RETURNED' | 'OVERDUE' | 'RENEWED';
  renewalCount: number;
  fineAmount: number;
  finePaid: boolean;
  createdAt: string;
  user: {
    id: number;
    fullName: string;
    studentId: string | null;
    email: string;
  };
  copy: {
    id: number;
    barcode: string;
    condition?: string | null;
    book: {
      id: number;
      title: string;
      category: string;
      author: string;
    };
  };
}

export interface CheckoutPayload {
  studentId: string;
  barcode: string;
  durationDays: number;
}

export interface ReturnPayload {
  loanUuid: string;
}

// ==========================================
// RESERVATIONS
// ==========================================
export interface ReservationRecord {
  id: number;
  type: 'BOOK_HOLD' | 'STUDY_SPACE' | 'DISCUSSION_ROOM';
  targetId: string;
  scheduledFor: string | null;
  status: 'PENDING' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  user: {
    id: number;
    fullName: string;
    studentId: string | null;
    email: string;
  };
}

export interface CreateReservationPayload {
  studentId: string;
  type: 'BOOK_HOLD' | 'STUDY_SPACE' | 'DISCUSSION_ROOM';
  targetId: string;
  scheduledFor: string;
  notes?: string;
}

// ==========================================
// FINES & PAYMENTS
// ==========================================
export interface FineRegistryRecord {
  id: number;
  amount: number;
  status: 'UNPAID' | 'PAID' | 'WAIVED';
  reason: string;
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
  loan: {
    id: number;
    loanUuid: string;
    copy: {
      id: number;
      barcode: string;
      book: {
        id: number;
        title: string;
        author: string;
      };
    };
    user: {
      id: number;
      fullName: string;
      studentId: string | null;
      email: string;
    };
  };
  payments?: Array<{
    id: number;
    reference: string;
    amount: number;
    method: string;
    status: string;
    createdAt: string;
  }>;
}

export interface PaymentPayload {
  fineId: number;
  reference: string;
  method?: string;
}

// ==========================================
// DIGITAL RESOURCES
// ==========================================
export interface DigitalResourceRecord {
  id: number;
  title: string;
  description: string | null;
  accessUrl: string;
  fileType: string;
  category: string;
  subCategory?: string | null;
  academicYear?: string | null;
  courseCode?: string | null;
  author?: string | null;
  publisher?: string | null;
  requiresAuth: boolean;
  downloadCount: number;
  fileSize?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface NewDigitalResourcePayload {
  title: string;
  description: string;
  accessUrl: string;
  category: string;
  fileType?: string;
  subCategory?: string;
  academicYear?: string;
  courseCode?: string;
  author?: string;
  publisher?: string;
  requiresAuth?: boolean;
}

// ==========================================
// ANALYTICS
// ==========================================
export interface AnalyticsPayload {
  departmentDistribution: Array<{ category: string; count: number }>;
  peakCirculationHours: Array<{ hour: number; count: number; loadLevel: string }>;
  weeklyTrafficTimeline: Array<{ day: string; checkouts: number; returns: number }>;
  categoryBreakdown?: Array<{ category: string; count: number }>;
  monthlyTrends?: Array<{ month: string; checkouts: number; returns: number }>;
}

export interface ForecastPayload {
  category: string;
  subject: string;
  borrowMonth: number;
}

export interface ForecastResponse {
  predicted_checkout_demand: number;
  confidence?: number;
  trend?: 'INCREASING' | 'DECREASING' | 'STABLE';
}

// ==========================================
// AUDIT LOGS
// ==========================================
export interface AuditLogRecord {
  id: number;
  action: string;
  description: string;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress: string | null;
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  details?: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: number;
    fullName: string;
    role: string;
  } | null;
}

// ==========================================
// SYSTEM CONFIG
// ==========================================
export interface ConfigurationRecord {
  id: number;
  key: string;
  value: string;
  description: string | null;
}

export interface ConfigChanges {
  [key: string]: string;
}

// ==========================================
// BACKUP & MAINTENANCE
// ==========================================
export interface BackupRecord {
  id: number;
  filename: string;
  sizeBytes: number;
  createdAt: string;
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  type: 'AUTOMATED' | 'MANUAL';
}

export interface DatabaseHealthRecord {
  tableName: string;
  rowCount: number;
  sizeBytes: number;
  lastVacuumed: string | null;
  indexSizeBytes: number;
}

export interface SystemHealthStatus {
  databaseStatus: 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED';
  apiLatencyMs: number;
  lastBackupAt: string | null;
  diskUsagePercent: number;
  uptimeHours: number;
  maintenanceMode?: boolean;
}

// ==========================================
// NOTIFICATIONS
// ==========================================
export interface NotificationRecord {
  id: number;
  type: string;
  title: string;
  message: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  read: boolean;
  actionUrl?: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  dueReminderDays: number;
  fineAlertThreshold: number;
}

// ==========================================
// EXPORT
// ==========================================
export interface ExportPayload {
  exportType: 'USERS_CSV' | 'BOOKS_CSV' | 'LOANS_CSV' | 'FINES_CSV' | 'REPORTS_PDF';
  filters?: Record<string, unknown>;
}

// ==========================================
// API RESPONSE WRAPPER
// ==========================================
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// ==========================================
// TABLE STATE
// ==========================================
export interface TableState {
  search: string;
  page: number;
  limit: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  filters: Record<string, string>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}