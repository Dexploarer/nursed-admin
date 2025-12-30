
import { useState } from 'react';
import { useInstructor } from './InstructorProvider';
import { User, Rocket, CheckCircle, ArrowRight } from 'lucide-react';

export function OnboardingWizard() {
  const { isSetup, updateProfile } = useInstructor();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    credentials: 'RN',
    institution: 'Page County Tech Center',
  });

  // Don't show wizard if profile is already set up
  if (isSetup) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleComplete = () => {
    updateProfile(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {step === 1 && (
          <div className="p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 bg-indigo-100 rounded-full">
                <Rocket className="w-12 h-12 text-indigo-600" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
              Welcome to NursEd Admin!
            </h2>
            <p className="text-center text-gray-600 mb-8">
              Your comprehensive nursing program management system for VBON compliance and student success tracking.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900">Track Clinical Hours</div>
                  <div className="text-sm text-gray-600">Monitor 400-hour direct care requirement with VBON compliance</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900">Skills Competency Ledger</div>
                  <div className="text-sm text-gray-600">Document student competencies for state board audits</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900">AI-Powered Tools</div>
                  <div className="text-sm text-gray-600">NCLEX predictor, curriculum mapping, and instructor assistant</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full btn btn-primary flex items-center justify-center gap-2"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-bold text-gray-900">Set Up Your Profile</h2>
            </div>
            <p className="text-gray-600 mb-6">
              This information will be used for PDF reports and personalization.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="jane.smith@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credentials
                </label>
                <input
                  type="text"
                  name="credentials"
                  value={formData.credentials}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="RN, MSN"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Institution
                </label>
                <input
                  type="text"
                  name="institution"
                  value={formData.institution}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="Page County Tech Center"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={!formData.firstName || !formData.lastName || !formData.email}
                className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Complete Setup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
