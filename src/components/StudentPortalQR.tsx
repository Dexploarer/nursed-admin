import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Student } from '@/types';
import { Copy, Download, Check, QrCode, Smartphone, BookOpen, Clock } from 'lucide-react';
import { Modal } from './Modal';
import { useToast } from './Toast';

interface StudentPortalQRProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Generates a secure access token for student portal
 */
function generateAccessToken(studentId: string): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 10);
  const data = `${studentId}-portal-${timestamp}-${randomPart}`;
  // Base64 URL-safe encoding
  return btoa(data).replace(/[+/=]/g, (c) =>
    c === '+' ? '-' : c === '/' ? '_' : ''
  );
}

/**
 * Generates the student portal URL
 * Can be configured for Google Sheets or a custom hosted page
 */
function generatePortalUrl(student: Student, token: string): string {
  // Configuration options - set to 'google_sheets' to use Google Sheets
  const portalType = 'custom' as 'google_sheets' | 'custom';

  if (portalType === 'google_sheets') {
    // Option 1: Google Sheets URL with student filter
    // Replace SHEET_ID with your actual Google Sheet ID
    // The sheet should have a filtered view for each student
    const sheetId = 'YOUR_GOOGLE_SHEET_ID';
    const params = new URLSearchParams({
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      token: token
    });
    return `https://docs.google.com/spreadsheets/d/${sheetId}/edit?${params.toString()}`;
  }

  // Option 2: Custom hosted portal (GitHub Pages, Netlify, etc.)
  // This is a simple static page that decodes the params and shows student info
  const baseUrl = 'https://nursed-portal.example.com/student'; // Replace with your hosted URL
  const params = new URLSearchParams({
    id: student.id,
    name: `${student.firstName} ${student.lastName}`,
    cohort: student.cohort,
    token: token
  });

  return `${baseUrl}?${params.toString()}`;
}

export default function StudentPortalQR({ student, isOpen, onClose }: StudentPortalQRProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Generate access token and URL
  const accessToken = generateAccessToken(student.id);
  const portalUrl = generatePortalUrl(student, accessToken);

  // Calculate statistics
  const hoursProgress = student.clinicalHoursRequired > 0
    ? Math.round((student.clinicalHoursCompleted / student.clinicalHoursRequired) * 100)
    : 0;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      toast.success('Link Copied', 'Student portal link copied to clipboard');
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
      downloadLink.download = `student-portal-qr-${student.firstName}-${student.lastName}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      toast.success('QR Code Downloaded', 'The QR code has been saved as PNG');
    };
    img.src = url;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Print Failed', 'Unable to open print window. Please check popup settings.');
      return;
    }

    const svg = qrRef.current?.querySelector('svg');
    const svgHtml = svg ? new XMLSerializer().serializeToString(svg) : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Portal QR - ${student.firstName} ${student.lastName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              text-align: center;
            }
            .header { margin-bottom: 30px; }
            .student-name { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
            .cohort { color: #666; font-size: 14px; }
            .qr-container { margin: 30px 0; }
            .instructions {
              margin-top: 30px;
              padding: 20px;
              background: #f5f5f5;
              border-radius: 8px;
              text-align: left;
              max-width: 400px;
              margin-left: auto;
              margin-right: auto;
            }
            .instructions h3 { margin-top: 0; font-size: 16px; }
            .instructions ol { margin: 0; padding-left: 20px; }
            .instructions li { margin-bottom: 8px; }
            .url {
              margin-top: 20px;
              font-size: 10px;
              color: #999;
              word-break: break-all;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="student-name">${student.firstName} ${student.lastName}</div>
            <div class="cohort">Cohort: ${student.cohort}</div>
          </div>
          <div class="qr-container">${svgHtml}</div>
          <div class="instructions">
            <h3>How to Access Your Portal:</h3>
            <ol>
              <li>Scan this QR code with your phone's camera</li>
              <li>Tap the link that appears</li>
              <li>Bookmark the page for quick access</li>
              <li>Use the portal to view and submit your clinical hours</li>
            </ol>
          </div>
          <div class="url">Portal URL: ${portalUrl}</div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Student Portal Access" size="md">
      <div className="text-center space-y-6">
        {/* Student Info */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-lg">
            <Smartphone className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-700">
              Mobile Portal Access
            </span>
          </div>

          <div className="font-bold text-xl text-gray-900">
            {student.firstName} {student.lastName}
          </div>

          <div className="text-sm text-gray-500">
            Cohort: {student.cohort}
          </div>
        </div>

        {/* QR Code */}
        <div
          ref={qrRef}
          className="bg-white p-8 rounded-2xl border-2 border-gray-200 inline-block shadow-sm"
        >
          <QRCodeSVG
            value={portalUrl}
            size={220}
            level="H"
            marginSize={4}
            bgColor="#ffffff"
            fgColor="#1e293b"
          />
        </div>

        {/* Quick Stats */}
        <div className="flex justify-center gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Clinical Hours</span>
            </div>
            <div className="font-bold text-lg">
              {student.clinicalHoursCompleted}/{student.clinicalHoursRequired}
            </div>
            <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${Math.min(hoursProgress, 100)}%` }}
              />
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <BookOpen className="w-4 h-4" />
              <span className="text-xs">Skills Completed</span>
            </div>
            <div className="font-bold text-lg">
              {student.skillsCompleted?.length || 0}
            </div>
          </div>
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
            onClick={handlePrint}
            className="btn btn-primary flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            Print Card
          </button>
        </div>

        {/* Instructions */}
        <div className="pt-4 border-t border-gray-100 text-left bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Student Instructions:</h4>
          <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
            <li>Scan this QR code with your phone's camera</li>
            <li>Tap the link that appears to open the portal</li>
            <li>Bookmark the page for quick daily access</li>
            <li>Use the portal to log clinical hours and view progress</li>
          </ol>
          <p className="text-xs text-gray-400 mt-3">
            <span className="font-medium">Token:</span>{' '}
            <code className="bg-gray-200 px-1 py-0.5 rounded text-[10px]">
              {accessToken.substring(0, 12)}...
            </code>
          </p>
        </div>
      </div>
    </Modal>
  );
}

// Named export for component index
export { StudentPortalQR };
