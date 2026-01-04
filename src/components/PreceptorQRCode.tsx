import { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Student, ClinicalLog } from '@/types';
import { Copy, Download, ExternalLink, Check, QrCode, AlertCircle, Settings } from 'lucide-react';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { Link } from 'react-router-dom';

interface PreceptorQRCodeProps {
  student: Student;
  clinicalLog?: ClinicalLog;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Generates a unique evaluation token for tracking the evaluation request
 */
function generateEvaluationToken(studentId: string, logId?: string): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 8);
  const data = `${studentId}-${logId || 'general'}-${timestamp}-${randomPart}`;
  // In production, this should be encrypted/signed for security
  return btoa(data).replace(/[+/=]/g, (c) =>
    c === '+' ? '-' : c === '/' ? '_' : ''
  );
}

/**
 * Generates a form URL with prefilled student data using the configured Google Form URL
 */
function generateFormUrl(googleFormUrl: string, student: Student, log?: ClinicalLog, token?: string): string {
  if (!googleFormUrl) {
    return ''; // No URL configured
  }

  // Build URL with student info as parameters (preceptor can see this info on the form page)
  const studentInfo = encodeURIComponent(`${student.firstName} ${student.lastName}`);
  const siteInfo = encodeURIComponent(log?.siteName || 'General');
  const dateInfo = log?.date || new Date().toISOString().split('T')[0];

  // Return the form URL with helpful context in the URL
  // The preceptor will manually enter the student name shown on the page
  return `${googleFormUrl}?student=${studentInfo}&site=${siteInfo}&date=${dateInfo}&token=${token || ''}`;
}

export default function PreceptorQRCode({ student, clinicalLog, isOpen, onClose }: PreceptorQRCodeProps) {
  const [copied, setCopied] = useState(false);
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Load Google Form URL from localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem('nursed_google_form_url') || '';
    setGoogleFormUrl(savedUrl);
  }, [isOpen]); // Re-check when modal opens

  // Generate a unique evaluation token/link
  const evaluationToken = generateEvaluationToken(student.id, clinicalLog?.id);
  const formUrl = generateFormUrl(googleFormUrl, student, clinicalLog, evaluationToken);
  const isConfigured = !!googleFormUrl;

  // Calculate expiration date (7 days from now)
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7);
  const formattedExpiration = expirationDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      toast.success('Link Copied', 'Evaluation link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Copy Failed', 'Failed to copy link to clipboard');
    }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    // Create a canvas to convert SVG to PNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `preceptor-eval-qr-${student.firstName}-${student.lastName}-${Date.now()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      toast.success('QR Code Downloaded', 'The QR code has been saved as PNG');
    };
    img.src = url;
  };

  const handleOpenForm = () => {
    window.open(formUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Preceptor Evaluation QR Code" size="md">
      <div className="text-center space-y-6">
        {/* Not Configured Warning */}
        {!isConfigured && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 text-left">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-800 mb-2">Google Form URL Not Configured</h3>
                <p className="text-sm text-amber-700 mb-4">
                  You need to configure a Google Form URL in Settings before QR codes can be generated.
                </p>
                <Link
                  to="/settings"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                >
                  <Settings className="w-4 h-4" />
                  Go to Settings
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Header Info */}
        {isConfigured && (
          <>
            <div className="space-y-2">
              <p className="text-gray-600">
                Have the preceptor scan this QR code to submit their evaluation for:
              </p>

              <div className="font-bold text-xl text-gray-900">
                {student.firstName} {student.lastName}
              </div>

              {clinicalLog && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-lg">
                  <QrCode className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-medium text-indigo-700">
                    {clinicalLog.siteName}
                  </span>
                  <span className="text-sm text-indigo-500">
                    {clinicalLog.date}
                  </span>
                </div>
              )}
            </div>

            {/* QR Code */}
            <div
              ref={qrRef}
              className="bg-white p-8 rounded-2xl border-2 border-gray-200 inline-block shadow-sm"
            >
              <QRCodeSVG
                value={formUrl}
                size={220}
                level="H"
                marginSize={4}
                bgColor="#ffffff"
                fgColor="#1e293b"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-3 flex-wrap">
              <button
                onClick={handleCopyLink}
                className="btn btn-outline flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadQR}
                className="btn btn-outline flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download QR
              </button>
              <button
                onClick={handleOpenForm}
                className="btn btn-primary flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Preview Form
              </button>
            </div>

            {/* Expiration Notice */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                This evaluation link expires on <span className="font-medium">{formattedExpiration}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Token: <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px]">{evaluationToken.substring(0, 12)}...</code>
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// Named export for component index
export { PreceptorQRCode };
