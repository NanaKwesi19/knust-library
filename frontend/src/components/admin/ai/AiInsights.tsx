import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { Card, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonCard } from '../../ui/Skeleton';
import { useToast } from '../../../hooks/useToast';
import { StatSparkline } from '../../charts/StatSparkline';
import { BarChart } from '../../charts/BarChart';
import { formatDate, formatNumber, formatCurrency } from '../../../utils/formatters';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Users,
  Search,
  Zap,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Target,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface DemandForecast {
  bookTitle: string;
  isbn: string;
  category: string;
  currentLoans: number;
  predictedDemand: number;
  confidence: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  reason: string;
}

interface PopularSearch {
  term: string;
  count: number;
  category: string;
  trend: number[];
}

interface AiAlert {
  id: number;
  type: 'LOW_STOCK' | 'HIGH_DEMAND' | 'OVERDUE_SPIKE' | 'INACTIVE_USERS' | 'SYSTEM_ANOMALY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  recommendation: string;
  createdAt: string;
  acknowledged: boolean;
}

interface Recommendation {
  bookId: number;
  title: string;
  author: string;
  category: string;
  matchScore: number;
  reason: string;
  targetAudience: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const alertTypeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  LOW_STOCK: { icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  HIGH_DEMAND: { icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  OVERDUE_SPIKE: { icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  INACTIVE_USERS: { icon: Users, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  SYSTEM_ANOMALY: { icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
};

const severityConfig: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-rose-100 text-rose-700',
  CRITICAL: 'bg-red-100 text-red-700 animate-pulse',
};

export default function AiInsights() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'forecasts' | 'searches' | 'alerts' | 'recommendations'>('forecasts');

  // --- QUERIES ---

  const { data: forecastsData, isLoading: forecastsLoading } = useQuery({
    queryKey: ['aiDemandForecasts'],
    queryFn: async () => {
      const res = await API.get('/ai/demand-forecasts');
      return res.data;
    },
    refetchInterval: 300000, // 5 minutes
  });

  const { data: searchesData, isLoading: searchesLoading } = useQuery({
    queryKey: ['aiPopularSearches'],
    queryFn: async () => {
      const res = await API.get('/ai/popular-searches');
      return res.data;
    },
    refetchInterval: 300000,
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['aiAlerts'],
    queryFn: async () => {
      const res = await API.get('/ai/alerts');
      return res.data;
    },
    refetchInterval: 60000, // 1 minute
  });

  const { data: recommendationsData, isLoading: recommendationsLoading } = useQuery({
    queryKey: ['aiRecommendations'],
    queryFn: async () => {
      const res = await API.get('/ai/recommendations');
      return res.data;
    },
    refetchInterval: 300000,
  });

  // --- MUTATIONS ---

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const res = await API.patch(`/ai/alerts/${alertId}/acknowledge`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiAlerts'] });
      addToast({ title: 'Alert Acknowledged', message: 'The alert has been marked as reviewed.', type: 'success', duration: 3000 });
    },
    onError: (error: any) => {
      addToast({ title: 'Error', message: error?.response?.data?.error || 'Could not acknowledge alert.', type: 'error', duration: 5000 });
    },
  });

  const refreshInsightsMutation = useMutation({
    mutationFn: async () => {
      const res = await API.post('/ai/refresh');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiDemandForecasts'] });
      queryClient.invalidateQueries({ queryKey: ['aiPopularSearches'] });
      queryClient.invalidateQueries({ queryKey: ['aiAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['aiRecommendations'] });
      addToast({ title: 'Insights Refreshed', message: 'AI analysis has been updated with latest data.', type: 'success', duration: 3000 });
    },
    onError: (error: any) => {
      addToast({ title: 'Refresh Failed', message: error?.response?.data?.error || 'Could not refresh insights.', type: 'error', duration: 5000 });
    },
  });

  const forecasts: DemandForecast[] = forecastsData?.data || [];
  const searches: PopularSearch[] = searchesData?.data || [];
  const alerts: AiAlert[] = alertsData?.data || [];
  const recommendations: Recommendation[] = recommendationsData?.data || [];

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL' && !a.acknowledged);

  const isLoading = forecastsLoading || searchesLoading || alertsLoading || recommendationsLoading;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" />
            AI Insights
          </h2>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Automated analysis and intelligent recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          {criticalAlerts.length > 0 && (
            <Badge variant="danger" size="sm" dot>
              {criticalAlerts.length} Critical
            </Badge>
          )}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshInsightsMutation.isPending ? 'animate-spin' : ''}`} />}
            onClick={() => refreshInsightsMutation.mutate()}
            isLoading={refreshInsightsMutation.isPending}
          >
            Refresh Analysis
          </Button>
        </div>
      </motion.div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {criticalAlerts.map((alert) => {
            const config = alertTypeConfig[alert.type] || alertTypeConfig.SYSTEM_ANOMALY;
            const Icon = config.icon;
            return (
              <div key={alert.id} className={`p-4 rounded-xl border ${config.bg} flex items-start gap-3`}>
                <div className={`h-8 w-8 rounded-lg bg-white/50 flex items-center justify-center shrink-0 ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{alert.message}</span>
                    <Badge variant="danger" size="sm">CRITICAL</Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{alert.recommendation}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                  isLoading={acknowledgeAlertMutation.isPending}
                >
                  Acknowledge
                </Button>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Tab Navigation */}
      <motion.div variants={itemVariants} className="flex items-center gap-2 border-b border-slate-200">
        {[
          { key: 'forecasts' as const, label: 'Demand Forecasts', icon: TrendingUp },
          { key: 'searches' as const, label: 'Popular Searches', icon: Search },
          { key: 'alerts' as const, label: `Alerts ${unacknowledgedAlerts.length > 0 ? `(${unacknowledgedAlerts.length})` : ''}`, icon: AlertTriangle },
          { key: 'recommendations' as const, label: 'Recommendations', icon: Sparkles },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-[#7A1C2C] text-[#7A1C2C]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          {activeTab === 'forecasts' && <DemandForecastsTab forecasts={forecasts} />}
          {activeTab === 'searches' && <PopularSearchesTab searches={searches} />}
          {activeTab === 'alerts' && <AlertsTab alerts={alerts} onAcknowledge={(id) => acknowledgeAlertMutation.mutate(id)} />}
          {activeTab === 'recommendations' && <RecommendationsTab recommendations={recommendations} />}
        </>
      )}
    </motion.div>
  );
}

// --- SUB-COMPONENTS ---

function DemandForecastsTab({ forecasts }: { forecasts: DemandForecast[] }) {
  if (forecasts.length === 0) {
    return (
      <EmptyState
        title="No forecasts available"
        description="AI demand forecasting will appear here once sufficient circulation data is collected."
        icon="book"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {forecasts.map((forecast) => (
          <Card key={forecast.isbn} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">{forecast.bookTitle}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{forecast.isbn}</div>
                <Badge variant="info" size="sm" className="mt-1.5">{forecast.category}</Badge>
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${
                forecast.trend === 'UP' ? 'text-emerald-600' :
                forecast.trend === 'DOWN' ? 'text-rose-600' :
                'text-slate-500'
              }`}>
                {forecast.trend === 'UP' ? <TrendingUp className="w-3.5 h-3.5" /> :
                 forecast.trend === 'DOWN' ? <TrendingDown className="w-3.5 h-3.5" /> :
                 <Target className="w-3.5 h-3.5" />}
                {forecast.trend}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <div className="text-[9px] text-slate-400 font-bold uppercase">Current</div>
                <div className="text-sm font-black text-slate-800">{forecast.currentLoans}</div>
              </div>
              <div className="p-2.5 bg-purple-50 rounded-lg">
                <div className="text-[9px] text-purple-400 font-bold uppercase">Predicted</div>
                <div className="text-sm font-black text-purple-700">{forecast.predictedDemand}</div>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Confidence</span>
                <span className="font-bold">{forecast.confidence}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-[#7A1C2C]"
                  style={{ width: `${forecast.confidence}%` }}
                />
              </div>
            </div>

            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
              <div className="flex items-start gap-1.5">
                <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-700 leading-relaxed">{forecast.reason}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PopularSearchesTab({ searches }: { searches: PopularSearch[] }) {
  if (searches.length === 0) {
    return (
      <EmptyState
        title="No search data"
        description="Popular search terms will appear here once students start using the search feature."
        icon="search"
      />
    );
  }

  const maxCount = Math.max(...searches.map(s => s.count));

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="text-xs font-bold text-slate-800 mb-4">Search Term Trends</div>
        <div className="space-y-3">
          {searches.map((search) => (
            <div key={search.term} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">{search.term}</span>
                  <Badge variant="info" size="sm">{search.category}</Badge>
                </div>
                <span className="text-xs font-bold text-slate-600">{formatNumber(search.count)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#7A1C2C]"
                    style={{ width: `${(search.count / maxCount) * 100}%` }}
                  />
                </div>
                {search.trend.length > 0 && (
                  <div className="w-24">
                    <StatSparkline data={search.trend} color="#7A1C2C" height={24} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AlertsTab({ alerts, onAcknowledge }: { alerts: AiAlert[]; onAcknowledge: (id: number) => void }) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        title="No alerts"
        description="AI monitoring is active. Alerts will appear here when anomalies are detected."
        icon="alert"
      />
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const config = alertTypeConfig[alert.type] || alertTypeConfig.SYSTEM_ANOMALY;
        const Icon = config.icon;
        return (
          <div
            key={alert.id}
            className={`p-4 rounded-xl border ${alert.acknowledged ? 'bg-slate-50 border-slate-200 opacity-60' : config.bg} transition-all`}
          >
            <div className="flex items-start gap-3">
              <div className={`h-8 w-8 rounded-lg bg-white/50 flex items-center justify-center shrink-0 ${config.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold ${alert.acknowledged ? 'text-slate-500' : 'text-slate-900'}`}>
                    {alert.message}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${severityConfig[alert.severity]}`}>
                    {alert.severity}
                  </span>
                  {alert.acknowledged && (
                    <Badge variant="success" size="sm">Acknowledged</Badge>
                  )}
                </div>
                <p className={`text-[11px] mt-1 ${alert.acknowledged ? 'text-slate-400' : 'text-slate-600'}`}>
                  {alert.recommendation}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[9px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {formatDate(alert.createdAt)}
                  </span>
                  {!alert.acknowledged && (
                    <button
                      onClick={() => onAcknowledge(alert.id)}
                      className="text-[10px] font-bold text-[#7A1C2C] hover:underline flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecommendationsTab({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) {
    return (
      <EmptyState
        title="No recommendations yet"
        description="AI book recommendations will appear here once borrowing patterns are analyzed."
        icon="book"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((rec) => (
          <Card key={rec.bookId} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="h-10 w-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">{rec.title}</div>
                <div className="text-[10px] text-slate-400 truncate">{rec.author}</div>
              </div>
            </div>

            <Badge variant="info" size="sm" className="mt-2">{rec.category}</Badge>

            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Match Score</span>
                <span className="font-bold text-purple-600">{rec.matchScore}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7A1C2C] to-purple-500"
                  style={{ width: `${rec.matchScore}%` }}
                />
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="p-2.5 bg-purple-50 border border-purple-100 rounded-lg">
                <div className="flex items-start gap-1.5">
                  <Sparkles className="w-3 h-3 text-purple-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-purple-700 leading-relaxed">{rec.reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <Users className="w-3 h-3" />
                Recommended for: <span className="font-medium text-slate-700">{rec.targetAudience}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}