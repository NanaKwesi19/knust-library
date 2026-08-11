import React from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';
import { Card, CardHeader, CardTitle } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonCard } from '../../ui/Skeleton';
import { StatSparkline } from '../../charts/StatSparkline';
import { TrendingUp, TrendingDown, Globe, MousePointer, Award } from 'lucide-react';

interface ResourceStat {
  resourceId: number;
  title: string;
  category: string;
  clickCount: number;
  weeklyTrend: number[];
}

interface AccessSummary {
  totalClicks: number;
  uniqueResourcesAccessed: number;
  topCategory: string;
  weeklyGrowth: number;
  dailyClicks: number[];
}

export const ResourceAccessStats: React.FC = () => {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['resourceStats'],
    queryFn: async () => {
      const res = await API.get('/resources/stats');
      return res.data;
    },
  });

  const { data: topResourcesData } = useQuery({
    queryKey: ['topResources'],
    queryFn: async () => {
      const res = await API.get('/resources/top?limit=5');
      return res.data;
    },
  });

  const summary: AccessSummary | null = statsData?.data;
  const topResources: ResourceStat[] = topResourcesData?.data || [];

  if (statsLoading) {
    return <SkeletonCard />;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Clicks</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {summary ? summary.totalClicks.toLocaleString() : '-'}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <MousePointer className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          {summary && (
            <div className="flex items-center gap-1 mt-2 text-[10px] font-bold">
              {summary.weeklyGrowth >= 0 ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +{summary.weeklyGrowth}%
                </span>
              ) : (
                <span className="text-rose-600 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  {summary.weeklyGrowth}%
                </span>
              )}
              <span className="text-slate-400 font-medium">from last week</span>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resources Used</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {summary ? summary.uniqueResourcesAccessed : '-'}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
              <Globe className="w-4 h-4 text-purple-500" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top Category</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {summary ? summary.topCategory.replace('_', ' ') : '-'}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Award className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Daily Activity Sparkline */}
      {summary?.dailyClicks && summary.dailyClicks.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-bold text-slate-800">Daily Activity</div>
              <div className="text-[10px] text-slate-400">Clicks over the last 7 days</div>
            </div>
            <Badge variant="info" size="sm" dot>Live</Badge>
          </div>
          <StatSparkline data={summary.dailyClicks} color="#7A1C2C" height={80} />
        </Card>
      )}

      {/* Top Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600" />
            Most Accessed Resources
          </CardTitle>
        </CardHeader>

        {topResources.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Resource access data will appear here once students start using the links."
            icon="search"
          />
        ) : (
          <div className="space-y-3 px-5 pb-5">
            {topResources.map((resource, index) => (
              <div
                key={resource.resourceId}
                className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-[#7A1C2C] flex items-center justify-center text-white text-[10px] font-black shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{resource.title}</div>
                    <div className="text-[10px] text-slate-400">{resource.category.replace('_', ' ')}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-slate-800">{resource.clickCount.toLocaleString()}</div>
                  <div className="text-[9px] text-slate-400">clicks</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};