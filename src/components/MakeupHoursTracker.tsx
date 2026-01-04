import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon
} from 'lucide-react';
import { getAllMakeupHoursSummaries, updateMakeupHours, deleteMakeupHours } from '@/lib/db';
import { MakeupHoursSummary, MakeupHours } from '@/types';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { clsx } from 'clsx';

interface MakeupHoursTrackerProps {
  onRefresh?: () => void;
}

export default function MakeupHoursTracker({ onRefresh }: MakeupHoursTrackerProps) {
  const [summaries, setSummaries] = useState<MakeupHoursSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<MakeupHours | null>(null);
  const [hoursToAdd, setHoursToAdd] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllMakeupHoursSummaries();
      setSummaries(data);
    } catch (error) {
      console.error('Failed to load makeup hours:', error);
      toast.error('Failed to Load', 'Could not load makeup hours data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateHours = async () => {
    if (!editingRecord) return;

    setSaving(true);
    try {
      const newCompleted = editingRecord.hoursCompleted + hoursToAdd;
      const isComplete = newCompleted >= editingRecord.hoursOwed;

      await updateMakeupHours({
        ...editingRecord,
        hoursCompleted: Math.min(newCompleted, editingRecord.hoursOwed),
        status: isComplete ? 'completed' : 'in_progress',
        completionDate: isComplete ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString()
      });

      toast.success(
        'Hours Updated',
        `Added ${hoursToAdd} hours. ${isComplete ? 'Makeup complete!' : `${editingRecord.hoursOwed - newCompleted} hours remaining.`}`
      );

      setEditingRecord(null);
      setHoursToAdd(0);
      loadData();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to update hours:', error);
      toast.error('Update Failed', 'Could not update makeup hours');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this makeup hours record?')) return;

    try {
      await deleteMakeupHours(id);
      toast.success('Record Deleted', 'Makeup hours record removed');
      loadData();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to delete record:', error);
      toast.error('Delete Failed', 'Could not delete makeup hours record');
    }
  };

  const getStatusBadge = (status: string, balance: number) => {
    if (status === 'completed' || balance <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
          <CheckCircle className="w-3 h-3" />
          Complete
        </span>
      );
    } else if (status === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
          <Clock className="w-3 h-3" />
          In Progress
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
          <AlertTriangle className="w-3 h-3" />
          Pending
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
        <div className="text-center">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">No Make-Up Hours</h3>
          <p className="text-gray-500">No students currently have makeup hours to complete.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-linear-to-r from-orange-50 to-amber-50 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            Make-Up Hours Tracker
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {summaries.length} student{summaries.length !== 1 ? 's' : ''} with makeup hours
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {summaries.map((summary) => {
            const isExpanded = expandedStudent === summary.studentId;
            const pendingRecords = summary.records.filter(r => r.status !== 'completed');

            return (
              <div key={summary.studentId} className="bg-white">
                {/* Student Summary Row */}
                <div
                  className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedStudent(isExpanded ? null : summary.studentId)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm">
                      {summary.studentName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{summary.studentName}</div>
                      <div className="text-xs text-gray-500">
                        {pendingRecords.length} pending record{pendingRecords.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Hours Summary */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-black text-red-600">{summary.totalHoursOwed}</div>
                        <div className="text-xs text-gray-500">Owed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-black text-green-600">{summary.totalHoursCompleted}</div>
                        <div className="text-xs text-gray-500">Done</div>
                      </div>
                      <div className="text-center">
                        <div className={clsx(
                          'text-lg font-black',
                          summary.balanceRemaining > 0 ? 'text-orange-600' : 'text-green-600'
                        )}>
                          {summary.balanceRemaining}
                        </div>
                        <div className="text-xs text-gray-500">Balance</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-24">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={clsx(
                            'h-2 rounded-full transition-all',
                            summary.balanceRemaining <= 0 ? 'bg-green-500' : 'bg-orange-500'
                          )}
                          style={{ width: `${Math.min(100, (summary.totalHoursCompleted / summary.totalHoursOwed) * 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 text-center mt-1">
                        {Math.round((summary.totalHoursCompleted / summary.totalHoursOwed) * 100)}%
                      </div>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-6 pb-4 bg-gray-50">
                    <div className="space-y-3 mt-2">
                      {summary.records.map((record) => (
                        <div
                          key={record.id}
                          className={clsx(
                            'p-4 rounded-xl border-2',
                            record.status === 'completed'
                              ? 'border-green-200 bg-green-50/50'
                              : 'border-orange-200 bg-white'
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {getStatusBadge(record.status, record.hoursOwed - record.hoursCompleted)}
                                {record.dueDate && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <CalendarIcon className="w-3 h-3" />
                                    Due: {format(parseISO(record.dueDate), 'MMM d, yyyy')}
                                  </span>
                                )}
                              </div>
                              {record.reason && (
                                <p className="text-sm text-gray-600 mb-2">{record.reason}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-gray-500">
                                  <span className="font-bold text-gray-900">{record.hoursCompleted}</span> / {record.hoursOwed} hours
                                </span>
                                <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className={clsx(
                                      'h-1.5 rounded-full',
                                      record.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'
                                    )}
                                    style={{ width: `${Math.min(100, (record.hoursCompleted / record.hoursOwed) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            {record.status !== 'completed' && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingRecord(record);
                                    setHoursToAdd(0);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Log hours"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteRecord(record.id);
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Hours Modal */}
      <Modal
        isOpen={!!editingRecord}
        onClose={() => {
          setEditingRecord(null);
          setHoursToAdd(0);
        }}
        title="Log Make-Up Hours"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setEditingRecord(null);
                setHoursToAdd(0);
              }}
              className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateHours}
              disabled={saving || hoursToAdd <= 0}
              className="btn btn-primary px-6 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Log Hours
                </>
              )}
            </button>
          </div>
        }
      >
        {editingRecord && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-2">Current Progress</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-100 rounded-full h-3">
                  <div
                    className="h-3 bg-orange-500 rounded-full transition-all"
                    style={{ width: `${(editingRecord.hoursCompleted / editingRecord.hoursOwed) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-700">
                  {editingRecord.hoursCompleted} / {editingRecord.hoursOwed} hrs
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {editingRecord.hoursOwed - editingRecord.hoursCompleted} hours remaining
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 block mb-2">Hours to Add</label>
              <input
                type="number"
                min="0.5"
                max={editingRecord.hoursOwed - editingRecord.hoursCompleted}
                step="0.5"
                value={hoursToAdd}
                onChange={(e) => setHoursToAdd(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Max: {editingRecord.hoursOwed - editingRecord.hoursCompleted} hours
              </p>
            </div>

            {hoursToAdd > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  After logging <span className="font-bold">{hoursToAdd}</span> hours:
                </p>
                <p className="text-sm text-blue-700">
                  {editingRecord.hoursCompleted + hoursToAdd >= editingRecord.hoursOwed ? (
                    <span className="font-bold text-green-600">Makeup requirement complete!</span>
                  ) : (
                    <span>
                      <span className="font-bold">{editingRecord.hoursOwed - editingRecord.hoursCompleted - hoursToAdd}</span> hours will remain
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
