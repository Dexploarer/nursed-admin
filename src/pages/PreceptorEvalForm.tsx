import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FormField, Input, Textarea } from '@/components/FormField';
import { Star, CheckCircle, AlertCircle, Loader2, Heart, Stethoscope } from 'lucide-react';
import { clsx } from 'clsx';

interface EvaluationFormData {
  preceptorName: string;
  preceptorEmail: string;
  preceptorTitle: string;
  overallRating: number;
  clinicalSkillsRating: number;
  professionalismRating: number;
  communicationRating: number;
  criticalThinkingRating: number;
  strengths: string;
  areasForImprovement: string;
  additionalComments: string;
  wouldRecommend: boolean | null;
}

interface RatingStarsProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  label?: string;
}

function RatingStars({ value, onChange, max = 5, label }: RatingStarsProps) {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="space-y-2">
      {label && (
        <div className="text-sm font-medium text-gray-700">{label}</div>
      )}
      <div className="flex items-center gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((starValue) => (
          <button
            key={starValue}
            type="button"
            onClick={() => onChange(starValue)}
            onMouseEnter={() => setHoverValue(starValue)}
            onMouseLeave={() => setHoverValue(0)}
            className="focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-full p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={clsx(
                'w-8 h-8 transition-colors',
                (hoverValue || value) >= starValue
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-300'
              )}
            />
          </button>
        ))}
        <span className="ml-3 text-sm text-gray-500">
          {value > 0 ? `${value} / ${max}` : 'Not rated'}
        </span>
      </div>
    </div>
  );
}

export default function PreceptorEvalForm() {
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse URL parameters
  const studentName = searchParams.get('studentName') || 'Unknown Student';
  const studentId = searchParams.get('studentId') || '';
  const clinicalSite = searchParams.get('clinicalSite') || '';
  const clinicalDate = searchParams.get('clinicalDate') || '';
  const logId = searchParams.get('logId') || '';
  const token = searchParams.get('token') || '';

  const [formData, setFormData] = useState<EvaluationFormData>({
    preceptorName: '',
    preceptorEmail: '',
    preceptorTitle: '',
    overallRating: 0,
    clinicalSkillsRating: 0,
    professionalismRating: 0,
    communicationRating: 0,
    criticalThinkingRating: 0,
    strengths: '',
    areasForImprovement: '',
    additionalComments: '',
    wouldRecommend: null
  });

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing evaluation token. Please use the QR code link provided.');
    }
    // In production, validate token expiration and authenticity here
  }, [token]);

  const updateField = <K extends keyof EvaluationFormData>(
    field: K,
    value: EvaluationFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return (
      formData.preceptorName.trim() !== '' &&
      formData.overallRating > 0 &&
      formData.clinicalSkillsRating > 0 &&
      formData.professionalismRating > 0 &&
      formData.communicationRating > 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setSubmitting(true);
    setError(null);

    try {
      // In a real implementation, this would:
      // 1. Send data to a backend API
      // 2. The backend would validate the token
      // 3. Store the evaluation in the database
      // 4. Notify the instructor

      // For now, simulate an API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Log the evaluation data for debugging
      console.log('Evaluation submitted:', {
        studentId,
        logId,
        token,
        ...formData
      });

      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit evaluation:', err);
      setError('Failed to submit evaluation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Error state
  if (error && !submitted) {
    return (
      <div className="min-h-screen bg-linear-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Please contact the nursing program coordinator for a valid evaluation link.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-6">
            Your evaluation for <span className="font-semibold">{studentName}</span> has been submitted successfully.
          </p>
          <p className="text-sm text-gray-500">
            The nursing program coordinator will be notified of your feedback.
          </p>
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Confirmation ID: {token.substring(0, 8)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-indigo-600 to-blue-600 rounded-2xl shadow-lg mb-4">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            Preceptor Evaluation Form
          </h1>
          <p className="text-gray-600">
            Clinical Performance Assessment
          </p>
        </div>

        {/* Student Info Card */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
            Student Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-400 uppercase font-medium">Student Name</div>
              <div className="text-lg font-bold text-gray-900">{studentName}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-medium">Student ID</div>
              <div className="text-lg font-medium text-gray-700">{studentId || 'N/A'}</div>
            </div>
            {clinicalSite && (
              <div>
                <div className="text-xs text-gray-400 uppercase font-medium">Clinical Site</div>
                <div className="text-lg font-medium text-gray-700">{clinicalSite}</div>
              </div>
            )}
            {clinicalDate && (
              <div>
                <div className="text-xs text-gray-400 uppercase font-medium">Clinical Date</div>
                <div className="text-lg font-medium text-gray-700">{clinicalDate}</div>
              </div>
            )}
          </div>
        </div>

        {/* Evaluation Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Preceptor Info */}
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                Your Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Your Name" required>
                  <Input
                    value={formData.preceptorName}
                    onChange={(e) => updateField('preceptorName', e.target.value)}
                    placeholder="e.g., Sarah Johnson, RN"
                    required
                  />
                </FormField>
                <FormField label="Your Title/Credentials">
                  <Input
                    value={formData.preceptorTitle}
                    onChange={(e) => updateField('preceptorTitle', e.target.value)}
                    placeholder="e.g., Charge Nurse, RN, BSN"
                  />
                </FormField>
                <FormField label="Email (Optional)" className="md:col-span-2">
                  <Input
                    type="email"
                    value={formData.preceptorEmail}
                    onChange={(e) => updateField('preceptorEmail', e.target.value)}
                    placeholder="For follow-up questions"
                  />
                </FormField>
              </div>
            </div>

            {/* Performance Ratings */}
            <div className="p-6 border-b border-gray-100 bg-linear-to-br from-gray-50 to-white">
              <h2 className="text-lg font-bold text-gray-800 mb-6">
                Performance Ratings
              </h2>
              <div className="space-y-6">
                <div className="p-4 bg-white rounded-xl border border-gray-100">
                  <RatingStars
                    label="Overall Performance"
                    value={formData.overallRating}
                    onChange={(v) => updateField('overallRating', v)}
                  />
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-100">
                  <RatingStars
                    label="Clinical Skills & Competency"
                    value={formData.clinicalSkillsRating}
                    onChange={(v) => updateField('clinicalSkillsRating', v)}
                  />
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-100">
                  <RatingStars
                    label="Professionalism & Work Ethic"
                    value={formData.professionalismRating}
                    onChange={(v) => updateField('professionalismRating', v)}
                  />
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-100">
                  <RatingStars
                    label="Communication Skills"
                    value={formData.communicationRating}
                    onChange={(v) => updateField('communicationRating', v)}
                  />
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-100">
                  <RatingStars
                    label="Critical Thinking & Problem Solving"
                    value={formData.criticalThinkingRating}
                    onChange={(v) => updateField('criticalThinkingRating', v)}
                  />
                </div>
              </div>
            </div>

            {/* Written Feedback */}
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Written Feedback
              </h2>
              <div className="space-y-4">
                <FormField label="Strengths Observed">
                  <Textarea
                    value={formData.strengths}
                    onChange={(e) => updateField('strengths', e.target.value)}
                    placeholder="What did this student do well? What skills or behaviors stood out positively?"
                    rows={4}
                  />
                </FormField>
                <FormField label="Areas for Improvement">
                  <Textarea
                    value={formData.areasForImprovement}
                    onChange={(e) => updateField('areasForImprovement', e.target.value)}
                    placeholder="What areas could the student focus on improving? Any specific recommendations?"
                    rows={4}
                  />
                </FormField>
                <FormField label="Additional Comments">
                  <Textarea
                    value={formData.additionalComments}
                    onChange={(e) => updateField('additionalComments', e.target.value)}
                    placeholder="Any other observations, concerns, or notes for the nursing program?"
                    rows={3}
                  />
                </FormField>
              </div>
            </div>

            {/* Recommendation */}
            <div className="p-6 border-b border-gray-100 bg-linear-to-br from-indigo-50 to-blue-50">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Overall Recommendation
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Would you recommend this student for future clinical placements?
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => updateField('wouldRecommend', true)}
                  className={clsx(
                    'flex-1 py-4 px-6 rounded-xl font-bold transition-all border-2',
                    formData.wouldRecommend === true
                      ? 'bg-green-600 text-white border-green-600 shadow-lg'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'
                  )}
                >
                  Yes, Recommend
                </button>
                <button
                  type="button"
                  onClick={() => updateField('wouldRecommend', false)}
                  className={clsx(
                    'flex-1 py-4 px-6 rounded-xl font-bold transition-all border-2',
                    formData.wouldRecommend === false
                      ? 'bg-orange-600 text-white border-orange-600 shadow-lg'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
                  )}
                >
                  Needs Improvement
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="p-6 bg-gray-50">
              <button
                type="submit"
                disabled={!isFormValid() || submitting}
                className={clsx(
                  'w-full py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3',
                  isFormValid() && !submitting
                    ? 'bg-linear-to-r from-indigo-600 to-blue-600 text-white shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting Evaluation...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Submit Evaluation
                  </>
                )}
              </button>
              {!isFormValid() && (
                <p className="text-sm text-gray-500 text-center mt-3">
                  Please fill in your name and provide ratings for all categories.
                </p>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-gray-400">
          <p>This evaluation is confidential and will be reviewed by the nursing program coordinator.</p>
          <p className="mt-1">NursED Admin - Clinical Education Management</p>
        </div>
      </div>
    </div>
  );
}
