'use client';

import { useMemo } from 'react';
import { Student } from '@/types';
import { Trophy, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';

interface NCLEXPredictorProps {
  students: Student[];
}

export default function NCLEXPredictor({ students }: NCLEXPredictorProps) {
  const { cohortScore, passRate, factors } = useMemo(() => {
    if (students.length === 0) {
      return { cohortScore: 0, passRate: 0, factors: [] };
    }

    // Calculate factors
    const avgGPA = students.reduce((sum, s) => sum + (s.gpa || 0), 0) / students.length;
    const avgHoursCompletion = students.reduce((sum, s) => {
      const pct = (s.clinicalHoursCompleted / s.clinicalHoursRequired) * 100;
      return sum + Math.min(pct, 100);
    }, 0) / students.length;
    const avgSkillsComplete = students.reduce((sum, s) => {
      const skills = s.skillsCompleted?.length || 0;
      return sum + (skills / 6) * 100; // 6 core LPN skills
    }, 0) / students.length;
    const atRiskCount = students.filter(s => s.status === 'At Risk').length;
    const atRiskPct = (atRiskCount / students.length) * 100;

    // Calculate composite score (weighted)
    const gpaWeight = 0.35;
    const hoursWeight = 0.25;
    const skillsWeight = 0.25;
    const riskWeight = 0.15;

    const gpaScore = (avgGPA / 4.0) * 100;
    const riskScore = 100 - atRiskPct;

    const compositeScore = Math.round(
      gpaScore * gpaWeight +
      avgHoursCompletion * hoursWeight +
      avgSkillsComplete * skillsWeight +
      riskScore * riskWeight
    );

    // Convert to pass rate estimate (Virginia LPN pass rate ~85% baseline)
    const estimatedPassRate = Math.min(Math.max(compositeScore * 0.95, 65), 98);

    return {
      cohortScore: compositeScore,
      passRate: Math.round(estimatedPassRate),
      factors: [
        { label: 'GPA Factor', value: Math.round(gpaScore), weight: '35%' },
        { label: 'Clinical Hours', value: Math.round(avgHoursCompletion), weight: '25%' },
        { label: 'Skills Mastery', value: Math.round(avgSkillsComplete), weight: '25%' },
        { label: 'At-Risk Index', value: Math.round(riskScore), weight: '15%' },
      ]
    };
  }, [students]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 65) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 65) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="card overflow-hidden border-t-4 border-t-amber-500">
      <div className="p-4 border-b border-gray-100 bg-amber-50/50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-600" />
          NCLEX-PN Readiness Predictor
        </h2>
        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">
          Fall 2025 Cohort
        </span>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Main Score */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className={`w-32 h-32 rounded-full border-8 ${cohortScore >= 80 ? 'border-green-200' : cohortScore >= 65 ? 'border-yellow-200' : 'border-red-200'} flex items-center justify-center`}>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(cohortScore)}`}>
                    {cohortScore}
                  </div>
                  <div className="text-xs text-gray-500 uppercase">Score</div>
                </div>
              </div>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                {cohortScore >= 80 ? (
                  <CheckCircle className="w-8 h-8 text-green-500 bg-white rounded-full" />
                ) : cohortScore >= 65 ? (
                  <TrendingUp className="w-8 h-8 text-yellow-500 bg-white rounded-full" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-red-500 bg-white rounded-full" />
                )}
              </div>
            </div>
            <div className="mt-6 text-center">
              <div className="text-sm text-gray-500">Estimated Pass Rate</div>
              <div className={`text-3xl font-bold ${getScoreColor(passRate)}`}>{passRate}%</div>
              <div className="text-xs text-gray-400 mt-1">Virginia avg: 85%</div>
            </div>
          </div>

          {/* Factor Breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Factor Analysis</h3>
            {factors.map((factor, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{factor.label}</span>
                  <span className="font-medium">
                    <span className={getScoreColor(factor.value)}>{factor.value}%</span>
                    <span className="text-gray-400 text-xs ml-1">({factor.weight})</span>
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${getScoreBg(factor.value)}`} 
                    style={{ width: `${factor.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 italic text-center">
            🎯 Based on GPA, clinical hours completion, skills mastery, and at-risk interventions.
            Higher scores correlate with better NCLEX outcomes.
          </p>
        </div>
      </div>
    </div>
  );
}
