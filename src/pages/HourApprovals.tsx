import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Clock, FileText, ChevronDown, ChevronUp, MessageSquare, Sparkles, Loader2 } from 'lucide-react';
import { getPendingSubmissions, approveSubmission, rejectSubmission } from '@/lib/db';
import { StudentHourSubmissionWithStudent } from '@/types';
import { useToast } from '@/components/Toast';
import { Modal, FormField, Textarea } from '@/components';
import { generateText } from '@/lib/ai';

type TabType = 'pending' | 'approved' | 'rejected';

export default function HourApprovalsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<StudentHourSubmissionWithStudent[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackAction, setFeedbackAction] = useState<'approve' | 'reject'>('approve');
  const [selectedSubmission, setSelectedSubmission] = useState<StudentHourSubmissionWithStudent | null>(null);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);
  const [aiReviewing, setAiReviewing] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<{
    action: 'approve' | 'reject' | 'review';
    reason: string;
    suggestedFeedback: string;
  } | null>(null);

  // Generate AI review of submission
  const handleAIReview = async () => {
    if (!selectedSubmission) return;

    setAiReviewing(true);
    setAiRecommendation(null);

    try {
      const prompt = `As a nursing clinical instructor, review this student hour submission and provide a recommendation.

Student: ${selectedSubmission.studentName}
Date: ${format(new Date(selectedSubmission.date), 'MMMM d, yyyy')}
Site: ${selectedSubmission.siteName}
Hours Claimed: ${selectedSubmission.hours} hours (${selectedSubmission.startTime} - ${selectedSubmission.endTime})
Activities: ${selectedSubmission.activities || 'Not provided'}
${selectedSubmission.skillsPracticed ? `Skills Practiced: ${selectedSubmission.skillsPracticed}` : ''}
${selectedSubmission.reflection ? `Student Reflection: "${selectedSubmission.reflection}"` : 'No reflection provided'}

Analyze this submission for:
1. Completeness (all required information provided?)
2. Reasonableness (hours claimed match activities described?)
3. Professional documentation (appropriate language and detail?)
4. Educational value (learning opportunities identified?)

Respond in this exact JSON format:
{
  "action": "approve" or "reject" or "review",
  "reason": "One sentence explaining your recommendation",
  "suggestedFeedback": "2-3 sentences of constructive feedback for the student"
}

Only output the JSON, no other text.`;

      const response = await generateText({ prompt });

      // Parse the AI response
      try {
        // Clean the response - remove markdown code blocks if present
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(cleanResponse);
        setAiRecommendation({
          action: parsed.action || 'review',
          reason: parsed.reason || 'Unable to determine recommendation',
          suggestedFeedback: parsed.suggestedFeedback || ''
        });

        // Auto-fill feedback if none exists
        if (!feedback && parsed.suggestedFeedback) {
          setFeedback(parsed.suggestedFeedback);
        }

        toast.success('AI Review Complete', 'Review the recommendation below');
      } catch {
        // If JSON parsing fails, extract what we can
        setAiRecommendation({
          action: 'review',
          reason: 'Manual review recommended',
          suggestedFeedback: response.substring(0, 300)
        });
      }
    } catch (error) {
      console.error('AI review failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('API key')) {
        toast.error('API Key Required', 'Please configure your AI API key in Settings');
      } else {
        toast.error('AI Review Failed', 'Unable to generate review. Please review manually.');
      }
    } finally {
      setAiReviewing(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const data = await getPendingSubmissions();
      setSubmissions(data);
    } catch (e) {
      console.error('Failed to load submissions:', e);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (submission: StudentHourSubmissionWithStudent) => {
    setSelectedSubmission(submission);
    setFeedbackAction('approve');
    setFeedback('');
    setAiRecommendation(null);
    setShowFeedbackModal(true);
  };

  const handleReject = (submission: StudentHourSubmissionWithStudent) => {
    setSelectedSubmission(submission);
    setFeedbackAction('reject');
    setFeedback('');
    setAiRecommendation(null);
    setShowFeedbackModal(true);
  };

  const handleCloseModal = () => {
    setShowFeedbackModal(false);
    setAiRecommendation(null);
  };

  const handleSubmitFeedback = async () => {
    if (!selectedSubmission) return;

    if (feedbackAction === 'reject' && !feedback.trim()) {
      toast.error('Feedback required', 'Please provide feedback when rejecting a submission.');
      return;
    }

    setProcessing(true);
    try {
      if (feedbackAction === 'approve') {
        await approveSubmission(selectedSubmission.id, feedback || undefined);
        toast.success('Hours Approved', `${selectedSubmission.hours} hours approved for ${selectedSubmission.studentName}`);
      } else {
        await rejectSubmission(selectedSubmission.id, feedback);
        toast.error('Hours Rejected', `Submission rejected for ${selectedSubmission.studentName}`);
      }
      setShowFeedbackModal(false);
      loadSubmissions();
    } catch (e) {
      console.error('Failed to process submission:', e);
      toast.error('Failed to process', 'Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Filter submissions by tab
  const filteredSubmissions = submissions.filter(s => {
    if (activeTab === 'pending') return s.status === 'pending';
    if (activeTab === 'approved') return s.status === 'approved';
    if (activeTab === 'rejected') return s.status === 'rejected';
    return true;
  });

  // Stats
  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length;
  const totalPendingHours = submissions
    .filter(s => s.status === 'pending')
    .reduce((sum, s) => sum + s.hours, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-linear-to-br from-orange-600 to-amber-600 rounded-2xl shadow-lg">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black bg-linear-to-r from-gray-900 via-orange-900 to-amber-900 bg-clip-text text-transparent mb-1">
              Hour Approvals
            </h1>
            <p className="text-gray-600 text-lg font-medium">Review and approve student clinical hour submissions</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-yellow-600">{pendingCount}</div>
                <div className="text-xs text-gray-500">Pending Review</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-orange-600">{totalPendingHours}h</div>
                <div className="text-xs text-gray-500">Hours Pending</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-green-600">{approvedCount}</div>
                <div className="text-xs text-gray-500">Approved</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-red-600">{rejectedCount}</div>
                <div className="text-xs text-gray-500">Rejected</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'pending'
                ? 'bg-white text-yellow-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'approved'
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'rejected'
                ? 'bg-white text-red-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {filteredSubmissions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No {activeTab} submissions</p>
          </div>
        ) : (
          filteredSubmissions.map(submission => (
            <div key={submission.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Main Row */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{submission.studentName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        submission.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        submission.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {submission.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400 text-xs uppercase">Date</div>
                        <div className="font-medium">{format(new Date(submission.date), 'MMM d, yyyy')}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs uppercase">Site</div>
                        <div className="font-medium">{submission.siteName}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs uppercase">Time</div>
                        <div className="font-medium">{submission.startTime} - {submission.endTime}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs uppercase">Hours</div>
                        <div className="font-bold text-indigo-600">{submission.hours}h</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {submission.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(submission)}
                          className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleReject(submission)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {expandedId === submission.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === submission.id && (
                <div className="border-t border-gray-100 p-6 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Activities Performed</h4>
                      <p className="text-gray-700">{submission.activities || 'No activities recorded'}</p>
                    </div>
                    {submission.skillsPracticed && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Skills Practiced</h4>
                        <p className="text-gray-700">{submission.skillsPracticed}</p>
                      </div>
                    )}
                    {submission.reflection && (
                      <div className="md:col-span-2">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Student Reflection</h4>
                        <p className="text-gray-700 italic">&ldquo;{submission.reflection}&rdquo;</p>
                      </div>
                    )}
                    {submission.reviewerFeedback && (
                      <div className="md:col-span-2">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Reviewer Feedback</h4>
                        <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                          <MessageSquare className="w-4 h-4 text-indigo-500 mt-0.5" />
                          <p className="text-gray-700">{submission.reviewerFeedback}</p>
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      Submitted: {format(new Date(submission.submittedAt), 'MMM d, yyyy h:mm a')}
                      {submission.reviewedAt && (
                        <> • Reviewed: {format(new Date(submission.reviewedAt), 'MMM d, yyyy h:mm a')}</>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Feedback Modal */}
      <Modal
        isOpen={showFeedbackModal}
        onClose={handleCloseModal}
        title={feedbackAction === 'approve' ? 'Approve Hours' : 'Reject Hours'}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
              Cancel
            </button>
            <button
              onClick={handleSubmitFeedback}
              disabled={processing || (feedbackAction === 'reject' && !feedback.trim())}
              className={`px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 ${
                feedbackAction === 'approve'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {processing ? 'Processing...' : feedbackAction === 'approve' ? 'Approve' : 'Reject'}
            </button>
          </div>
        }
      >
        {selectedSubmission && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">
                <strong>{selectedSubmission.studentName}</strong> • {selectedSubmission.siteName} • {selectedSubmission.hours} hours
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {format(new Date(selectedSubmission.date), 'MMMM d, yyyy')}
              </div>
            </div>

            {/* AI Review Section */}
            <div className="border border-indigo-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-indigo-50">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-indigo-700">AI Review Assistant</span>
                </div>
                <button
                  onClick={handleAIReview}
                  disabled={aiReviewing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                  {aiReviewing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Review Submission
                    </>
                  )}
                </button>
              </div>

              {aiRecommendation && (
                <div className="p-4 space-y-3">
                  {/* Recommendation Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">Recommendation:</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                      aiRecommendation.action === 'approve'
                        ? 'bg-green-100 text-green-700'
                        : aiRecommendation.action === 'reject'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {aiRecommendation.action === 'approve' && <CheckCircle2 className="w-3 h-3" />}
                      {aiRecommendation.action === 'reject' && <XCircle className="w-3 h-3" />}
                      {aiRecommendation.action === 'review' && <Clock className="w-3 h-3" />}
                      {aiRecommendation.action.charAt(0).toUpperCase() + aiRecommendation.action.slice(1)}
                    </span>
                  </div>

                  {/* Reason */}
                  <div className="text-sm text-gray-700">
                    {aiRecommendation.reason}
                  </div>

                  {/* Use Suggested Feedback Button */}
                  {aiRecommendation.suggestedFeedback && feedback !== aiRecommendation.suggestedFeedback && (
                    <button
                      onClick={() => setFeedback(aiRecommendation.suggestedFeedback)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                    >
                      Use AI suggested feedback
                    </button>
                  )}
                </div>
              )}

              {!aiRecommendation && !aiReviewing && (
                <div className="p-4 text-center text-sm text-gray-500">
                  Click "Review Submission" to get AI-powered analysis and feedback suggestions
                </div>
              )}
            </div>

            <FormField
              label="Feedback"
              hint={feedbackAction === 'reject' ? 'Required for rejections' : 'Optional'}
              required={feedbackAction === 'reject'}
            >
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                placeholder={feedbackAction === 'approve'
                  ? 'Optional: Add any notes or feedback...'
                  : 'Explain why this submission is being rejected...'}
              />
            </FormField>
          </div>
        )}
      </Modal>
    </div>
  );
}
