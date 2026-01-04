import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Users,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Edit2,
  Trash2,
  Shield,
  Phone,
  Mail,
  Award,
  UserCheck,
  Loader2,
  ChevronDown,
  ChevronUp,
  Building2,
  FileCheck,
  Upload
} from 'lucide-react';
import {
  getPreceptorsWithDetails,
  getPreceptorsNeedingVerification,
  getAllClinicalSites,
  addPreceptor,
  updatePreceptor,
  deletePreceptor,
  verifyPreceptorLicense
} from '@/lib/db';
import { Preceptor, PreceptorWithDetails, PreceptorVerificationAlert, ClinicalSite } from '@/types';
import { useToast } from '@/components/Toast';
import { Skeleton, SkeletonCard } from '@/components/Skeleton';
import { Modal } from '@/components/Modal';
import { FormField, Input, Textarea } from '@/components/FormField';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EvaluationCSVImport } from '@/components/EvaluationCSVImport';
import { clsx } from 'clsx';

const VA_BON_URL = 'https://dhp.virginiainteractive.org/Lookup/Index';

interface PreceptorFormData {
  id: string;
  firstName: string;
  lastName: string;
  credentials: string;
  email: string;
  phone: string;
  siteId: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpirationDate: string;
  specialties: string;
  notes: string;
}

const emptyFormData: PreceptorFormData = {
  id: '',
  firstName: '',
  lastName: '',
  credentials: '',
  email: '',
  phone: '',
  siteId: '',
  licenseNumber: '',
  licenseState: 'VA',
  licenseExpirationDate: '',
  specialties: '',
  notes: ''
};

export default function PreceptorsPage() {
  const [preceptors, setPreceptors] = useState<PreceptorWithDetails[]>([]);
  const [verificationAlerts, setVerificationAlerts] = useState<PreceptorVerificationAlert[]>([]);
  const [sites, setSites] = useState<ClinicalSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPreceptor, setEditingPreceptor] = useState<Preceptor | null>(null);
  const [formData, setFormData] = useState<PreceptorFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [expandedPreceptor, setExpandedPreceptor] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const toast = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [preceptorData, alertsData, sitesData] = await Promise.all([
        getPreceptorsWithDetails(),
        getPreceptorsNeedingVerification(60),
        getAllClinicalSites()
      ]);
      setPreceptors(preceptorData);
      setVerificationAlerts(alertsData);
      setSites(sitesData);
    } catch (error) {
      console.error('Failed to load preceptors:', error);
      toast.error('Failed to Load', 'Could not load preceptor data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPreceptors = useMemo(() => {
    return preceptors.filter(p => {
      const matchesSearch = `${p.firstName} ${p.lastName} ${p.credentials || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (siteFilter !== 'all' && p.siteId !== siteFilter) return false;

      if (statusFilter !== 'all' && p.verificationStatus !== statusFilter) return false;

      return true;
    });
  }, [preceptors, searchTerm, siteFilter, statusFilter]);

  const handleOpenAddModal = () => {
    setFormData(emptyFormData);
    setEditingPreceptor(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (preceptor: PreceptorWithDetails) => {
    setFormData({
      id: preceptor.id,
      firstName: preceptor.firstName,
      lastName: preceptor.lastName,
      credentials: preceptor.credentials || '',
      email: preceptor.email || '',
      phone: preceptor.phone || '',
      siteId: preceptor.siteId || '',
      licenseNumber: preceptor.licenseNumber || '',
      licenseState: preceptor.licenseState || 'VA',
      licenseExpirationDate: preceptor.licenseExpirationDate || '',
      specialties: preceptor.specialties || '',
      notes: preceptor.notes || ''
    });
    setEditingPreceptor(preceptor);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingPreceptor(null);
    setFormData(emptyFormData);
  };

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Validation Error', 'First name and last name are required');
      return;
    }

    setSaving(true);
    try {
      const preceptorData: Preceptor = {
        id: editingPreceptor ? formData.id : `PREC-${Date.now()}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        credentials: formData.credentials || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        siteId: formData.siteId || undefined,
        licenseNumber: formData.licenseNumber || undefined,
        licenseState: formData.licenseState || 'VA',
        licenseExpirationDate: formData.licenseExpirationDate || undefined,
        specialties: formData.specialties || undefined,
        notes: formData.notes || undefined,
        isActive: 1,
        createdAt: editingPreceptor?.createdAt || new Date().toISOString()
      };

      if (editingPreceptor) {
        await updatePreceptor(preceptorData);
        toast.success('Preceptor Updated', `${formData.firstName} ${formData.lastName} has been updated`);
      } else {
        await addPreceptor(preceptorData);
        toast.success('Preceptor Added', `${formData.firstName} ${formData.lastName} has been added`);
      }

      handleCloseModal();
      loadData();
    } catch (error) {
      console.error('Failed to save preceptor:', error);
      toast.error('Save Failed', 'Could not save preceptor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deletePreceptor(deleteConfirm.id);
      toast.success('Preceptor Removed', `${deleteConfirm.name} has been removed`);
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      console.error('Failed to delete preceptor:', error);
      toast.error('Delete Failed', 'Could not remove preceptor');
    }
  };

  const handleVerifyLicense = async (preceptor: PreceptorWithDetails) => {
    setVerifyingId(preceptor.id);
    try {
      await verifyPreceptorLicense(preceptor.id);
      toast.success('License Verified', `${preceptor.firstName} ${preceptor.lastName}'s license has been marked as verified. Next verification due in 1 year.`);
      loadData();
    } catch (error) {
      console.error('Failed to verify license:', error);
      toast.error('Verification Failed', 'Could not mark license as verified');
    } finally {
      setVerifyingId(null);
    }
  };

  const openVABON = () => {
    window.open(VA_BON_URL, '_blank', 'noopener,noreferrer');
  };

  const getStatusBadge = (status: string, daysUntilDue?: number) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
            <CheckCircle className="w-3 h-3" />
            Verified
          </span>
        );
      case 'due_soon':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
            <Clock className="w-3 h-3" />
            Due Soon {daysUntilDue !== undefined && `(${daysUntilDue}d)`}
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
            <AlertTriangle className="w-3 h-3" />
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
            <Shield className="w-3 h-3" />
            Not Verified
          </span>
        );
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = preceptors.length;
    const verified = preceptors.filter(p => p.verificationStatus === 'verified').length;
    const dueSoon = preceptors.filter(p => p.verificationStatus === 'due_soon').length;
    const overdue = preceptors.filter(p => p.verificationStatus === 'overdue').length;
    const notVerified = preceptors.filter(p => p.verificationStatus === 'not_verified').length;

    return { total, verified, dueSoon, overdue, notVerified };
  }, [preceptors]);

  if (loading) {
    return (
      <div className="min-h-screen space-y-8">
        <header className="mb-8">
          <Skeleton variant="rectangular" height={60} width="40%" className="mb-3" />
          <Skeleton variant="text" width="30%" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-linear-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-lg">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black bg-linear-to-r from-gray-900 via-purple-900 to-indigo-900 bg-clip-text text-transparent mb-1">
              Preceptor Directory
            </h1>
            <p className="text-gray-600 text-lg font-medium">Manage clinical preceptors and license verification</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openVABON}
            className="btn btn-outline flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            VA BON Lookup
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="btn btn-outline flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import Evaluations
          </button>
          <button
            onClick={handleOpenAddModal}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Preceptor
          </button>
        </div>
      </header>

      {/* Verification Alerts */}
      {verificationAlerts.length > 0 && (
        <div className="bg-linear-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-black text-gray-900">
                {verificationAlerts.length} Preceptor{verificationAlerts.length !== 1 ? 's' : ''} Need License Verification
              </h2>
              <p className="text-sm text-gray-600">These preceptors require license verification within 60 days</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {verificationAlerts.slice(0, 6).map((alert) => (
              <div
                key={alert.preceptorId}
                className={clsx(
                  'p-3 rounded-xl border-2 flex items-center justify-between',
                  alert.alertLevel === 'overdue' ? 'bg-red-50 border-red-200' :
                  alert.alertLevel === 'critical' ? 'bg-orange-50 border-orange-200' :
                  'bg-yellow-50 border-yellow-200'
                )}
              >
                <div>
                  <div className="font-bold text-gray-900">{alert.preceptorName}</div>
                  <div className="text-xs text-gray-500">{alert.siteName || 'No site assigned'}</div>
                  <div className={clsx(
                    'text-xs font-bold mt-1',
                    alert.alertLevel === 'overdue' ? 'text-red-600' :
                    alert.alertLevel === 'critical' ? 'text-orange-600' :
                    'text-yellow-600'
                  )}>
                    {alert.daysUntilDue < 0 ? `${Math.abs(alert.daysUntilDue)} days overdue` : `${alert.daysUntilDue} days remaining`}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const p = preceptors.find(p => p.id === alert.preceptorId);
                    if (p) handleVerifyLicense(p);
                  }}
                  disabled={verifyingId === alert.preceptorId}
                  className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                  title="Mark as verified"
                >
                  {verifyingId === alert.preceptorId ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  ) : (
                    <FileCheck className="w-4 h-4 text-green-600" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-linear-to-br from-purple-100 to-indigo-200 rounded-xl">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <div className="text-3xl font-black text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500 font-medium">Total Preceptors</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-linear-to-br from-green-100 to-emerald-200 rounded-xl">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <div className="text-3xl font-black text-gray-900">{stats.verified}</div>
            <div className="text-sm text-gray-500 font-medium">Verified</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-linear-to-br from-yellow-100 to-amber-200 rounded-xl">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <div className="text-3xl font-black text-gray-900">{stats.dueSoon}</div>
            <div className="text-sm text-gray-500 font-medium">Due Soon</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-linear-to-br from-red-100 to-rose-200 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <div className="text-3xl font-black text-gray-900">{stats.overdue}</div>
            <div className="text-sm text-gray-500 font-medium">Overdue</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-linear-to-br from-gray-100 to-slate-200 rounded-xl">
            <Shield className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <div className="text-3xl font-black text-gray-900">{stats.notVerified}</div>
            <div className="text-sm text-gray-500 font-medium">Not Verified</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search preceptors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Site Filter */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Sites</option>
              {sites.map(site => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="due_soon">Due Soon</option>
              <option value="overdue">Overdue</option>
              <option value="not_verified">Not Verified</option>
            </select>
          </div>
        </div>
      </div>

      {/* Preceptor List */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        {filteredPreceptors.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Preceptors Found</h3>
            <p className="text-gray-500">
              {preceptors.length === 0
                ? 'Add your first preceptor to get started.'
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredPreceptors.map((preceptor) => {
              const isExpanded = expandedPreceptor === preceptor.id;

              return (
                <div key={preceptor.id} className="bg-white">
                  {/* Main Row */}
                  <div
                    className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedPreceptor(isExpanded ? null : preceptor.id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                        {preceptor.firstName.charAt(0)}{preceptor.lastName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">
                            {preceptor.firstName} {preceptor.lastName}
                          </span>
                          {preceptor.credentials && (
                            <span className="text-sm text-indigo-600 font-medium">
                              {preceptor.credentials}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          {preceptor.siteName && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" />
                              {preceptor.siteName}
                            </span>
                          )}
                          {preceptor.assignedStudentsCount > 0 && (
                            <span className="flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" />
                              {preceptor.assignedStudentsCount} student{preceptor.assignedStudentsCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {getStatusBadge(preceptor.verificationStatus, preceptor.daysUntilDue ?? undefined)}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(preceptor);
                          }}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit preceptor"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ id: preceptor.id, name: `${preceptor.firstName} ${preceptor.lastName}` });
                          }}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove preceptor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                    <div className="px-6 pb-6 bg-gray-50 border-t border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                        {/* Contact Info */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Contact</h4>
                          {preceptor.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <a href={`mailto:${preceptor.email}`} className="text-indigo-600 hover:underline">
                                {preceptor.email}
                              </a>
                            </div>
                          )}
                          {preceptor.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <a href={`tel:${preceptor.phone}`} className="text-indigo-600 hover:underline">
                                {preceptor.phone}
                              </a>
                            </div>
                          )}
                          {preceptor.specialties && (
                            <div className="flex items-start gap-2 text-sm">
                              <Award className="w-4 h-4 text-gray-400 mt-0.5" />
                              <span className="text-gray-700">{preceptor.specialties}</span>
                            </div>
                          )}
                        </div>

                        {/* License Info */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">License</h4>
                          {preceptor.licenseNumber ? (
                            <>
                              <div className="text-sm">
                                <span className="text-gray-500">License #:</span>{' '}
                                <span className="font-medium text-gray-900">{preceptor.licenseNumber}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-500">State:</span>{' '}
                                <span className="font-medium text-gray-900">{preceptor.licenseState || 'VA'}</span>
                              </div>
                              {preceptor.licenseExpirationDate && (
                                <div className="text-sm">
                                  <span className="text-gray-500">Expires:</span>{' '}
                                  <span className="font-medium text-gray-900">
                                    {format(parseISO(preceptor.licenseExpirationDate), 'MMM d, yyyy')}
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No license information on file</p>
                          )}
                        </div>

                        {/* Verification */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Verification</h4>
                          {preceptor.lastVerificationDate ? (
                            <div className="text-sm">
                              <span className="text-gray-500">Last Verified:</span>{' '}
                              <span className="font-medium text-gray-900">
                                {format(parseISO(preceptor.lastVerificationDate), 'MMM d, yyyy')}
                              </span>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">Never verified</p>
                          )}
                          {preceptor.nextVerificationDue && (
                            <div className="text-sm">
                              <span className="text-gray-500">Next Due:</span>{' '}
                              <span className={clsx(
                                'font-medium',
                                preceptor.verificationStatus === 'overdue' ? 'text-red-600' :
                                preceptor.verificationStatus === 'due_soon' ? 'text-yellow-600' :
                                'text-gray-900'
                              )}>
                                {format(parseISO(preceptor.nextVerificationDue), 'MMM d, yyyy')}
                              </span>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => openVABON()}
                              className="btn btn-outline btn-sm flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Lookup License
                            </button>
                            <button
                              onClick={() => handleVerifyLicense(preceptor)}
                              disabled={verifyingId === preceptor.id}
                              className="btn btn-primary btn-sm flex items-center gap-1"
                            >
                              {verifyingId === preceptor.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Mark Verified
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {preceptor.notes && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Notes</h4>
                          <p className="text-sm text-gray-700">{preceptor.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        title={editingPreceptor ? 'Edit Preceptor' : 'Add New Preceptor'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
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
                  {editingPreceptor ? 'Save Changes' : 'Add Preceptor'}
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="First Name" required>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="First name"
                />
              </FormField>
              <FormField label="Last Name" required>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Last name"
                />
              </FormField>
              <FormField label="Credentials">
                <Input
                  value={formData.credentials}
                  onChange={(e) => setFormData(prev => ({ ...prev, credentials: e.target.value }))}
                  placeholder="e.g., RN, BSN, MSN"
                />
              </FormField>
              <FormField label="Clinical Site">
                <select
                  value={formData.siteId}
                  onChange={(e) => setFormData(prev => ({ ...prev, siteId: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select a site...</option>
                  {sites.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Email">
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </FormField>
              <FormField label="Phone">
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </FormField>
            </div>
          </div>

          {/* License Info */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">License Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="License Number">
                <Input
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                  placeholder="RN license number"
                />
              </FormField>
              <FormField label="License State">
                <select
                  value={formData.licenseState}
                  onChange={(e) => setFormData(prev => ({ ...prev, licenseState: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                >
                  <option value="VA">Virginia (VA)</option>
                  <option value="DC">District of Columbia (DC)</option>
                  <option value="MD">Maryland (MD)</option>
                  <option value="NC">North Carolina (NC)</option>
                  <option value="WV">West Virginia (WV)</option>
                </select>
              </FormField>
              <FormField label="License Expiration">
                <Input
                  type="date"
                  value={formData.licenseExpirationDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, licenseExpirationDate: e.target.value }))}
                />
              </FormField>
            </div>
          </div>

          {/* Additional Info */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Additional Information</h3>
            <div className="space-y-4">
              <FormField label="Specialties">
                <Input
                  value={formData.specialties}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialties: e.target.value }))}
                  placeholder="e.g., ICU, Emergency, Pediatrics"
                />
              </FormField>
              <FormField label="Notes">
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </FormField>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Remove Preceptor"
        message={`Are you sure you want to remove ${deleteConfirm?.name}? This action cannot be undone.`}
        confirmText="Remove"
        variant="danger"
      />

      {/* CSV Import Modal */}
      <EvaluationCSVImport
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => {
          toast.success('Evaluations imported successfully');
          loadData();
        }}
      />
    </div>
  );
}
