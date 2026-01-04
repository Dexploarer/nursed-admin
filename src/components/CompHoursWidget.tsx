import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, TrendingUp, ChevronRight } from 'lucide-react';
import { getCompHoursSummary, getCompHoursExpirationWarnings } from '@/lib/db';
import type { CompHoursSummary, CompHoursExpirationWarning } from '@/types';

export default function CompHoursWidget() {
  const [summary, setSummary] = useState<CompHoursSummary | null>(null);
  const [warnings, setWarnings] = useState<CompHoursExpirationWarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryData, warningsData] = await Promise.all([
        getCompHoursSummary(),
        getCompHoursExpirationWarnings()
      ]);
      setSummary(summaryData);
      setWarnings(warningsData);
    } catch (error) {
      console.error('Failed to load comp hours:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-12 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  // Don't show widget if no comp hours have been tracked
  if (!summary || (summary.totalEarned === 0 && summary.totalUsed === 0)) {
    return null;
  }

  // Find the most urgent warning (closest to expiring)
  const urgentWarning = warnings.find(w => w.alertLevel === 'red') || warnings[0];

  // Determine balance color based on expiration warnings
  const getBalanceColor = () => {
    if (urgentWarning?.alertLevel === 'red') return 'text-red-600';
    if (urgentWarning?.alertLevel === 'yellow') return 'text-amber-600';
    return 'text-indigo-600';
  };

  const getAlertBgColor = (level: string) => {
    switch (level) {
      case 'red': return 'bg-red-50 border-red-200 text-red-800';
      case 'yellow': return 'bg-amber-50 border-amber-200 text-amber-800';
      default: return 'bg-green-50 border-green-200 text-green-800';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-linear-to-r from-indigo-50 to-purple-50 flex justify-between items-center">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          Comp Hours Balance
        </h2>
        <Link
          to="/profile"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          Manage <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Available Balance</p>
            <p className={`text-4xl font-black ${getBalanceColor()}`}>
              {summary.balance.toFixed(1)}
              <span className="text-lg font-medium text-gray-400 ml-1">hours</span>
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="font-medium">+{summary.earnedThisYear.toFixed(1)} this year</span>
            </div>
            <div className="text-sm text-gray-400 mt-1">
              -{summary.usedThisYear.toFixed(1)} used
            </div>
          </div>
        </div>

        {/* Expiration Warning */}
        {urgentWarning && (
          <div className={`p-3 rounded-lg border ${getAlertBgColor(urgentWarning.alertLevel)}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">
                  {urgentWarning.hours} hours expire on{' '}
                  {new Date(urgentWarning.expirationDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
                <p className="text-xs opacity-75">
                  {urgentWarning.daysUntilExpiry} days remaining
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-800">{summary.totalEarned.toFixed(0)}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Earned</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-800">{summary.totalUsed.toFixed(0)}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Used</p>
          </div>
          <div className="text-center p-2 bg-amber-50 rounded-lg">
            <p className="text-lg font-bold text-amber-600">{summary.expiringSoon.toFixed(0)}</p>
            <p className="text-[10px] text-amber-600 uppercase tracking-wide font-medium">Expiring</p>
          </div>
        </div>
      </div>
    </div>
  );
}
