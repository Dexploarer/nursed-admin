import { useState, useEffect } from 'react';
import { useInstructor } from '@/components/InstructorProvider';
import {
  User, Save, Loader2, Award, Clock, Plus, Trash2,
  AlertTriangle, FileText, ExternalLink,
  Calendar, Upload
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/Tabs';
import { CertificationDocUpload } from '@/components/TauriFileUpload';
import {
  getAllInstructorCertifications,
  addInstructorCertification,
  updateInstructorCertification,
  deleteInstructorCertification,
  getInstructorCertificationAlerts,
  getAllCompHoursEarned,
  addCompHoursEarned,
  deleteCompHoursEarned,
  getAllCompHoursUsed,
  addCompHoursUsed,
  deleteCompHoursUsed,
  getCompHoursSummary,
  getCompHoursExpirationWarnings
} from '@/lib/db';
import type {
  InstructorCertification,
  InstructorCertificationAlert,
  CompHoursEarned,
  CompHoursUsed,
  CompHoursSummary,
  CompHoursExpirationWarning
} from '@/types';

// Activity type options for earning comp hours
const ACTIVITY_TYPES = [
  'Curriculum planning',
  'Parent meeting',
  'Weekend training',
  'After-hours work',
  'Professional development',
  'Committee work',
  'Student advising',
  'Clinical coordination',
  'Other'
];

// Reason options for using comp hours
const USAGE_REASONS = [
  'Left early',
  'Sick day',
  'Personal day',
  'Appointment',
  'Family emergency',
  'Other'
];

// Certification type options
const CERT_TYPES = [
  { value: 'BLS', label: 'BLS (Basic Life Support)', alertDays: 60 },
  { value: 'RN_LICENSE', label: 'RN License', alertDays: 90 },
  { value: 'CPR', label: 'CPR Certification', alertDays: 60 },
  { value: 'OTHER', label: 'Other Certification', alertDays: 60 }
];

export default function ProfilePage() {
  const { profile, updateProfile, isSetup } = useInstructor();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const toast = useToast();

  // Profile form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    credentials: 'RN',
    institution: 'Page County Tech Center',
    phoneNumber: '',
  });

  // Certifications state
  const [certifications, setCertifications] = useState<InstructorCertification[]>([]);
  const [certAlerts, setCertAlerts] = useState<InstructorCertificationAlert[]>([]);
  const [showCertModal, setShowCertModal] = useState(false);
  const [editingCert, setEditingCert] = useState<InstructorCertification | null>(null);

  // Comp hours state
  const [compEarned, setCompEarned] = useState<CompHoursEarned[]>([]);
  const [compUsed, setCompUsed] = useState<CompHoursUsed[]>([]);
  const [compSummary, setCompSummary] = useState<CompHoursSummary | null>(null);
  const [expirationWarnings, setExpirationWarnings] = useState<CompHoursExpirationWarning[]>([]);
  const [showEarnModal, setShowEarnModal] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);

  useEffect(() => {
    setFormData({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      email: profile.email || '',
      credentials: profile.credentials || 'RN',
      institution: profile.institution || 'Page County Tech Center',
      phoneNumber: profile.phoneNumber || '',
    });
  }, [profile]);

  useEffect(() => {
    loadCertifications();
    loadCompHours();
  }, []);

  const loadCertifications = async () => {
    try {
      const [certs, alerts] = await Promise.all([
        getAllInstructorCertifications(),
        getInstructorCertificationAlerts()
      ]);
      setCertifications(certs);
      setCertAlerts(alerts);
    } catch (error) {
      console.error('Failed to load certifications:', error);
    }
  };

  const loadCompHours = async () => {
    try {
      const [earned, used, summary, warnings] = await Promise.all([
        getAllCompHoursEarned(),
        getAllCompHoursUsed(),
        getCompHoursSummary(),
        getCompHoursExpirationWarnings()
      ]);
      setCompEarned(earned);
      setCompUsed(used);
      setCompSummary(summary);
      setExpirationWarnings(warnings);
    } catch (error) {
      console.error('Failed to load comp hours:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateProfile(formData);
      toast.success('Profile Saved', 'Your profile has been updated.');
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Save Failed', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Certification handlers
  const handleSaveCertification = async (cert: InstructorCertification) => {
    try {
      if (editingCert) {
        await updateInstructorCertification(cert);
        toast.success('Certification Updated', 'Your certification has been updated.');
      } else {
        await addInstructorCertification(cert);
        toast.success('Certification Added', 'Your certification has been added.');
      }
      setShowCertModal(false);
      setEditingCert(null);
      loadCertifications();
    } catch (error) {
      console.error('Failed to save certification:', error);
      toast.error('Save Failed', 'Failed to save certification.');
    }
  };

  const handleDeleteCertification = async (id: string) => {
    if (!confirm('Are you sure you want to delete this certification?')) return;
    try {
      await deleteInstructorCertification(id);
      toast.success('Certification Deleted', 'The certification has been removed.');
      loadCertifications();
    } catch (error) {
      console.error('Failed to delete certification:', error);
      toast.error('Delete Failed', 'Failed to delete certification.');
    }
  };

  // Comp hours handlers
  const handleAddEarned = async (entry: CompHoursEarned) => {
    try {
      await addCompHoursEarned(entry);
      toast.success('Hours Logged', `${entry.hours} comp hours added to your balance.`);
      setShowEarnModal(false);
      loadCompHours();
    } catch (error) {
      console.error('Failed to add comp hours:', error);
      toast.error('Failed', 'Failed to log comp hours.');
    }
  };

  const handleAddUsed = async (entry: CompHoursUsed) => {
    try {
      await addCompHoursUsed(entry);
      toast.success('Hours Deducted', `${entry.hours} comp hours deducted from your balance.`);
      setShowUseModal(false);
      loadCompHours();
    } catch (error) {
      console.error('Failed to use comp hours:', error);
      toast.error('Failed', 'Failed to deduct comp hours.');
    }
  };

  const handleDeleteEarned = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await deleteCompHoursEarned(id);
      loadCompHours();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleDeleteUsed = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await deleteCompHoursUsed(id);
      loadCompHours();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'expired':
      case 'red':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'critical':
      case 'yellow':
        return 'bg-amber-100 border-amber-300 text-amber-800';
      case 'warning':
      case 'green':
      default:
        return 'bg-green-100 border-green-300 text-green-800';
    }
  };

  return (
    <div className="container p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-linear-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black bg-linear-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-1">
              Instructor Profile
            </h1>
            <p className="text-gray-600 text-lg font-medium">
              {isSetup ? 'Manage your profile, credentials, and comp hours' : 'Set up your instructor profile to get started'}
            </p>
          </div>
        </div>
      </header>

      {!isSetup && (
        <div className="card p-4 mb-6 bg-blue-50 border-l-4 border-blue-500">
          <p className="text-sm text-blue-800">
            <strong>Welcome to NursEd Admin!</strong> Please complete your profile to personalize the application
            and enable PDF report generation with your credentials.
          </p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" icon={<User className="w-4 h-4" />}>Profile</TabsTrigger>
          <TabsTrigger value="credentials" icon={<Award className="w-4 h-4" />}>Credentials</TabsTrigger>
          <TabsTrigger value="comphours" icon={<Clock className="w-4 h-4" />}>Comp Hours</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
        <form onSubmit={handleSubmit} className="card p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                placeholder="Jane"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                placeholder="Smith"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              placeholder="jane.smith@pagecountytech.edu"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="credentials" className="block text-sm font-medium text-gray-700 mb-2">
                Credentials
              </label>
              <input
                type="text"
                id="credentials"
                name="credentials"
                value={formData.credentials}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                placeholder="RN, MSN"
              />
              <p className="text-xs text-gray-500 mt-1">e.g., RN, MSN, BSN</p>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                placeholder="(540) 555-1234"
              />
            </div>
          </div>

          <div>
            <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-2">
              Institution
            </label>
            <input
              type="text"
              id="institution"
              name="institution"
              value={formData.institution}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              placeholder="Page County Tech Center"
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Profile
                </>
              )}
            </button>
          </div>
        </form>
        </TabsContent>

        {/* Credentials Tab */}
        <TabsContent value="credentials">
        {/* Alerts Section */}
        {certAlerts.length > 0 && (
          <div className="mb-6 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Credential Alerts
            </h3>
            {certAlerts.map(alert => (
              <div
                key={alert.certification.id}
                className={`p-3 rounded-lg border ${getAlertColor(alert.alertLevel)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {alert.alertLevel === 'expired' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                    <span className="font-medium">{alert.certification.certificationName}</span>
                  </div>
                  <span className="text-sm">
                    {alert.daysUntilExpiry < 0
                      ? `Expired ${Math.abs(alert.daysUntilExpiry)} days ago`
                      : `Expires in ${alert.daysUntilExpiry} days`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Your Certifications</h3>
            <button
              onClick={() => {
                setEditingCert(null);
                setShowCertModal(true);
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Certification
            </button>
          </div>

          {certifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Award className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No certifications added yet.</p>
              <p className="text-sm">Add your BLS, RN License, and other certifications to track expirations.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {certifications.map(cert => {
                const daysUntil = Math.ceil(
                  (new Date(cert.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                const isExpired = daysUntil < 0;
                const isExpiringSoon = daysUntil >= 0 && daysUntil <= cert.alertDays;

                return (
                  <div
                    key={cert.id}
                    className={`p-4 rounded-lg border ${
                      isExpired
                        ? 'border-red-200 bg-red-50'
                        : isExpiringSoon
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{cert.certificationName}</h4>
                          {isExpired ? (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-200 text-red-800 rounded">
                              Expired
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="px-2 py-0.5 text-xs font-medium bg-amber-200 text-amber-800 rounded">
                              Expiring Soon
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-200 text-green-800 rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-600 space-y-1">
                          {cert.licenseNumber && (
                            <p>License #: <span className="font-mono">{cert.licenseNumber}</span></p>
                          )}
                          {cert.issuingAuthority && <p>Issuer: {cert.issuingAuthority}</p>}
                          <p className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                            {!isExpired && (
                              <span className="text-gray-500">
                                ({daysUntil} days)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {cert.documentPath && (
                          <button
                            onClick={() => window.open(cert.documentPath, '_blank')}
                            className="p-2 text-gray-500 hover:text-blue-600"
                            title="View Document"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingCert(cert);
                            setShowCertModal(true);
                          }}
                          className="p-2 text-gray-500 hover:text-indigo-600"
                          title="Edit"
                        >
                          <Award className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCertification(cert.id)}
                          className="p-2 text-gray-500 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200">
            <a
              href="https://dhp.virginiainteractive.org/Lookup/Index"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Virginia Board of Nursing License Verification
            </a>
          </div>
        </div>
        </TabsContent>

        {/* Comp Hours Tab */}
        <TabsContent value="comphours">
        {/* Balance Widget */}
        <div className="card p-6 mb-6 bg-linear-to-br from-indigo-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Available Comp Hours</p>
              <p className="text-5xl font-black">
                {compSummary?.balance.toFixed(1) || '0.0'}
              </p>
              <p className="text-indigo-200 text-sm mt-1">
                {compSummary?.earnedThisYear.toFixed(1) || '0'} earned / {compSummary?.usedThisYear.toFixed(1) || '0'} used this year
              </p>
            </div>
            <Clock className="w-16 h-16 text-indigo-200" />
          </div>
        </div>

        {/* Expiration Warnings */}
        {expirationWarnings.length > 0 && (
          <div className="mb-6 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Hours Expiring Soon
            </h3>
            {expirationWarnings.map((warning, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${getAlertColor(warning.alertLevel)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{warning.hours} hours</span>
                  <span className="text-sm">
                    Expires on {new Date(warning.expirationDate).toLocaleDateString()} ({warning.daysUntilExpiry} days)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Earn Hours */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-600" />
                Earn Hours
              </h3>
              <button
                onClick={() => setShowEarnModal(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Log Hours
              </button>
            </div>

            {compEarned.length === 0 ? (
              <p className="text-center py-4 text-gray-500">No hours logged yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {compEarned.slice(0, 10).map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{entry.activityType}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.date).toLocaleDateString()}
                        {entry.notes && ` - ${entry.notes}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-600">+{entry.hours}h</span>
                      <button
                        onClick={() => handleDeleteEarned(entry.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Use Hours */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Use Hours
              </h3>
              <button
                onClick={() => setShowUseModal(true)}
                className="btn btn-outline flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Deduct Hours
              </button>
            </div>

            {compUsed.length === 0 ? (
              <p className="text-center py-4 text-gray-500">No hours used yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {compUsed.slice(0, 10).map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{entry.reason}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.date).toLocaleDateString()}
                        {entry.notes && ` - ${entry.notes}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-orange-600">-{entry.hours}h</span>
                      <button
                        onClick={() => handleDeleteUsed(entry.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 card p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{compSummary?.totalEarned.toFixed(1) || '0'}</p>
              <p className="text-xs text-gray-600">Total Earned</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{compSummary?.totalUsed.toFixed(1) || '0'}</p>
              <p className="text-xs text-gray-600">Total Used</p>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <p className="text-2xl font-bold text-indigo-600">{compSummary?.balance.toFixed(1) || '0'}</p>
              <p className="text-xs text-gray-600">Current Balance</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-600">{compSummary?.expiringSoon.toFixed(1) || '0'}</p>
              <p className="text-xs text-gray-600">Expiring Soon</p>
            </div>
          </div>
        </div>
        </TabsContent>
      </Tabs>

      {/* Certification Modal */}
      <CertificationModal
        isOpen={showCertModal}
        onClose={() => {
          setShowCertModal(false);
          setEditingCert(null);
        }}
        onSave={handleSaveCertification}
        certification={editingCert}
      />

      {/* Earn Hours Modal */}
      <EarnHoursModal
        isOpen={showEarnModal}
        onClose={() => setShowEarnModal(false)}
        onSave={handleAddEarned}
      />

      {/* Use Hours Modal */}
      <UseHoursModal
        isOpen={showUseModal}
        onClose={() => setShowUseModal(false)}
        onSave={handleAddUsed}
      />
    </div>
  );
}

// Certification Modal Component
function CertificationModal({
  isOpen,
  onClose,
  onSave,
  certification
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cert: InstructorCertification) => void;
  certification: InstructorCertification | null;
}) {
  const [formData, setFormData] = useState({
    certificationType: 'BLS' as 'BLS' | 'RN_LICENSE' | 'CPR' | 'OTHER',
    certificationName: '',
    licenseNumber: '',
    issuingAuthority: '',
    issueDate: '',
    expiryDate: '',
    alertDays: 60,
    notes: '',
    documentPath: ''
  });

  useEffect(() => {
    if (certification) {
      setFormData({
        certificationType: certification.certificationType,
        certificationName: certification.certificationName,
        licenseNumber: certification.licenseNumber || '',
        issuingAuthority: certification.issuingAuthority || '',
        issueDate: certification.issueDate || '',
        expiryDate: certification.expiryDate,
        alertDays: certification.alertDays,
        notes: certification.notes || '',
        documentPath: certification.documentPath || ''
      });
    } else {
      setFormData({
        certificationType: 'BLS',
        certificationName: '',
        licenseNumber: '',
        issuingAuthority: '',
        issueDate: '',
        expiryDate: '',
        alertDays: 60,
        notes: '',
        documentPath: ''
      });
    }
  }, [certification, isOpen]);

  const handleTypeChange = (type: string) => {
    const certType = CERT_TYPES.find(t => t.value === type);
    setFormData(prev => ({
      ...prev,
      certificationType: type as any,
      certificationName: certType?.label || '',
      alertDays: certType?.alertDays || 60
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const cert: InstructorCertification = {
      id: certification?.id || `CERT-${Date.now()}`,
      ...formData,
      documentPath: formData.documentPath || undefined,
      status: 'Active',
      createdAt: certification?.createdAt || now,
      updatedAt: now
    };
    onSave(cert);
  };

  const handleDocumentUpload = (filePath: string) => {
    setFormData(prev => ({ ...prev, documentPath: filePath }));
  };

  const handleDocumentDelete = () => {
    setFormData(prev => ({ ...prev, documentPath: '' }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={certification ? 'Edit Certification' : 'Add Certification'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Certification Type
          </label>
          <select
            value={formData.certificationType}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            {CERT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Certification Name
          </label>
          <input
            type="text"
            value={formData.certificationName}
            onChange={(e) => setFormData(prev => ({ ...prev, certificationName: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License/Cert Number
            </label>
            <input
              type="text"
              value={formData.licenseNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issuing Authority
            </label>
            <input
              type="text"
              value={formData.issuingAuthority}
              onChange={(e) => setFormData(prev => ({ ...prev, issuingAuthority: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="e.g., AHA, VA BON"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issue Date
            </label>
            <input
              type="date"
              value={formData.issueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiration Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alert Days Before Expiry
          </label>
          <input
            type="number"
            value={formData.alertDays}
            onChange={(e) => setFormData(prev => ({ ...prev, alertDays: parseInt(e.target.value) || 60 }))}
            min="1"
            max="365"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.certificationType === 'RN_LICENSE' ? 'Recommended: 90 days for RN license' : 'Recommended: 60 days'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
            placeholder="Optional notes"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Supporting Document
            </div>
          </label>
          <CertificationDocUpload
            certId={certification?.id || `CERT-${Date.now()}`}
            currentDocPath={formData.documentPath || undefined}
            onUpload={handleDocumentUpload}
            onDelete={handleDocumentDelete}
            resourceType="instructor_certs"
          />
          <p className="text-xs text-gray-500 mt-2">
            Upload a scan or photo of your certification (PDF or image)
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-outline">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {certification ? 'Update' : 'Add'} Certification
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Earn Hours Modal Component
function EarnHoursModal({
  isOpen,
  onClose,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: CompHoursEarned) => void;
}) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    activityType: 'Curriculum planning',
    hours: 1,
    notes: '',
    expirationDate: ''
  });

  useEffect(() => {
    if (isOpen) {
      // Default expiration to end of fiscal year (June 30)
      const now = new Date();
      const year = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
      const defaultExpiry = `${year}-06-30`;

      setFormData({
        date: new Date().toISOString().split('T')[0],
        activityType: 'Curriculum planning',
        hours: 1,
        notes: '',
        expirationDate: defaultExpiry
      });
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: CompHoursEarned = {
      id: `EARN-${Date.now()}`,
      date: formData.date,
      activityType: formData.activityType,
      hours: formData.hours,
      notes: formData.notes || undefined,
      expirationDate: formData.expirationDate || undefined,
      createdAt: new Date().toISOString()
    };
    onSave(entry);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Comp Hours" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
          <select
            value={formData.activityType}
            onChange={(e) => setFormData(prev => ({ ...prev, activityType: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            {ACTIVITY_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hours Earned</label>
          <input
            type="number"
            value={formData.hours}
            onChange={(e) => setFormData(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
            min="0.5"
            step="0.5"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expiration Date
            <span className="text-gray-500 font-normal"> (optional)</span>
          </label>
          <input
            type="date"
            value={formData.expirationDate}
            onChange={(e) => setFormData(prev => ({ ...prev, expirationDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <p className="text-xs text-gray-500 mt-1">Usually end of fiscal year (June 30)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
            placeholder="Optional description"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
          <button type="submit" className="btn btn-primary">Log Hours</button>
        </div>
      </form>
    </Modal>
  );
}

// Use Hours Modal Component
function UseHoursModal({
  isOpen,
  onClose,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: CompHoursUsed) => void;
}) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reason: 'Left early',
    hours: 1,
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        reason: 'Left early',
        hours: 1,
        notes: ''
      });
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: CompHoursUsed = {
      id: `USE-${Date.now()}`,
      date: formData.date,
      hours: formData.hours,
      reason: formData.reason,
      notes: formData.notes || undefined,
      createdAt: new Date().toISOString()
    };
    onSave(entry);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Use Comp Hours" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
          <select
            value={formData.reason}
            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            {USAGE_REASONS.map(reason => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hours Used</label>
          <input
            type="number"
            value={formData.hours}
            onChange={(e) => setFormData(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
            min="0.5"
            step="0.5"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
            placeholder="Optional description"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
          <button type="submit" className="btn btn-primary">Deduct Hours</button>
        </div>
      </form>
    </Modal>
  );
}
