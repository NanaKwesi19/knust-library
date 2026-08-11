import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Users, BookOpen, ArrowLeftRight, CalendarCheck, 
  CreditCard, Globe, BarChart3, BrainCircuit, History, Sliders, 
  Database, LogOut, ShieldCheck, Search, SlidersHorizontal, 
  ArrowUpDown, AlertTriangle, HelpCircle, Plus, AlertCircle, Bookmark, CheckCircle, FileText, Calendar, BookMarked, Coins, ShieldAlert, Link2, ExternalLink, TrendingUp, Clock, FileLineChart, Download, Settings, Save, ToggleLeft, Server, HardDrive, RefreshCw, Archive, Zap, Wifi, WifiOff, Loader2, DatabaseBackup
} from 'lucide-react';

interface SystemStats {
  activeLoans: number;
  totalUsers: number;
  securityLogsCount: number;
}

interface ActiveLoanRecord {
  loanUuid: string;
  bookTitle: string;
  subject: string;
  borrowerName: string;
  status: string;
}

interface UserRegistryRecord {
  id: number;
  email: string;
  fullName: string;
  studentId: string | null;
  role: 'STUDENT' | 'LIBRARIAN' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_CLEARANCE';
  createdAt: string;
}

interface BookCopyRecord {
  id: number;
  barcode: string;
  status: 'AVAILABLE' | 'BORROWED' | 'MAINTENANCE' | 'RESERVED';
}

interface BookRecord {
  id: number;
  title: string;
  author: string;
  isbn: string;
  category: string;
  shelfLocation: string;
  createdAt: string;
  copies: BookCopyRecord[];
}

interface ComprehensiveLoanRecord {
  id: number;
  loanUuid: string;
  dueDate: string;
  returnedAt: string | null;
  status: 'BORROWED' | 'RETURNED' | 'OVERDUE';
  createdAt: string;
  user: {
    fullName: string;
    studentId: string | null;
    email: string;
  };
  copy: {
    barcode: string;
    book: {
      title: string;
      category: string;
    };
  };
}

interface ReservationRecord {
  id: number;
  type: 'BOOK_HOLD' | 'STUDY_SPACE' | 'DISCUSSION_ROOM';
  targetId: string;
  scheduledFor: string;
  status: 'PENDING' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
  user: {
    fullName: string;
    studentId: string | null;
    email: string;
  };
}

interface FineRegistryRecord {
  id: number;
  amount: number;
  status: 'UNPAID' | 'PAID';
  createdAt: string;
  loan: {
    loanUuid: string;
    copy: {
      barcode: string;
      book: {
        title: string;
      };
    };
    user: {
      fullName: string;
      studentId: string | null;
      email: string;
    };
  };
}

interface DigitalResourceRecord {
  id: number;
  title: string;
  description: string;
  accessUrl: string;
  category: string;
  requiresAuth: boolean;
  createdAt: string;
}

interface AnalyticsPayload {
  departmentDistribution: Array<{ category: string; count: number }>;
  peakCirculationHours: Array<{ hour: number; count: number; loadLevel: string }>;
  weeklyTrafficTimeline: Array<{ day: string; checkouts: number; returns: number }>;
}

interface AuditLogRecord {
  id: number;
  action: string;
  description: string;
  ipAddress: string | null;
  createdAt: string;
  user: {
    fullName: string;
    role: string;
  } | null;
}

interface ConfigurationRecord {
  id: number;
  key: string;
  value: string;
  description: string | null;
}

interface BackupRecord {
  id: number;
  filename: string;
  sizeBytes: number;
  createdAt: string;
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  type: 'AUTOMATED' | 'MANUAL';
}

interface DatabaseHealthRecord {
  tableName: string;
  rowCount: number;
  sizeBytes: number;
  lastVacuumed: string | null;
  indexSizeBytes: number;
}

interface SystemHealthStatus {
  databaseStatus: 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED';
  apiLatencyMs: number;
  lastBackupAt: string | null;
  diskUsagePercent: number;
  uptimeHours: number;
}

type AdminTab = 
  | 'dashboard' | 'users' | 'inventory' | 'borrowing' 
  | 'reservations' | 'fines' | 'digital' | 'analytics' 
  | 'ai' | 'audit' | 'config' | 'backup';

export const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Central Data Telemetry States
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loansLedger, setLoansLedger] = useState<ActiveLoanRecord[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // User Management State Hub (Tab 2)
  const [usersList, setUsersList] = useState<UserRegistryRecord[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedUserForStatus, setSelectedUserForStatus] = useState<UserRegistryRecord | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatusValue, setNewStatusValue] = useState<'ACTIVE' | 'SUSPENDED' | 'PENDING_CLEARANCE'>('ACTIVE');

  // Book Inventory State Hub (Tab 3)
  const [booksList, setBooksList] = useState<BookRecord[]>([]);
  const [isBooksLoading, setIsBooksLoading] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [isSavingBook, setIsSavingBook] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookIsbn, setNewBookIsbn] = useState('');
  const [newBookCategory, setNewBookCategory] = useState('');
  const [newBookShelf, setNewBookShelf] = useState('');
  const [newBookBarcode, setNewBookBarcode] = useState('');

  // Borrowing Management State Hub (Tab 4)
  const [comprehensiveLoans, setComprehensiveLoans] = useState<ComprehensiveLoanRecord[]>([]);
  const [isLoansLoading, setIsLoansLoading] = useState(false);
  const [loanSearch, setLoanSearch] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState<string>('ALL');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);
  const [checkoutStudentId, setCheckoutStudentId] = useState('');
  const [checkoutBarcode, setCheckoutBarcode] = useState('');
  const [checkoutDurationDays, setCheckoutDurationDays] = useState('14');
  const [returnLoanUuid, setReturnLoanUuid] = useState('');

  // Reservation Management State Hub (Tab 5)
  const [reservationsList, setReservationsList] = useState<ReservationRecord[]>([]);
  const [isReservationsLoading, setIsReservationsLoading] = useState(false);
  const [reservationSearch, setReservationSearch] = useState('');
  const [reservationTypeFilter, setReservationTypeFilter] = useState<string>('ALL');
  const [showCreateReservationModal, setShowCreateReservationModal] = useState(false);
  const [resStudentId, setResStudentId] = useState('');
  const [resType, setResType] = useState<'BOOK_HOLD' | 'STUDY_SPACE' | 'DISCUSSION_ROOM'>('BOOK_HOLD');
  const [resTargetId, setResTargetId] = useState('');
  const [resDateTime, setResDateTime] = useState('');
  const [isSavingReservation, setIsSavingReservation] = useState(false);

  // Fine & Payment Management State Hub (Tab 6)
  const [finesList, setFinesList] = useState<FineRegistryRecord[]>([]);
  const [isFinesLoading, setIsFinesLoading] = useState(false);
  const [fineSearch, setFineSearch] = useState('');
  const [fineStatusFilter, setFineStatusFilter] = useState<string>('ALL');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFineForPayment, setSelectedFineForPayment] = useState<FineRegistryRecord | null>(null);
  const [momoReference, setMomoReference] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Digital Resources State Hub (Tab 7)
  const [digitalResources, setDigitalResources] = useState<DigitalResourceRecord[]>([]);
  const [isDigitalLoading, setIsDigitalLoading] = useState(false);
  const [digitalSearch, setDigitalSearch] = useState('');
  const [digitalCategoryFilter, setDigitalCategoryFilter] = useState<string>('ALL');
  const [showAddDigitalModal, setShowAddDigitalModal] = useState(false);
  const [isSavingDigital, setIsSavingDigital] = useState(false);
  const [newDigitalTitle, setNewDigitalTitle] = useState('');
  const [newDigitalDesc, setNewDigitalDescription] = useState('');
  const [newDigitalUrl, setNewDigitalUrl] = useState('');
  const [newDigitalCategory, setNewDigitalCategory] = useState('');
  const [newDigitalAuthRequired, setNewDigitalAuthRequired] = useState(true);

  // Reports & Analytics State Hub (Tab 8)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsPayload | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [timeframeFilter, setTimeframeFilter] = useState<string>('7_DAYS');

  // Audit Logs State Hub (Tab 10)
  const [auditLogsList, setAuditLogsList] = useState<AuditLogRecord[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');

  // System Configuration State Hub (Tab 11)
  const [configList, setConfigList] = useState<ConfigurationRecord[]>([]);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [configChanges, setConfigChanges] = useState<{ [key: string]: string }>({});
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // AI Insights Form States (Tab 9)
  const [mlCategory, setMlCategory] = useState('');
  const [mlSubject, setMlSubject] = useState('');
  const [mlMonth, setMlMonth] = useState('1'); 
  const [forecast, setForecast] = useState<number | null>(null);
  const [isMlLoading, setIsMlLoading] = useState(false);
  const [mlError, setMlError] = useState<string | null>(null);

  // Backup & Maintenance State Hub (Tab 12)
  const [backupsList, setBackupsList] = useState<BackupRecord[]>([]);
  const [dbHealth, setDbHealth] = useState<DatabaseHealthRecord[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthStatus | null>(null);
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isDbHealthLoading, setIsDbHealthLoading] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupRecord | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupFilter, setBackupFilter] = useState<string>('ALL');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(false);

  // Dashboard Overview Table Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [sortField, setSortField] = useState<'bookTitle' | 'borrowerName' | ''>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Initial Central Telemetry Sync Call
  const refreshBaseTelemetry = async () => {
    try {
      const [statsResponse, loansResponse] = await Promise.all([
        API.get('/analytics/system-aggregates'),
        API.get('/loans/active-ledger')
      ]);
      setStats(statsResponse.data.data);
      setLoansLedger(loansResponse.data.data);
    } catch (err) {
      console.error('Failed to synchronize library operational metrics.');
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    refreshBaseTelemetry();
  }, []);

  // Proactive Module Tab Data Sync Triggers
  useEffect(() => {
    if (activeTab === 'users') fetchUserRegistry();
    if (activeTab === 'inventory') fetchBookInventory();
    if (activeTab === 'borrowing') fetchComprehensiveLoans();
    if (activeTab === 'reservations') fetchReservationRegistry();
    if (activeTab === 'fines') fetchFineRegistry();
    if (activeTab === 'digital') fetchDigitalRepository();
    if (activeTab === 'analytics') fetchSystemAnalytics();
    if (activeTab === 'audit') fetchSystemAuditLogs();
    if (activeTab === 'config') fetchSystemConfigurations();
    if (activeTab === 'backup') fetchBackupData();
  }, [activeTab, timeframeFilter]);

  const fetchUserRegistry = async () => {
    setIsUsersLoading(true);
    try {
      const response = await API.get('/users/registry');
      if (response.data?.success) setUsersList(response.data.data);
    } catch (err) {
      console.error('Failed to stream institutional user account lists.');
    } finally {
      setIsUsersLoading(false);
    }
  };

  const handleUpdateAccountStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForStatus) return;

    setUpdatingStatus(true);
    try {
      const response = await API.patch(`/users/${selectedUserForStatus.id}/account-status`, {
        status: newStatusValue
      });
      if (response.data?.success) {
        setUsersList(prev => prev.map(u => u.id === selectedUserForStatus.id ? { ...u, status: newStatusValue } : u));
        setSelectedUserForStatus(null);
      }
    } catch (err) {
      alert('Could not commit security permissions updates.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const fetchBookInventory = async () => {
    setIsBooksLoading(true);
    try {
      const response = await API.get('/books/inventory');
      if (response.data?.success) setBooksList(response.data.data);
    } catch (err) {
      console.error('Failed to retrieve the physical asset catalogues.');
    } finally {
      setIsBooksLoading(false);
    }
  };

  const handleRegisterBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookTitle || !newBookAuthor || !newBookIsbn || !newBookCategory || !newBookShelf || !newBookBarcode) {
      alert('All volume properties and copy barcodes are required fields.');
      return;
    }

    setIsSavingBook(true);
    try {
      const response = await API.post('/books/register', {
        title: newBookTitle,
        author: newBookAuthor,
        isbn: newBookIsbn,
        category: newBookCategory,
        shelfLocation: newBookShelf,
        barcode: newBookBarcode
      });

      if (response.data?.success) {
        setNewBookTitle(''); setNewBookAuthor(''); setNewBookIsbn(''); setNewBookCategory(''); setNewBookShelf(''); setNewBookBarcode('');
        setShowAddBookModal(false);
        fetchBookInventory();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record the academic volume inside the catalog.');
    } finally {
      setIsSavingBook(false);
    }
  };

  const fetchComprehensiveLoans = async () => {
    setIsLoansLoading(true);
    try {
      const response = await API.get('/loans/comprehensive');
      if (response.data?.success) setComprehensiveLoans(response.data.data);
    } catch (err) {
      console.error('Failed to retrieve full circulation historical logs.');
    } finally {
      setIsLoansLoading(false);
    }
  };

  const handleExecuteCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutStudentId || !checkoutBarcode || !checkoutDurationDays) return;

    setIsProcessingTransaction(true);
    try {
      const response = await API.post('/loans/checkout', {
        studentId: checkoutStudentId,
        barcode: checkoutBarcode,
        durationDays: parseInt(checkoutDurationDays, 10)
      });
      if (response.data?.success) {
        setCheckoutStudentId(''); setCheckoutBarcode('');
        setShowCheckoutModal(false);
        fetchComprehensiveLoans();
        refreshBaseTelemetry();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to successfully execute book loan allocation rules.');
    } finally {
      setIsProcessingTransaction(false);
    }
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnLoanUuid) return;

    setIsProcessingTransaction(true);
    try {
      const response = await API.patch(`/loans/return/${returnLoanUuid}`);
      if (response.data?.success) {
        setReturnLoanUuid('');
        setShowReturnModal(false);
        fetchComprehensiveLoans();
        refreshBaseTelemetry();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to safely register book log return closure details.');
    } finally {
      setIsProcessingTransaction(false);
    }
  };

  const fetchReservationRegistry = async () => {
    setIsReservationsLoading(true);
    try {
      const response = await API.get('/reservations/ledger');
      if (response.data?.success) setReservationsList(response.data.data);
    } catch (err) {
      console.error('Failed to synchronize reservation infrastructure indices.');
    } finally {
      setIsReservationsLoading(false);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resStudentId || !resType || !resTargetId || !resDateTime) {
      alert('All fields are required to queue space allocations or holds.');
      return;
    }

    setIsSavingReservation(true);
    try {
      const response = await API.post('/reservations/create', {
        studentId: resStudentId,
        type: resType,
        targetId: resTargetId,
        scheduledFor: new Date(resDateTime).toISOString()
      });

      if (response.data?.success) {
        setResStudentId(''); setResTargetId(''); setResDateTime('');
        setShowCreateReservationModal(false);
        fetchReservationRegistry();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to commit reservation scheduling constraints.');
    } finally {
      setIsSavingReservation(false);
    }
  };

  const handleUpdateReservationStatus = async (id: number, status: 'FULFILLED' | 'CANCELLED') => {
    if (!confirm(`Are you sure you want to mark this reservation as ${status}?`)) return;

    try {
      const response = await API.patch(`/reservations/${id}/status`, { status });
      if (response.data?.success) {
        setReservationsList(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to adjust active schedule configurations.');
    }
  };

  const fetchFineRegistry = async () => {
    setIsFinesLoading(true);
    try {
      const response = await API.get('/fines/ledger');
      if (response.data?.success) setFinesList(response.data.data);
    } catch (err) {
      console.error('Failed to synchronize account penalty matrices:', err);
    } finally {
      setIsFinesLoading(false);
    }
  };

  const handleProcessFinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFineForPayment || !momoReference) return;

    setIsProcessingPayment(true);
    try {
      const response = await API.post('/fines/clear-payment', {
        fineId: selectedFineForPayment.id,
        reference: momoReference
      });

      if (response.data?.success) {
        setMomoReference('');
        setShowPaymentModal(false);
        setSelectedFineForPayment(null);
        fetchFineRegistry();
        refreshBaseTelemetry();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to verify payment parameters or drop statement bounds.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const fetchDigitalRepository = async () => {
    setIsDigitalLoading(true);
    try {
      const response = await API.get('/digital-resources/catalog');
      if (response.data?.success) setDigitalResources(response.data.data);
    } catch (err) {
      console.error('Failed to index electronic database resources lists:', err);
    } finally {
      setIsDigitalLoading(false);
    }
  };

  const handleCreateDigitalLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDigitalTitle || !newDigitalDesc || !newDigitalUrl || !newDigitalCategory) {
      alert('All digital reference properties are required inputs.');
      return;
    }

    setIsSavingDigital(true);
    try {
      const response = await API.post('/digital-resources/add', {
        title: newDigitalTitle,
        description: newDigitalDesc,
        accessUrl: newDigitalUrl,
        category: newDigitalCategory,
        requiresAuth: newDigitalAuthRequired
      });

      if (response.data?.success) {
        setNewDigitalTitle(''); setNewDigitalDescription(''); setNewDigitalUrl(''); setNewDigitalCategory('');
        setShowAddDigitalModal(false);
        fetchDigitalRepository();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record electronic directory links entries.');
    } finally {
      setIsSavingDigital(false);
    }
  };

  const fetchSystemAnalytics = async () => {
    setIsAnalyticsLoading(true);
    try {
      const response = await API.get('/analytics/operational-metrics', {
        params: { timeframe: timeframeFilter }
      });
      if (response.data?.success) setAnalyticsData(response.data.data);
    } catch (err) {
      console.error('Failed to sync reporting system metrics arrays:', err);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  const fetchSystemAuditLogs = async () => {
    setIsAuditLoading(true);
    try {
      const response = await API.get('/audit-logs/stream');
      if (response.data?.success) setAuditLogsList(response.data.data);
    } catch (err) {
      console.error('Failed to pull system immutable audit line traces:', err);
    } finally {
      setIsAuditLoading(false);
    }
  };

  const fetchSystemConfigurations = async () => {
    setIsConfigLoading(true);
    try {
      const response = await API.get('/config/all');
      if (response.data?.success) {
        setConfigList(response.data.data);
        const initialMap: { [key: string]: string } = {};
        response.data.data.forEach((item: ConfigurationRecord) => {
          initialMap[item.key] = item.value;
        });
        setConfigChanges(initialMap);
      }
    } catch (err) {
      console.error('Failed to fetch system parameter settings layout:', err);
    } finally {
      setIsConfigLoading(false);
    }
  };

  const handleConfigInputChange = (key: string, value: string) => {
    setConfigChanges(prev => ({ ...prev, [key]: value }));
  };

  const handleUpdateSystemConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const response = await API.post('/config/update-batch', {
        settings: configChanges
      });
      if (response.data?.success) {
        alert('Global operational configurations and limits committed successfully.');
        fetchSystemConfigurations();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update central configuration values.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleFetchForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mlCategory || !mlSubject) return;

    setIsMlLoading(true);
    setMlError(null);
    setForecast(null);

    try {
      const response = await API.get('/analytics/demand-forecast', {
        params: { category: mlCategory, subject: mlSubject, borrowMonth: mlMonth }
      });
      if (response.data?.success) {
        setForecast(response.data.data.predicted_checkout_demand);
      }
    } catch (err: any) {
      setMlError(err.response?.data?.error || 'Forecasting engine values could not be calculated.');
    } finally {
      setIsMlLoading(false);
    }
  };

  // Backup & Maintenance Handlers
  const fetchBackupData = async () => {
    setIsBackupLoading(true);
    setIsDbHealthLoading(true);
    try {
      const [backupsRes, healthRes, sysRes] = await Promise.all([
        API.get('/maintenance/backups'),
        API.get('/maintenance/db-health'),
        API.get('/maintenance/system-status')
      ]);
      if (backupsRes.data?.success) setBackupsList(backupsRes.data.data);
      if (healthRes.data?.success) setDbHealth(healthRes.data.data);
      if (sysRes.data?.success) {
        setSystemHealth(sysRes.data.data);
        setMaintenanceMode(sysRes.data.data.maintenanceMode || false);
      }
    } catch (err) {
      console.error('Failed to fetch backup and maintenance telemetry:', err);
    } finally {
      setIsBackupLoading(false);
      setIsDbHealthLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!confirm('Initiate a full database snapshot backup? This may take several minutes.')) return;
    setIsCreatingBackup(true);
    try {
      const response = await API.post('/maintenance/backup');
      if (response.data?.success) {
        alert('Backup snapshot initiated successfully. Refresh to monitor progress.');
        fetchBackupData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to initiate backup snapshot sequence.');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBackupForRestore) return;
    if (!confirm(`WARNING: Restoring from backup ${selectedBackupForRestore.filename} will overwrite current data. Continue?`)) return;

    setIsRestoringBackup(true);
    try {
      const response = await API.post(`/maintenance/restore/${selectedBackupForRestore.id}`);
      if (response.data?.success) {
        alert('Database restore sequence initiated. System may restart.');
        setShowRestoreModal(false);
        setSelectedBackupForRestore(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to execute database restore protocol.');
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const handleToggleMaintenanceMode = async () => {
    setIsTogglingMaintenance(true);
    try {
      const response = await API.post('/maintenance/toggle', { enabled: !maintenanceMode });
      if (response.data?.success) {
        setMaintenanceMode(!maintenanceMode);
        alert(`Maintenance mode ${!maintenanceMode ? 'enabled' : 'disabled'} successfully.`);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to toggle maintenance state.');
    } finally {
      setIsTogglingMaintenance(false);
    }
  };

  const handleDeleteBackup = async (id: number) => {
    if (!confirm('Permanently delete this backup snapshot? This action cannot be undone.')) return;
    try {
      const response = await API.delete(`/maintenance/backups/${id}`);
      if (response.data?.success) {
        setBackupsList(prev => prev.filter(b => b.id !== id));
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to purge backup archive.');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // const handleSort = (field: 'bookTitle' | 'borrowerName') => {
  //   if (sortField === field) {
  //     setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  //   } else {
  //     setSortField(field);
  //     setSortDirection('asc');
  //   }
  // };

  // const uniqueSubjects = Object.keys(
  //   (loansLedger || []).reduce((acc, current) => ({ ...acc, [current.subject]: true }), {})
  // );

  const uniqueCategories = Object.keys(
    (booksList || []).reduce((acc, current) => ({ ...acc, [current.category]: true }), {})
  );

  const uniqueDigitalCategories = Object.keys(
    (digitalResources || []).reduce((acc, current) => ({ ...acc, [current.category]: true }), {})
  );

  const uniqueAuditActions = Object.keys(
    (auditLogsList || []).reduce((acc, current) => ({ ...acc, [current.action]: true }), {})
  );

  const processedLedger = (loansLedger || [])
    .filter((loan) => {
      const matchesSearch = 
        loan.bookTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = subjectFilter === '' || loan.subject === subjectFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      const valA = a[sortField].toLowerCase();
      const valB = b[sortField].toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'inventory', label: 'Book Inventory', icon: BookOpen },
    { id: 'borrowing', label: 'Borrowing Management', icon: ArrowLeftRight },
    { id: 'reservations', label: 'Reservation Management', icon: CalendarCheck },
    { id: 'fines', label: 'Fine & Payment Management', icon: CreditCard },
    { id: 'digital', label: 'Digital Resources', icon: Globe },
    { id: 'analytics', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'ai', label: 'AI Insights', icon: BrainCircuit },
    { id: 'audit', label: 'Audit Logs', icon: History },
    { id: 'config', label: 'System Configuration', icon: Sliders },
    { id: 'backup', label: 'Backup & Maintenance', icon: Database },
  ] as const;

  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-[#800020] border-t-amber-400 rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Loading Management Terminal...</p>
      </div>
    );
  }

  // =========================================================================
  // CORE DYNAMIC SECTION LAYOUT GENERATORS
  // =========================================================================

  const renderDashboardOverview = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Book Loans</span>
            <h4 className="text-3xl font-black text-slate-900 tracking-tight">{stats?.activeLoans ?? 0}</h4>
            <p className="text-xs text-slate-400 font-medium pt-0.5">Physical volumes out with borrowers</p>
          </div>
          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl border border-blue-100"><ArrowLeftRight className="h-5 w-5" /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Registered Students</span>
            <h4 className="text-3xl font-black text-slate-900 tracking-tight">{stats?.totalUsers ?? 0}</h4>
            <p className="text-xs text-slate-400 font-medium pt-0.5">Profiles active within central system</p>
          </div>
          <div className="bg-purple-50 text-purple-600 p-3 rounded-xl border border-purple-100"><Users className="h-5 w-5" /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">System Issue Alerts</span>
            <h4 className="text-3xl font-black text-rose-600 tracking-tight">{stats?.securityLogsCount ?? 0}</h4>
            <p className="text-xs text-slate-400 font-medium pt-0.5">Operational anomalies caught</p>
          </div>
          <div className="bg-rose-50 text-rose-600 p-3 rounded-xl border border-rose-100"><ShieldCheck className="h-5 w-5" /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b">Overview Operations Desk</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Use the separate <span className="font-bold text-[#800020]">AI Insights</span> sidebar module options layout to access the deep calculating forecasting controls.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Circulation Activity Summary</h3>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-200">
                  <th className="p-3.5">Book Title</th>
                  <th className="p-3.5">Subject</th>
                  <th className="p-3.5">Student Borrower</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white font-medium">
                {processedLedger.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-slate-400 italic">No checkout records currently running.</td></tr>
                ) : (
                  processedLedger.slice(0, 5).map((loan) => (
                    <tr key={loan.loanUuid}>
                      <td className="p-3.5 font-bold text-slate-900 truncate max-w-[180px]">{loan.bookTitle}</td>
                      <td className="p-3.5 text-slate-500">{loan.subject}</td>
                      <td className="p-3.5 text-slate-600">{loan.borrowerName}</td>
                      <td className="p-3.5 text-center">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wide">
                          {loan.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );

  const renderUserManagement = () => {
    const filteredUsers = usersList.filter(u => {
      const matchesSearch = 
        u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.studentId && u.studentId.toLowerCase().includes(userSearch.toLowerCase()));
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Student & Staff Accounts</h3>
            <p className="text-[11px] text-slate-400 font-medium">Manage library memberships, roles, and status configurations</p>
          </div>
          <button onClick={() => alert('Accessing integration configuration nodes...')} className="bg-[#800020] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#66001a] transition-colors flex items-center gap-1.5 shadow-sm self-start sm:self-auto">
            <Plus className="w-4 h-4" /> Register New Account
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Search by name, email, or index number..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-medium placeholder-slate-400 shadow-sm" />
          </div>
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-semibold text-slate-600 appearance-none cursor-pointer shadow-sm">
              <option value="ALL">All Authority Roles</option>
              <option value="STUDENT">Students Only</option>
              <option value="LIBRARIAN">Librarians</option>
              <option value="ADMIN">System Admins</option>
            </select>
          </div>
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-semibold text-slate-600 appearance-none cursor-pointer shadow-sm">
              <option value="ALL">All Account Statuses</option>
              <option value="ACTIVE">Active Clearances</option>
              <option value="SUSPENDED">Suspended / Held</option>
              <option value="PENDING_CLEARANCE">Pending Verification</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {isUsersLoading ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-[#800020] border-t-transparent rounded-full animate-spin" /> Syncing User Ledger...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic">No registered user profiles matched your filter combinations.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-200 select-none">
                    <th className="p-3.5">Full Name & Details</th>
                    <th className="p-3.5">Identification Index</th>
                    <th className="p-3.5">Authority Role</th>
                    <th className="p-3.5">Account Status</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white font-medium">
                  {filteredUsers.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{item.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{item.email}</div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 font-semibold">{item.studentId || <span className="text-slate-300 italic font-sans font-normal">Staff Node</span>}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          item.role === 'ADMIN' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                          item.role === 'LIBRARIAN' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-slate-50 text-slate-700 border border-slate-200'
                        }`}>{item.role}</span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide inline-block border ${
                          item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          item.status === 'SUSPENDED' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>{item.status.replace('_', ' ')}</span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button onClick={() => { setSelectedUserForStatus(item); setNewStatusValue(item.status); }} className="text-[#800020] hover:underline font-bold text-[11px]">Modify Status</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <AnimatePresence>
          {selectedUserForStatus && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
                <div className="bg-[#800020] text-white px-6 py-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Modify Account Clearance</h4>
                </div>
                <form onSubmit={handleUpdateAccountStatus} className="p-6 space-y-4 text-xs font-medium">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-1">
                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">Target User</p>
                    <p className="font-bold text-slate-800 text-sm">{selectedUserForStatus.fullName}</p>
                    <p className="text-slate-500">{selectedUserForStatus.email}</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-bold uppercase tracking-wider">Select New Status</label>
                    <select value={newStatusValue} onChange={(e) => setNewStatusValue(e.target.value as any)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-semibold text-slate-700 cursor-pointer">
                      <option value="ACTIVE">ACTIVE (Grant full portal permissions)</option>
                      <option value="PENDING_CLEARANCE">PENDING CLEARANCE (Awaiting administrative audit)</option>
                      <option value="SUSPENDED">SUSPENDED (Restrict borrowing & room access)</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" disabled={updatingStatus} onClick={() => setSelectedUserForStatus(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                    <button type="submit" disabled={updatingStatus} className="px-4 py-2 bg-[#800020] hover:bg-[#66001a] text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5">{updatingStatus ? 'Saving Permissions...' : 'Commit Settings'}</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderBookInventory = () => {
    const filteredBooks = booksList.filter(b => {
      const matchesSearch = 
        b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
        b.author.toLowerCase().includes(bookSearch.toLowerCase()) ||
        b.isbn.toLowerCase().includes(bookSearch.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || b.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Physical Catalog Inventory</h3>
            <p className="text-[11px] text-slate-400 font-medium">Add academic titles, barcode individual copies, and track storage locations</p>
          </div>
          <button onClick={() => setShowAddBookModal(true)} className="bg-[#800020] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#66001a] transition-colors flex items-center gap-1.5 shadow-sm self-start sm:self-auto">
            <Plus className="w-4 h-4" /> Register New Title
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Search catalog by title, author, or ISBN number..." value={bookSearch} onChange={(e) => setBookSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-medium placeholder-slate-400 shadow-sm" />
          </div>
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-semibold text-slate-600 appearance-none cursor-pointer shadow-sm">
              <option value="ALL">All Departments & Categories</option>
              {uniqueCategories.map(cat => ( <option key={cat} value={cat}>{cat}</option> ))}
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {isBooksLoading ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-[#800020] border-t-transparent rounded-full animate-spin" /> Syncing Inventory Catalog...
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic">No academic resource volumes matched your search terms.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-200 select-none">
                    <th className="p-3.5">Title & Author</th>
                    <th className="p-3.5">ISBN</th>
                    <th className="p-3.5">Academic Classification</th>
                    <th className="p-3.5">Location Placement</th>
                    <th className="p-3.5 text-center">Physical Copies Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white font-medium">
                  {filteredBooks.map((book) => {
                    const totalCount = book.copies?.length || 0;
                    const borrowedCount = book.copies?.filter(c => c.status === 'BORROWED').length || 0;
                    const availableCount = book.copies?.filter(c => c.status === 'AVAILABLE').length || 0;

                    return (
                      <tr key={book.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{book.title}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{book.author}</div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">{book.isbn}</td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-[#800020] border border-amber-200/50 rounded px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                            <Bookmark className="w-2.5 h-2.5" /> {book.category}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 font-semibold">{book.shelfLocation}</td>
                        <td className="p-3.5">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-700">{totalCount} total copies</span>
                            <div className="flex items-center gap-1.5 text-[9px] uppercase font-extrabold tracking-wider">
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/30">{availableCount} Avail</span>
                              {borrowedCount > 0 && ( <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/30">{borrowedCount} Out</span> )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showAddBookModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
                <div className="bg-[#800020] text-white px-6 py-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Register New Resource Title</h4>
                </div>
                <form onSubmit={handleRegisterBook} className="p-6 space-y-4 text-xs font-medium">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 font-bold uppercase tracking-wider">Book Title</label>
                      <input type="text" required value={newBookTitle} onChange={(e) => setNewBookTitle(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-slate-700" placeholder="e.g., Introduction to Algorithms" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 font-bold uppercase tracking-wider">Author Name</label>
                      <input type="text" required value={newBookAuthor} onChange={(e) => setNewBookAuthor(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-slate-700" placeholder="e.g., Thomas H. Cormen" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 font-bold uppercase tracking-wider">ISBN Number</label>
                      <input type="text" required value={newBookIsbn} onChange={(e) => setNewBookIsbn(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-slate-700 font-mono" placeholder="e.g., 978-0262033848" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 font-bold uppercase tracking-wider">Academic Classification</label>
                      <input type="text" required value={newBookCategory} onChange={(e) => setNewBookCategory(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-slate-700" placeholder="e.g., Computer Science" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 font-bold uppercase tracking-wider">Shelf Location Placement</label>
                      <input type="text" required value={newBookShelf} onChange={(e) => setNewBookShelf(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-slate-700" placeholder="e.g., Level 3, Aisle B4" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 font-bold uppercase tracking-wider">Initial Copy Barcode ID</label>
                      <input type="text" required value={newBookBarcode} onChange={(e) => setNewBookBarcode(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-slate-700 font-mono" placeholder="e.g., COP-CS-2026-001" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" disabled={isSavingBook} onClick={() => setShowAddBookModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                    <button type="submit" disabled={isSavingBook} className="px-4 py-2 bg-[#800020] hover:bg-[#66001a] text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5">{isSavingBook ? 'Saving Catalog...' : 'Register Title'}</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderBorrowingManagement = () => {
    const filteredLoans = comprehensiveLoans.filter(loan => {
      const searchStr = loanSearch.toLowerCase();
      return (
        loan.user.fullName.toLowerCase().includes(searchStr) ||
        (loan.user.studentId && loan.user.studentId.toLowerCase().includes(searchStr)) ||
        loan.copy.barcode.toLowerCase().includes(searchStr) ||
        loan.copy.book.title.toLowerCase().includes(searchStr) ||
        loan.loanUuid.toLowerCase().includes(searchStr)
      );
    });

    const filteredAndStatusLoans = loanStatusFilter === 'ALL' ? filteredLoans : filteredLoans.filter(l => l.status === loanStatusFilter);
    const currentBorrowedCount = comprehensiveLoans.filter(l => l.status === 'BORROWED').length;
    const currentOverdueCount = comprehensiveLoans.filter(l => l.status === 'OVERDUE').length;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Checkouts</span>
              <h4 className="text-2xl font-black text-slate-900 mt-0.5">{currentBorrowedCount}</h4>
            </div>
            <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl border border-blue-100"><ArrowLeftRight className="w-4 h-4" /></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overdue Volumes</span>
              <h4 className="text-2xl font-black text-rose-600 mt-0.5">{currentOverdueCount}</h4>
            </div>
            <div className="bg-rose-50 text-rose-600 p-2.5 rounded-xl border border-rose-100"><AlertTriangle className="w-4 h-4" /></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Transactions</span>
              <h4 className="text-2xl font-black text-slate-900 mt-0.5">{comprehensiveLoans.length}</h4>
            </div>
            <div className="bg-slate-50 text-slate-600 p-2.5 rounded-xl border border-slate-200"><FileText className="w-4 h-4" /></div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Circulation Desk Control</h3>
            <p className="text-[11px] text-slate-400 font-medium">Issue volume access privileges or log physical copy returns natively</p>
          </div>
          <div className="flex gap-3 text-xs font-bold">
            <button onClick={() => setShowCheckoutModal(true)} className="bg-[#800020] text-white px-4 py-2 rounded-xl hover:bg-[#66001a] transition-colors flex items-center gap-1.5 shadow-sm"><Plus className="w-4 h-4" /> Issue Book Loan</button>
            <button onClick={() => setShowReturnModal(true)} className="bg-emerald-800 text-white px-4 py-2 rounded-xl hover:bg-emerald-900 transition-colors flex items-center gap-1.5 shadow-sm"><CheckCircle className="w-4 h-4" /> Process Return</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Search by student index, copy barcode, title, or loan ID..." value={loanSearch} onChange={(e) => setLoanSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-medium placeholder-slate-400 shadow-sm" />
          </div>
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select value={loanStatusFilter} onChange={(e) => setLoanStatusFilter(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-semibold text-slate-600 appearance-none cursor-pointer shadow-sm">
              <option value="ALL">All Circulation Statuses</option>
              <option value="BORROWED">Active Checkouts Only</option>
              <option value="RETURNED">Returned Log History</option>
              <option value="OVERDUE">Flagged Overdue Entries</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {isLoansLoading ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-[#800020] border-t-transparent rounded-full animate-spin" /> Syncing Circulation Ledgers...
            </div>
          ) : filteredAndStatusLoans.length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic">No circulation transaction matches found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-200 select-none">
                    <th className="p-3.5">Student Borrower Details</th>
                    <th className="p-3.5">Assigned Copy Barcode</th>
                    <th className="p-3.5">Resource Book Title</th>
                    <th className="p-3.5">Due Timeline Date</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white font-medium">
                  {filteredAndStatusLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{loan.user.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{loan.user.studentId || 'Staff Request'}</div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 font-bold">{loan.copy.barcode}</td>
                      <td className="p-3.5 max-w-[200px] truncate text-slate-900 font-semibold">{loan.copy.book.title}</td>
                      <td className="p-3.5 text-slate-500 font-normal">
                        {new Date(loan.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        {loan.returnedAt && ( <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Returned: {new Date(loan.returnedAt).toLocaleDateString()}</div> )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide inline-block border ${
                          loan.status === 'BORROWED' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          loan.status === 'RETURNED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>{loan.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showCheckoutModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
                <div className="bg-[#800020] text-white px-6 py-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Allocate New Book Loan</h4>
                </div>
                <form onSubmit={handleExecuteCheckout} className="p-6 space-y-4 text-xs font-medium">
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-bold uppercase tracking-wider">Student Index / Identification Number</label>
                    <input type="text" required value={checkoutStudentId} onChange={(e) => setCheckoutStudentId(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-slate-700 uppercase" placeholder="e.g., KNUST-STU-2026-042" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-bold uppercase tracking-wider">Copy Barcode ID Identifier</label>
                    <input type="text" required value={checkoutBarcode} onChange={(e) => setCheckoutBarcode(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-slate-700 font-mono uppercase" placeholder="e.g., COP-CS-2026-001" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-bold uppercase tracking-wider">Standard Loan Duration Timeline</label>
                    <select value={checkoutDurationDays} onChange={(e) => setCheckoutDurationDays(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-semibold text-slate-700 cursor-pointer">
                      <option value="7">7 Days (Standard Academic Short Hold)</option>
                      <option value="14">14 Days (Standard Campus Circulation Block)</option>
                      <option value="30">30 Days (Extended Research Term Allowance)</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" disabled={isProcessingTransaction} onClick={() => setShowCheckoutModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                    <button type="submit" disabled={isProcessingTransaction} className="px-4 py-2 bg-[#800020] hover:bg-[#66001a] text-white font-bold rounded-xl shadow-sm transition-colors">{isProcessingTransaction ? 'Validating Privileges...' : 'Issue Asset Checkout'}</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {showReturnModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
                <div className="bg-emerald-800 text-white px-6 py-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-300 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Process Volume Return Logs</h4>
                </div>
                <form onSubmit={handleProcessReturn} className="p-6 space-y-4 text-xs font-medium">
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-bold uppercase tracking-wider">Active Transaction Loan Universal ID (UUID)</label>
                    <input type="text" required value={returnLoanUuid} onChange={(e) => setReturnLoanUuid(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-800 text-slate-700 font-mono" placeholder="Paste full transaction loan UUID string here" />
                  </div>
                  <div className="text-[11px] text-slate-400 bg-slate-50 p-3 rounded-xl border flex gap-2">
                    <HelpCircle className="w-4 h-4 text-[#800020] shrink-0 mt-0.5" />
                    <span>Librarians can copy the full loan UUID parameter tag directly from the real-time record rows matrix index listed below.</span>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" disabled={isProcessingTransaction} onClick={() => setShowReturnModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                    <button type="submit" disabled={isProcessingTransaction} className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-sm transition-colors">{isProcessingTransaction ? 'Updating Asset States...' : 'Process Closure Return'}</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderReservationManagement = () => {
    const filteredReservations = reservationsList.filter(res => {
      const searchStr = reservationSearch.toLowerCase();
      return (
        res.user.fullName.toLowerCase().includes(searchStr) ||
        (res.user.studentId && res.user.studentId.toLowerCase().includes(searchStr)) ||
        res.targetId.toLowerCase().includes(searchStr)
      );
    });

    const filteredAndTypeReservations = reservationTypeFilter === 'ALL' ? filteredReservations : filteredReservations.filter(r => r.type === reservationTypeFilter);
    const pendingCount = reservationsList.filter(r => r.status === 'PENDING').length;
    const fulfilledCount = reservationsList.filter(r => r.status === 'FULFILLED').length;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Space Schedules & Hold Queues</h3>
            <p className="text-[11px] text-slate-400 font-medium">Monitor discussion room calendars, book holds, and custom facility allocations</p>
          </div>
          <button onClick={() => setShowCreateReservationModal(true)} className="bg-[#800020] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#66001a] transition-colors flex items-center gap-1.5 shadow-sm self-start sm:self-auto">
            <Plus className="w-4 h-4" /> Create Reservation Entry
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-medium">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pending Requests</span>
              <span className="text-xl font-black text-amber-600 block mt-0.5">{pendingCount}</span>
            </div>
            <div className="bg-amber-50 text-amber-600 p-2 rounded-lg"><Calendar className="w-4 h-4" /></div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Fulfilled Logs</span>
              <span className="text-xl font-black text-emerald-700 block mt-0.5">{fulfilledCount}</span>
            </div>
            <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg"><CheckCircle className="w-4 h-4" /></div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Holds Tracked</span>
              <span className="text-xl font-black text-slate-800 block mt-0.5">{reservationsList.filter(r => r.type === 'BOOK_HOLD').length}</span>
            </div>
            <div className="bg-blue-50 text-blue-700 p-2 rounded-lg"><BookMarked className="w-4 h-4" /></div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Spaces Booked</span>
              <span className="text-xl font-black text-slate-800 block mt-0.5">{reservationsList.filter(r => r.type !== 'BOOK_HOLD').length}</span>
            </div>
            <div className="bg-purple-50 text-purple-700 p-2 rounded-lg"><Globe className="w-4 h-4" /></div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Search by student index, room code, or book ISBN target..." value={reservationSearch} onChange={(e) => setReservationSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-medium placeholder-slate-400 shadow-sm" />
          </div>
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select value={reservationTypeFilter} onChange={(e) => setReservationTypeFilter(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-semibold text-slate-600 appearance-none cursor-pointer shadow-sm">
              <option value="ALL">All Reservation Sub-Categories</option>
              <option value="BOOK_HOLD">Book Title Material Holds</option>
              <option value="STUDY_SPACE">Study Cubicle Workspace Selection</option>
              <option value="DISCUSSION_ROOM">Discussion Group Rooms</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {isReservationsLoading ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-[#800020] border-t-transparent rounded-full animate-spin" /> Syncing Space Allocations...
            </div>
          ) : filteredAndTypeReservations.length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic">No reservation entries match your current search constraints.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-200 select-none">
                    <th className="p-3.5">Student Account Details</th>
                    <th className="p-3.5">Allocation Type</th>
                    <th className="p-3.5">Target Identifier</th>
                    <th className="p-3.5">Scheduled Timeline Date</th>
                    <th className="p-3.5 text-center">Operational Status Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white font-medium">
                  {filteredAndTypeReservations.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{item.user.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{item.user.studentId || 'Staff Node'}</div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          item.type === 'BOOK_HOLD' ? 'bg-blue-50 text-blue-800' : 'bg-purple-50 text-purple-800'
                        }`}>{item.type.replace('_', ' ')}</span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 font-bold">{item.targetId}</td>
                      <td className="p-3.5 text-slate-500 font-normal">{new Date(item.scheduledFor).toLocaleString()}</td>
                      <td className="p-3.5 text-center">
                        {item.status === 'PENDING' ? (
                          <div className="flex justify-center gap-3 font-bold text-[11px]">
                            <button onClick={() => handleUpdateReservationStatus(item.id, 'FULFILLED')} className="text-emerald-700 hover:underline">Fulfill</button>
                            <button onClick={() => handleUpdateReservationStatus(item.id, 'CANCELLED')} className="text-rose-700 hover:underline">Cancel</button>
                          </div>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide inline-block border ${
                            item.status === 'FULFILLED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            item.status === 'CANCELLED' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>{item.status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showCreateReservationModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
                <div className="bg-[#800020] text-white px-6 py-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Queue Schedule Allocation</h4>
                </div>
                <form onSubmit={handleCreateReservation} className="p-6 space-y-4 text-xs font-medium">
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-bold uppercase tracking-wider">Student Index Identifier</label>
                    <input type="text" required value={resStudentId} onChange={(e) => setResStudentId(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-slate-700 uppercase" placeholder="e.g., KNUST-STU-2026-042" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-bold uppercase tracking-wider">Schedule Category Type</label>
                    <select value={resType} onChange={(e) => setResType(e.target.value as any)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-semibold text-slate-700 cursor-pointer">
                      <option value="BOOK_HOLD">Book Material Hold Request</option>
                      <option value="STUDY_SPACE">Study Cubicle Workspace Selection</option>
                      <option value="DISCUSSION_ROOM">Discussion Group Room Suite</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-bold uppercase tracking-wider">Target Room Number / Book ISBN Target</label>
                    <input type="text" required value={resTargetId} onChange={(e) => setResTargetId(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-slate-700 font-mono" placeholder="e.g., ROOM-402 or 978-0262033848" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-bold uppercase tracking-wider">Target Schedule Date & Timeline hour</label>
                    <input type="datetime-local" required value={resDateTime} onChange={(e) => setResDateTime(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-slate-600 font-semibold cursor-pointer" />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" disabled={isSavingReservation} onClick={() => setShowCreateReservationModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                    <button type="submit" disabled={isSavingReservation} className="px-4 py-2 bg-[#800020] hover:bg-[#66001a] text-white font-bold rounded-xl shadow-sm transition-colors">{isSavingReservation ? 'Scheduling...' : 'Commit Reservation'}</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderFineManagement = () => {
    const filteredFines = fineSearch === '' ? finesList : finesList.filter(fine => {
      const searchStr = fineSearch.toLowerCase();
      return (
        fine.loan.user.fullName.toLowerCase().includes(searchStr) ||
        (fine.loan.user.studentId && fine.loan.user.studentId.toLowerCase().includes(searchStr)) ||
        fine.loan.copy.barcode.toLowerCase().includes(searchStr) ||
        fine.loan.copy.book.title.toLowerCase().includes(searchStr) ||
        fine.loan.loanUuid.toLowerCase().includes(searchStr)
      );
    });

    const filteredAndStatusFines = fineStatusFilter === 'ALL' ? filteredFines : filteredFines.filter(f => f.status === fineStatusFilter);
    const totalUnpaidVolume = finesList.filter(f => f.status === 'UNPAID').reduce((sum, f) => sum + f.amount, 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Outstanding Fines</span>
              <h4 className="text-2xl font-black text-rose-600 mt-0.5">GH¢ {totalUnpaidVolume.toFixed(2)}</h4>
            </div>
            <div className="bg-rose-50 text-rose-600 p-2.5 rounded-xl border border-rose-100"><ShieldAlert className="w-4 h-4" /></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Unpaid Hold Counts</span>
              <h4 className="text-2xl font-black text-slate-900 mt-0.5">{finesList.filter(f => f.status === 'UNPAID').length} Items</h4>
            </div>
            <div className="bg-amber-50 text-amber-700 p-2.5 rounded-xl border border-amber-100"><Coins className="w-4 h-4" /></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Settled Fee Statements</span>
              <h4 className="text-2xl font-black text-emerald-800 mt-0.5">{finesList.filter(f => f.status === 'PAID').length} Settled</h4>
            </div>
            <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl border border-emerald-100"><CheckCircle className="w-4 h-4" /></div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Financial Accounts Desk</h3>
            <p className="text-[11px] text-slate-400 font-medium">Verify MTN Mobile Money or Telecel Cash audit references to drop portal statement blocks</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Search statements by student index, loan UUID, barcode, or book title..." value={fineSearch} onChange={(e) => setFineSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-medium placeholder-slate-400 shadow-sm" />
          </div>
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select value={fineStatusFilter} onChange={(e) => setFineStatusFilter(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-semibold text-slate-600 appearance-none cursor-pointer shadow-sm">
              <option value="ALL">All Financial Statuses</option>
              <option value="UNPAID">Outstanding Fees Balance Only</option>
              <option value="PAID">Settled Clearance Archives</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {isFinesLoading ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-[#800020] border-t-transparent rounded-full animate-spin" /> Syncing Accounts Balance Registers...
            </div>
          ) : filteredAndStatusFines.length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic">No historical fee statement records found matching your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-200 select-none">
                    <th className="p-3.5">Student Account Details</th>
                    <th className="p-3.5">Overdue Fine Item Context</th>
                    <th className="p-3.5">Penalty Charge</th>
                    <th className="p-3.5">Generated Timeline Date</th>
                    <th className="p-3.5 text-center">Operational Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white font-medium">
                  {filteredAndStatusFines.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{item.loan.user.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{item.loan.user.studentId || 'Staff Profile'}</div>
                      </td>
                      <td className="p-3.5 max-w-[220px] truncate">
                        <div className="font-bold text-slate-900">{item.loan.copy.book.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Barcode: {item.loan.copy.barcode}</div>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">GH¢ {item.amount.toFixed(2)}</td>
                      <td className="p-3.5 text-slate-500 font-normal">{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td className="p-3.5 text-center">
                        {item.status === 'UNPAID' ? (
                          <button onClick={() => { setSelectedFineForPayment(item); setShowPaymentModal(true); }} className="bg-[#800020] hover:bg-[#66001a] text-white px-2.5 py-1 rounded font-bold text-[10px] uppercase shadow-sm tracking-wide transition-colors">Verify Payment</button>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold px-3 py-0.5 rounded-full text-[9px] uppercase tracking-wide inline-block">Cleared</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showPaymentModal && selectedFineForPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
                <div className="bg-[#800020] text-white px-6 py-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Process Account Clearance Receipt</h4>
                </div>
                <form onSubmit={handleProcessFinePayment} className="p-6 space-y-4 text-xs font-medium">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between border-b pb-1.5 border-slate-200/60">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">Student Name</span>
                      <span className="font-bold text-slate-800">{selectedFineForPayment.loan.user.fullName}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5 border-slate-200/60">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">Index Number</span>
                      <span className="font-mono text-slate-700 font-bold">{selectedFineForPayment.loan.user.studentId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">Charge Amount Due</span>
                      <span className="font-black text-rose-600 text-sm">GH¢ {selectedFineForPayment.amount.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-bold uppercase tracking-wider">Mobile Money Transaction Reference ID</label>
                    <input type="text" required value={momoReference} onChange={(e) => setMomoReference(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-slate-700 font-mono uppercase" placeholder="e.g., 20485960431" />
                  </div>
                  <div className="text-[11px] text-slate-400 bg-amber-50/40 p-3 rounded-xl border border-amber-200/40 flex gap-2">
                    <HelpCircle className="w-4 h-4 text-[#800020] shrink-0 mt-0.5" />
                    <span>Double check payment verification indexes matches the campus automated merchant framework records before committing values.</span>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" disabled={isProcessingPayment} onClick={() => { setShowPaymentModal(false); setSelectedFineForPayment(null); }} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                    <button type="submit" disabled={isProcessingPayment} className="px-4 py-2 bg-[#800020] hover:bg-[#66001a] text-white font-bold rounded-xl shadow-sm transition-colors">{isProcessingPayment ? 'Auditing Reference Node...' : 'Confirm Account Drop Clearance'}</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderDigitalResources = () => {
    const filteredDigital = digitalResources.filter(res => {
      const searchStr = digitalSearch.toLowerCase();
      return (
        res.title.toLowerCase().includes(searchStr) ||
        res.description.toLowerCase().includes(searchStr) ||
        res.category.toLowerCase().includes(searchStr)
      );
    });

    const filteredAndCatDigital = digitalCategoryFilter === 'ALL' ? filteredDigital : filteredDigital.filter(d => d.category === digitalCategoryFilter);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Electronic Directory & Portals</h3>
            <p className="text-[11px] text-slate-400 font-medium">Link external academic journal directories, configure remote proxies, and classify indices</p>
          </div>
          <button onClick={() => setShowAddDigitalModal(true)} className="bg-[#800020] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#66001a] transition-colors flex items-center gap-1.5 shadow-sm self-start sm:self-auto">
            <Plus className="w-4 h-4" /> Attach Repository Link
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Search electronic publications by title, subject, or descriptions..." value={digitalSearch} onChange={(e) => setDigitalSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-medium placeholder-slate-400 shadow-sm" />
          </div>
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select value={digitalCategoryFilter} onChange={(e) => setDigitalCategoryFilter(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-semibold text-slate-600 appearance-none cursor-pointer shadow-sm">
              <option value="ALL">All Electronic Resource Classes</option>
              {uniqueDigitalCategories.map(cat => ( <option key={cat} value={cat}>{cat}</option> ))}
            </select>
          </div>
        </div>

        {isDigitalLoading ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider flex flex-col items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="w-5 h-5 border-2 border-[#800020] border-t-transparent rounded-full animate-spin" /> Stream-Mapping Repository Node Index...
          </div>
        ) : filteredAndCatDigital.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 italic shadow-sm">No virtual asset nodes or online indices match your current query fields.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndCatDigital.map((item) => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-[#800020]/20 transition-all group duration-200">
                <div className="space-y-2.5">
                  <div className="flex justify-between items-start gap-2">
                    <span className="bg-purple-50 text-purple-800 border border-purple-200 font-extrabold text-[9px] uppercase tracking-wide px-2 py-0.5 rounded">{item.category}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${item.requiresAuth ? 'bg-rose-50 text-rose-700 border-rose-200/50' : 'bg-emerald-50 text-emerald-800 border-emerald-200/50'}`}>{item.requiresAuth ? 'Proxy Secured' : 'Open Access'}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm tracking-tight leading-snug group-hover:text-[#800020] transition-colors">{item.title}</h4>
                    <p className="text-slate-400 font-medium text-[11px] line-clamp-3 mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </div>
                <div className="pt-4 border-t mt-4 border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 font-medium">Added {new Date(item.createdAt).toLocaleDateString()}</span>
                  <a href={item.accessUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-[#800020] hover:underline">Launch Link <ExternalLink className="w-3 h-3" /></a>
                </div>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showAddDigitalModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
                <div className="bg-[#800020] text-white px-6 py-4 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Attach Electronic Portal Node</h4>
                </div>
                <form onSubmit={handleCreateDigitalLink} className="p-6 space-y-4 text-xs font-medium">
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-bold uppercase tracking-wider">Resource Node Name Title</label>
                    <input type="text" required value={newDigitalTitle} onChange={(e) => setNewDigitalTitle(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-slate-700" placeholder="e.g., IEEE Xplore Digital Library" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-bold uppercase tracking-wider">Classification Group Domain</label>
                    <input type="text" required value={newDigitalCategory} onChange={(e) => setNewDigitalCategory(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-slate-700" placeholder="e.g., Engineering & Technology" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-bold uppercase tracking-wider">Secure Access Link Proxy URL</label>
                    <input type="url" required value={newDigitalUrl} onChange={(e) => setNewDigitalUrl(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-slate-700 font-mono" placeholder="https://ieeexplore.ieee.org" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-bold uppercase tracking-wider">Detailed Sub-Text Description</label>
                    <textarea required rows={3} value={newDigitalDesc} onChange={(e) => setNewDigitalDescription(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-slate-700 resize-none font-medium leading-relaxed" placeholder="Provide brief scope criteria data contents..." />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <div>
                      <span className="block font-bold text-slate-700">Enforce Institutional Proxy Auth</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Requires valid student login token validation</span>
                    </div>
                    <input type="checkbox" checked={newDigitalAuthRequired} onChange={(e) => setNewDigitalAuthRequired(e.target.checked)} className="w-4 h-4 accent-[#800020] cursor-pointer" />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" disabled={isSavingDigital} onClick={() => setShowAddDigitalModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                    <button type="submit" disabled={isSavingDigital} className="px-4 py-2 bg-[#800020] hover:bg-[#66001a] text-white font-bold rounded-xl shadow-sm transition-colors">{isSavingDigital ? 'Mapping Endpoint...' : 'Publish Digital Node'}</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderReportsAnalytics = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">System Reports & Metrics</h3>
            <p className="text-[11px] text-slate-400 font-medium">Audit campus inventory load limits, checkout intervals, and storage usage</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="relative">
              <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <select value={timeframeFilter} onChange={(e) => setTimeframeFilter(e.target.value)} className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-bold text-slate-600 appearance-none cursor-pointer shadow-sm">
                <option value="7_DAYS">Past 7 Operational Days</option>
                <option value="30_DAYS">Past 30 Days (Current Term)</option>
                <option value="90_DAYS">Past Quarter Academic Term</option>
              </select>
            </div>
            <button onClick={() => alert('Compiling CSV report datasets matrix...')} className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-colors">
              <Download className="w-3.5 h-3.5" /> Export Ledger
            </button>
          </div>
        </div>

        {isAnalyticsLoading ? (
          <div className="p-24 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider flex flex-col items-center justify-center gap-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="w-6 h-6 border-2 border-[#800020] border-t-transparent rounded-full animate-spin" /> Compiling System Statistical Arrays...
          </div>
        ) : !analyticsData ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 italic font-medium shadow-sm">Operational dashboard reporting charts are currently unavailable.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
              <div className="flex items-center gap-2 pb-2 border-b">
                <FileLineChart className="w-4 h-4 text-[#800020]" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Circulation Activity Timeline</h4>
              </div>
              <div className="space-y-3 pt-2">
                {analyticsData.weeklyTrafficTimeline.map((dayRow) => {
                  const maxVal = Math.max(...analyticsData.weeklyTrafficTimeline.map(d => d.checkouts + d.returns), 1);
                  const checkoutWidth = ((dayRow.checkouts / maxVal) * 100).toFixed(0) + '%';
                  const returnWidth = ((dayRow.returns / maxVal) * 100).toFixed(0) + '%';

                  return (
                    <div key={dayRow.day} className="grid grid-cols-12 items-center gap-3 text-[11px] font-semibold text-slate-600">
                      <div className="col-span-2 text-slate-400 uppercase tracking-wider font-bold">{dayRow.day}</div>
                      <div className="col-span-10 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="h-2 bg-[#800020] rounded-full transition-all duration-500" style={{ width: checkoutWidth }} />
                          <span className="text-[10px] text-slate-700 font-bold">{dayRow.checkouts} Out</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 bg-emerald-600 rounded-full transition-all duration-500" style={{ width: returnWidth }} />
                          <span className="text-[10px] text-slate-500 font-bold">{dayRow.returns} In</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 pt-4 border-t border-slate-100 text-[10px] font-bold uppercase tracking-wider justify-end">
                <div className="flex items-center gap-1.5 text-[#800020]"><div className="w-2.5 h-2.5 bg-[#800020] rounded-full" /> Book Checkouts</div>
                <div className="flex items-center gap-1.5 text-emerald-700"><div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" /> Volume Returns</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Clock className="w-4 h-4 text-[#800020]" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Peak Circulation Hours</h4>
              </div>
              <div className="divide-y divide-slate-100 text-xs font-medium">
                {analyticsData.peakCirculationHours.map((hourRow) => (
                  <div key={hourRow.hour} className="flex justify-between items-center py-2.5">
                    <span className="font-mono font-bold text-slate-700">{hourRow.hour === 12 ? '12:00 PM' : hourRow.hour > 12 ? `${hourRow.hour - 12}:00 PM` : `${hourRow.hour}:00 AM`}</span>
                    <div className="flex items-center gap-2.5">
                      <span className="text-slate-400 text-[11px]">{hourRow.count} Actions</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${hourRow.loadLevel === 'CRITICAL' ? 'bg-rose-50 text-rose-800 border-rose-200/50' : hourRow.loadLevel === 'ELEVATED' ? 'bg-amber-50 text-amber-800 border-amber-200/50' : 'bg-slate-50 text-slate-600'}`}>{hourRow.loadLevel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 lg:col-span-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <TrendingUp className="w-4 h-4 text-[#800020]" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Departmental Inventory Load Map</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
                {analyticsData.departmentDistribution.map((dept) => (
                  <div key={dept.category} className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl space-y-1">
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide block truncate">{dept.category}</span>
                    <span className="text-xl font-black text-slate-900 block">{dept.count} Titles</span>
                    <span className="text-[10px] font-medium text-slate-400 block pt-0.5">Physical stack cluster tracking</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAIInsights = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <BrainCircuit className="h-4 w-4 text-[#800020]" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Volume Forecast Query</h3>
        </div>
        <form onSubmit={handleFetchForecast} className="space-y-4 text-xs font-medium">
          <div className="space-y-1">
            <label className="block text-slate-500 font-bold uppercase tracking-wider">Academic Department</label>
            <input type="text" required value={mlCategory} onChange={(e) => setMlCategory(e.target.value)} className="w-full text-slate-700 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020]" placeholder="e.g., Computer Science" />
          </div>
          <div className="space-y-1">
            <label className="block text-slate-500 font-bold uppercase tracking-wider">Course Subject Name</label>
            <input type="text" required value={mlSubject} onChange={(e) => setMlSubject(e.target.value)} className="w-full text-slate-700 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020]" placeholder="e.g., Data Structures" />
          </div>
          <div className="space-y-1">
            <label className="block text-slate-500 font-bold uppercase tracking-wider">Target Academic Window</label>
            <select value={mlMonth} onChange={(e) => setMlMonth(e.target.value)} className="w-full text-slate-600 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-semibold">
              <option value="1">Opening Semester Weeks</option>
              <option value="5">Final Examination Block</option>
              <option value="10">Mid-Semester Assessment Weeks</option>
            </select>
          </div>
          <button type="submit" disabled={isMlLoading || !mlCategory || !mlSubject} className="w-full bg-[#800020] hover:bg-[#66001a] text-white font-bold py-2.5 rounded-xl text-[10px] uppercase pt-3 shadow-sm transition-colors">
            {isMlLoading ? 'Running calculations...' : 'Calculate Expected Demand'}
          </button>
        </form>
      </div>

      <div className="lg:col-span-2">
        <AnimatePresence mode="wait">
          {forecast !== null ? (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2 shadow-sm">
              <span className="text-xs font-bold text-amber-800 tracking-wider uppercase block bg-amber-50 border border-amber-200 py-1 px-3 w-fit mx-auto rounded-md">Calculation Output</span>
              <h4 className="text-sm font-bold text-slate-500 pt-2">Projected checkout demand for requested period:</h4>
              <span className="text-4xl font-black text-[#800020] block">{forecast} Copies Required</span>
            </motion.div>
          ) : mlError ? (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-xs text-rose-800 font-medium flex items-start gap-2 shadow-sm">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{mlError}</span>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 italic font-medium shadow-sm">Enter target parameters on the left pane to compute expected catalog loading workloads.</div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const renderAuditLogs = () => {
    const filteredAudits = auditLogsList.filter(log => {
      const searchStr = auditSearch.toLowerCase();
      return (
        log.action.toLowerCase().includes(searchStr) ||
        log.description.toLowerCase().includes(searchStr) ||
        (log.user && log.user.fullName.toLowerCase().includes(searchStr))
      );
    });

    const filteredAndActionAudits = auditActionFilter === 'ALL' ? filteredAudits : filteredAudits.filter(a => a.action === auditActionFilter);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Security Logger & Audits</h3>
            <p className="text-[11px] text-slate-400 font-medium">Immutable trace entries capture administrative mutations, token overrides, and database calls</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Search traces by operator name, description tags, or context keywords..." value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-medium placeholder-slate-400 shadow-sm" />
          </div>
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select value={auditActionFilter} onChange={(e) => setAuditActionFilter(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-semibold text-slate-600 appearance-none cursor-pointer shadow-sm">
              <option value="ALL">All Recorded Administrative Actions</option>
              {uniqueAuditActions.map(act => ( <option key={act} value={act}>{act.replace(/_/g, ' ')}</option> ))}
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {isAuditLoading ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-[#800020] border-t-transparent rounded-full animate-spin" /> Stream-Mapping System Trace Logs...
            </div>
          ) : filteredAndActionAudits.length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic">No historical audit line traces match your query guidelines.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-200 select-none">
                    <th className="p-3.5">System Action Label</th>
                    <th className="p-3.5">Operational Event Details</th>
                    <th className="p-3.5">Active Operator Profile</th>
                    <th className="p-3.5">IP Node Origin</th>
                    <th className="p-3.5">Execution Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white font-medium">
                  {filteredAndActionAudits.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-3.5 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          log.action.includes('DELETE') || log.action.includes('SUSPEND') ? 'bg-rose-50 text-rose-800 border border-rose-200/40' :
                          log.action.includes('REGISTER') || log.action.includes('PAYMENT') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/40' : 'bg-slate-100 text-slate-700 border border-slate-200/40'
                        }`}>{log.action}</span>
                      </td>
                      <td className="p-3.5 max-w-[320px] text-slate-800 leading-normal font-medium">{log.description}</td>
                      <td className="p-3.5">{log.user ? ( <> <div className="font-bold text-slate-900">{log.user.fullName}</div> <div className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">{log.user.role}</div> </> ) : ( <span className="text-slate-400 italic font-normal">System Internal Node</span> )}</td>
                      <td className="p-3.5 font-mono text-slate-500 font-semibold">{log.ipAddress || '127.0.0.1'}</td>
                      <td className="p-3.5 text-slate-400 font-semibold text-[11px]">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSystemConfiguration = () => {
    const fineSettings = configList.filter(c => c.key.includes('FINE') || c.key.includes('PENALTY'));
    const limitSettings = configList.filter(c => c.key.includes('LIMIT') || c.key.includes('MAX') || c.key.includes('DURATION'));
    const securitySettings = configList.filter(c => !c.key.includes('FINE') && !c.key.includes('PENALTY') && !c.key.includes('LIMIT') && !c.key.includes('MAX') && !c.key.includes('DURATION'));

    return (
      <form onSubmit={handleUpdateSystemConfiguration} className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Portal Engine Variables</h3>
            <p className="text-[11px] text-slate-400 font-medium">Fine-tune global operational constraints, daily fine variables, and circulation limits</p>
          </div>
          <button type="submit" disabled={isSavingConfig || configList.length === 0} className="bg-[#800020] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#66001a] transition-colors flex items-center gap-1.5 shadow-sm">
            <Save className="w-4 h-4" /> {isSavingConfig ? 'Committing Keys...' : 'Save Configuration Changes'}
          </button>
        </div>

        {isConfigLoading ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider flex flex-col items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="w-5 h-5 border-2 border-[#800020] border-t-transparent rounded-full animate-spin" /> Fetching Current Registry Keys...
          </div>
        ) : configList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 italic shadow-sm">
            No system variables currently registered inside the database parameters table.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-medium">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Coins className="w-4 h-4 text-[#800020]" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Circulation Penalty Matrices</h4>
              </div>
              <div className="space-y-4">
                {fineSettings.map(item => (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <label className="text-slate-600 font-bold uppercase tracking-wide text-[10px]">{item.key.replace(/_/g, ' ')}</label>
                      <span className="text-[10px] text-slate-400 max-w-[60%] text-right font-normal leading-tight">{item.description}</span>
                    </div>
                    <input type="text" value={configChanges[item.key] || ''} onChange={(e) => handleConfigInputChange(item.key, e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-mono text-slate-800 font-bold" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Settings className="w-4 h-4 text-[#800020]" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Baseline Operational Thresholds</h4>
              </div>
              <div className="space-y-4">
                {limitSettings.map(item => (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <label className="text-slate-600 font-bold uppercase tracking-wide text-[10px]">{item.key.replace(/_/g, ' ')}</label>
                      <span className="text-[10px] text-slate-400 max-w-[60%] text-right font-normal leading-tight">{item.description}</span>
                    </div>
                    <input type="text" value={configChanges[item.key] || ''} onChange={(e) => handleConfigInputChange(item.key, e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-mono text-slate-800 font-bold" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:col-span-2">
              <div className="flex items-center gap-2 pb-2 border-b">
                <ShieldCheck className="w-4 h-4 text-[#800020]" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Infrastructure & Security Keys</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {securitySettings.map(item => (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <label className="text-slate-600 font-bold uppercase tracking-wide text-[10px]">{item.key.replace(/_/g, ' ')}</label>
                      <span className="text-[10px] text-slate-400 max-w-[60%] text-right font-normal leading-tight">{item.description}</span>
                    </div>
                    <input type="text" value={configChanges[item.key] || ''} onChange={(e) => handleConfigInputChange(item.key, e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-mono text-slate-800 font-bold" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </form>
    );
  };

  const renderBackupMaintenance = () => {
    const filteredBackups = backupFilter === 'ALL' ? backupsList : backupsList.filter(b => b.type === backupFilter);
    const totalBackupSize = backupsList.reduce((sum, b) => sum + b.sizeBytes, 0);
    const successCount = backupsList.filter(b => b.status === 'SUCCESS').length;
    const failedCount = backupsList.filter(b => b.status === 'FAILED').length;
    const totalDbSize = dbHealth.reduce((sum, t) => sum + t.sizeBytes, 0);
    const totalIndexSize = dbHealth.reduce((sum, t) => sum + t.indexSizeBytes, 0);
    const totalRows = dbHealth.reduce((sum, t) => sum + t.rowCount, 0);

    return (
      <div className="space-y-6">
        {/* System Health Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-medium">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Database Connection</span>
              <span className={`text-sm font-black block mt-0.5 ${systemHealth?.databaseStatus === 'CONNECTED' ? 'text-emerald-700' : systemHealth?.databaseStatus === 'DEGRADED' ? 'text-amber-700' : 'text-rose-700'}`}>
                {systemHealth?.databaseStatus || 'Unknown'}
              </span>
            </div>
            <div className={`p-2 rounded-lg ${systemHealth?.databaseStatus === 'CONNECTED' ? 'bg-emerald-50 text-emerald-700' : systemHealth?.databaseStatus === 'DEGRADED' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
              {systemHealth?.databaseStatus === 'CONNECTED' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">API Response Latency</span>
              <span className="text-xl font-black text-slate-900 block mt-0.5">{systemHealth?.apiLatencyMs ?? '--'} ms</span>
            </div>
            <div className="bg-blue-50 text-blue-700 p-2 rounded-lg"><Zap className="w-4 h-4" /></div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Server Uptime</span>
              <span className="text-xl font-black text-slate-900 block mt-0.5">{systemHealth?.uptimeHours ?? '--'} hrs</span>
            </div>
            <div className="bg-purple-50 text-purple-700 p-2 rounded-lg"><Clock className="w-4 h-4" /></div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Disk Utilization</span>
              <span className={`text-xl font-black block mt-0.5 ${(systemHealth?.diskUsagePercent ?? 0) > 85 ? 'text-rose-700' : (systemHealth?.diskUsagePercent ?? 0) > 70 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {systemHealth?.diskUsagePercent ?? '--'}%
              </span>
            </div>
            <div className={`p-2 rounded-lg ${(systemHealth?.diskUsagePercent ?? 0) > 85 ? 'bg-rose-50 text-rose-700' : (systemHealth?.diskUsagePercent ?? 0) > 70 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Maintenance Mode Toggle + Actions */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Database Snapshot & Recovery</h3>
            <p className="text-[11px] text-slate-400 font-medium">Execute manual backups, restore historical snapshots, and monitor storage health</p>
          </div>
          <div className="flex gap-3 text-xs font-bold">
            <button onClick={handleCreateBackup} disabled={isCreatingBackup} className="bg-[#800020] text-white px-4 py-2 rounded-xl hover:bg-[#66001a] transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50">
              <Archive className="w-4 h-4" /> {isCreatingBackup ? 'Snapshotting...' : 'Create Backup'}
            </button>
            <button onClick={handleToggleMaintenanceMode} disabled={isTogglingMaintenance} className={`px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors ${maintenanceMode ? 'bg-emerald-800 hover:bg-emerald-900 text-white' : 'bg-amber-700 hover:bg-amber-800 text-white'}`}>
              <ToggleLeft className="w-4 h-4" /> {isTogglingMaintenance ? 'Toggling...' : maintenanceMode ? 'Disable Maintenance' : 'Enable Maintenance'}
            </button>
          </div>
        </div>

        {/* Backup Archive Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between p-5 pb-0">
              <div className="flex items-center gap-2">
                <DatabaseBackup className="w-4 h-4 text-[#800020]" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Backup Archive Ledger</h4>
              </div>
              <div className="relative text-xs">
                <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                <select value={backupFilter} onChange={(e) => setBackupFilter(e.target.value)} className="pl-8 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#800020] font-semibold text-slate-600 appearance-none cursor-pointer">
                  <option value="ALL">All Snapshots</option>
                  <option value="MANUAL">Manual Only</option>
                  <option value="AUTOMATED">Automated Only</option>
                </select>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mx-5 mb-5">
              {isBackupLoading ? (
                <div className="p-12 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-[#800020] border-t-transparent rounded-full animate-spin" /> Loading Backup Snapshots...
                </div>
              ) : filteredBackups.length === 0 ? (
                <div className="p-12 text-center text-slate-400 italic">No backup snapshots found in the recovery vault.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-200 select-none">
                        <th className="p-3.5">Snapshot Filename</th>
                        <th className="p-3.5">Archive Size</th>
                        <th className="p-3.5">Type</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Created</th>
                        <th className="p-3.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 bg-white font-medium">
                      {filteredBackups.map((backup) => (
                        <tr key={backup.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-3.5 font-mono text-slate-800 font-bold">{backup.filename}</td>
                          <td className="p-3.5 text-slate-600">{formatBytes(backup.sizeBytes)}</td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${backup.type === 'MANUAL' ? 'bg-blue-50 text-blue-800 border-blue-200/40' : 'bg-slate-100 text-slate-700 border-slate-200/40'}`}>
                              {backup.type}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide inline-block border ${
                              backup.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              backup.status === 'FAILED' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>{backup.status}</span>
                          </td>
                          <td className="p-3.5 text-slate-500 font-normal">{new Date(backup.createdAt).toLocaleString()}</td>
                          <td className="p-3.5 text-center">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => { setSelectedBackupForRestore(backup); setShowRestoreModal(true); }} className="text-[#800020] hover:underline font-bold text-[10px] uppercase tracking-wide">Restore</button>
                              <button onClick={() => handleDeleteBackup(backup.id)} className="text-rose-600 hover:underline font-bold text-[10px] uppercase tracking-wide">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Backup Summary Footer */}
            <div className="grid grid-cols-3 gap-4 px-5 pb-5 text-xs">
              <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-center">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide block">Total Archive Size</span>
                <span className="text-lg font-black text-slate-900 block mt-0.5">{formatBytes(totalBackupSize)}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200/40 p-3 rounded-xl text-center">
                <span className="text-emerald-600 font-bold uppercase text-[9px] tracking-wide block">Successful Snapshots</span>
                <span className="text-lg font-black text-emerald-800 block mt-0.5">{successCount}</span>
              </div>
              <div className="bg-rose-50 border border-rose-200/40 p-3 rounded-xl text-center">
                <span className="text-rose-600 font-bold uppercase text-[9px] tracking-wide block">Failed Snapshots</span>
                <span className="text-lg font-black text-rose-800 block mt-0.5">{failedCount}</span>
              </div>
            </div>
          </div>

          {/* Database Health Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 p-5 pb-0">
              <Server className="w-4 h-4 text-[#800020]" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Database Table Diagnostics</h4>
            </div>

            {isDbHealthLoading ? (
              <div className="p-8 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider flex flex-col items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-[#800020] border-t-transparent rounded-full animate-spin" /> Scanning Table Indices...
              </div>
            ) : dbHealth.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic text-xs">No database health telemetry available.</div>
            ) : (
              <div className="space-y-3 px-5 pb-5">
                {dbHealth.map((table) => (
                  <div key={table.tableName} className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-[11px] font-mono">{table.tableName}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{table.rowCount.toLocaleString()} rows</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Table Size</span>
                        <span className="font-bold text-slate-700">{formatBytes(table.sizeBytes)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Index Size</span>
                        <span className="font-bold text-slate-700">{formatBytes(table.indexSizeBytes)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Last Vacuumed</span>
                        <span className="font-bold text-slate-700">{table.lastVacuumed ? new Date(table.lastVacuumed).toLocaleDateString() : 'Never'}</span>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Total Data Size</span>
                    <span className="text-slate-800">{formatBytes(totalDbSize)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Total Index Size</span>
                    <span className="text-slate-800">{formatBytes(totalIndexSize)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Total Rows Tracked</span>
                    <span className="text-slate-800">{totalRows.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Restore Confirmation Modal */}
        <AnimatePresence>
          {showRestoreModal && selectedBackupForRestore && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
                <div className="bg-rose-800 text-white px-6 py-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Confirm Database Restore</h4>
                </div>
                <form onSubmit={handleRestoreBackup} className="p-6 space-y-4 text-xs font-medium">
                  <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 space-y-2">
                    <div className="flex justify-between border-b pb-1.5 border-rose-200/60">
                      <span className="text-rose-400 font-bold uppercase text-[9px] tracking-wide">Target Snapshot</span>
                      <span className="font-mono font-bold text-rose-900">{selectedBackupForRestore.filename}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5 border-rose-200/60">
                      <span className="text-rose-400 font-bold uppercase text-[9px] tracking-wide">Archive Size</span>
                      <span className="font-bold text-rose-800">{formatBytes(selectedBackupForRestore.sizeBytes)}</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span className="text-rose-400 font-bold uppercase text-[9px] tracking-wide">Created At</span>
                      <span className="font-bold text-rose-800">{new Date(selectedBackupForRestore.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-rose-700 bg-rose-50/60 p-3 rounded-xl border border-rose-200/50 flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span><strong>WARNING:</strong> Restoring from this backup will overwrite all current data. Active loans, user accounts, and recent transactions will be rolled back to the snapshot state. This action cannot be undone.</span>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" disabled={isRestoringBackup} onClick={() => { setShowRestoreModal(false); setSelectedBackupForRestore(null); }} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                    <button type="submit" disabled={isRestoringBackup} className="px-4 py-2 bg-rose-800 hover:bg-rose-900 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5">
                      {isRestoringBackup ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Restoring...</> : <><RefreshCw className="w-3.5 h-3.5" /> Execute Restore</>}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderActiveWorkspace = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboardOverview();
      case 'users': return renderUserManagement();
      case 'inventory': return renderBookInventory();
      case 'borrowing': return renderBorrowingManagement();
      case 'reservations': return renderReservationManagement();
      case 'fines': return renderFineManagement();
      case 'digital': return renderDigitalResources();
      case 'analytics': return renderReportsAnalytics();
      case 'ai': return renderAIInsights();
      case 'audit': return renderAuditLogs();
      case 'config': return renderSystemConfiguration();
      case 'backup': return renderBackupMaintenance();
      default: return renderDashboardOverview();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 font-sans antialiased">

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#800020] text-white flex flex-col justify-between shadow-xl shrink-0 border-r border-black/10">
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="px-6 py-5 border-b border-white/10 bg-[#66001a]/40 flex items-center gap-3 shrink-0">
            <div className="h-9 w-9 rounded-xl bg-amber-400 flex items-center justify-center font-black text-lg text-[#800020] shadow-sm">K</div>
            <div>
              <h1 className="text-xs font-black tracking-wider uppercase text-white">KNUST Library</h1>
              <p className="text-[10px] text-amber-300 font-bold tracking-widest uppercase mt-0.5">Admin Portal</p>
            </div>
          </div>
          <nav className="px-3 pt-5 space-y-0.5 flex-1">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 text-xs font-bold rounded-xl transition-all text-left border ${
                    isSelected ? 'bg-amber-400 text-[#800020] border-amber-400 shadow-sm' : 'text-slate-200 border-transparent hover:bg-white/5'
                  }`}
                >
                  <IconComponent className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="p-3 border-t border-white/10 bg-[#66001a]/20 shrink-0">
          <button onClick={() => confirm('Log out of the admin panel?') && logout()} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-amber-300 hover:text-white rounded-xl text-left transition-colors">
            <LogOut className="h-4 w-4 shrink-0" /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame Container Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm shrink-0">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">{menuItems.find(m => m.id === activeTab)?.label}</h2>
            <p className="text-xs text-slate-400 font-medium">Control console for live campus library metrics and workflows</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-[#800020]" />
            <span>{user?.fullName || 'Staff User'}</span>
          </div>
        </header>

        <main className="p-6 md:p-8 space-y-8 w-full max-w-[1500px] mx-auto flex-1">
          {renderActiveWorkspace()}
        </main>
      </div>

    </div>
  );
};
