'use client';

import { useState, useEffect } from 'react';
import { useInstructor } from '@/components/InstructorProvider';
import { User, Save, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { profile, updateProfile, isSetup } = useInstructor();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    credentials: 'RN',
    institution: 'Page County Tech Center',
    phoneNumber: '',
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      updateProfile(formData);
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile. Please try again.');
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

  return (
    <div className="container p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="header-title flex items-center gap-2">
          <User className="w-6 h-6 text-indigo-600" />
          Instructor Profile
        </h1>
        <p className="text-muted">
          {isSetup ? 'Update your profile information' : 'Set up your instructor profile to get started'}
        </p>
      </header>

      {!isSetup && (
        <div className="card p-4 mb-6 bg-blue-50 border-l-4 border-blue-500">
          <p className="text-sm text-blue-800">
            <strong>Welcome to NursEd Admin!</strong> Please complete your profile to personalize the application
            and enable PDF report generation with your credentials.
          </p>
        </div>
      )}

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

      <div className="card p-6 mt-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-700">Default Cohort</div>
              <div className="text-sm text-gray-500">{profile.preferences.defaultCohort}</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-700">VBON Compliance Indicators</div>
              <div className="text-sm text-gray-500">
                {profile.preferences.showVBONCompliance ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-700">Auto-save Interval</div>
              <div className="text-sm text-gray-500">Every {profile.preferences.autoSaveInterval} minutes</div>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4 italic">
          Additional preference settings coming soon
        </p>
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <p>
          <strong>Profile Created:</strong> {new Date(profile.createdAt).toLocaleDateString()}
        </p>
        <p>
          <strong>Last Login:</strong> {new Date(profile.lastLogin).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
