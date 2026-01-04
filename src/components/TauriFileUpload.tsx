import { useState, useCallback, useRef } from 'react';
import { Upload, X, Loader2, Image, FileText, File, Check } from 'lucide-react';
import { saveFile, deleteFile, getFileAsDataUrl, FileResourceType } from '@/lib/db';
import { useToast } from './Toast';
import { clsx } from 'clsx';

interface TauriFileUploadProps {
  /** Type of resource being uploaded */
  resourceType: FileResourceType;
  /** ID of the resource (studentId, certId, etc.) */
  resourceId: string;
  /** Current file path (if already uploaded) */
  currentFilePath?: string;
  /** Called when a file is successfully uploaded */
  onUpload: (filePath: string) => void;
  /** Called when file is deleted */
  onDelete?: () => void;
  /** Accepted file types */
  accept?: string;
  /** Max file size in MB */
  maxSize?: number;
  /** Whether this is for an image (shows preview) */
  isImage?: boolean;
  /** Custom label */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Compact mode for inline use */
  compact?: boolean;
}

export function TauriFileUpload({
  resourceType,
  resourceId,
  currentFilePath,
  onUpload,
  onDelete,
  accept = 'image/*,.pdf,.doc,.docx',
  maxSize = 10,
  isImage = false,
  label,
  disabled = false,
  compact = false,
}: TauriFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Load preview for existing file
  const loadPreview = useCallback(async () => {
    if (!currentFilePath || !isImage) return;

    setLoadingPreview(true);
    try {
      // Get MIME type from extension
      const ext = currentFilePath.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };
      const mimeType = mimeTypes[ext || ''] || 'image/jpeg';
      const dataUrl = await getFileAsDataUrl(currentFilePath, mimeType);
      setPreviewUrl(dataUrl);
    } catch (err) {
      console.error('Failed to load preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  }, [currentFilePath, isImage]);

  // Load preview on mount if we have a file
  useState(() => {
    if (currentFilePath && isImage) {
      loadPreview();
    }
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      toast.error('File Too Large', `Maximum file size is ${maxSize}MB`);
      return;
    }

    setUploading(true);
    try {
      const filePath = await saveFile(file, resourceType, resourceId);
      onUpload(filePath);

      // Load preview for images
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => setPreviewUrl(e.target?.result as string);
        reader.readAsDataURL(file);
      }

      toast.success('File Uploaded', 'File saved successfully');
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Upload Failed', 'Failed to save file. Please try again.');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!currentFilePath) return;

    setDeleting(true);
    try {
      await deleteFile(currentFilePath);
      setPreviewUrl(null);
      onDelete?.();
      toast.success('File Deleted', 'File removed successfully');
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Delete Failed', 'Failed to remove file');
    } finally {
      setDeleting(false);
    }
  };

  const getFileIcon = () => {
    if (isImage) return <Image className="w-6 h-6" />;
    if (accept?.includes('.pdf')) return <FileText className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };

  // Compact mode - just a button
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
        />

        {currentFilePath ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-600 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Uploaded
            </span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-500 hover:text-red-700"
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Remove'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            {uploading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Upload className="w-3 h-3" />
            )}
            {label || 'Upload'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
      />

      {/* Preview or Upload Area */}
      {currentFilePath && isImage && (previewUrl || loadingPreview) ? (
        <div className="relative inline-block">
          {loadingPreview ? (
            <div className="w-32 h-32 rounded-xl bg-gray-100 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : (
            <img
              src={previewUrl!}
              alt="Uploaded"
              className="w-32 h-32 rounded-xl object-cover border-2 border-gray-200"
            />
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>
        </div>
      ) : currentFilePath ? (
        // Non-image file indicator
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-green-600">
            {getFileIcon()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Document Uploaded</p>
            <p className="text-xs text-green-600 truncate max-w-xs">
              {currentFilePath.split('/').pop()}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>
        </div>
      ) : (
        // Upload button
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className={clsx(
            'w-full border-2 border-dashed rounded-xl p-6 text-center transition-all',
            disabled
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50 cursor-pointer'
          )}
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
          ) : (
            <div className="text-gray-400">
              {getFileIcon()}
            </div>
          )}
          <p className="mt-2 text-sm font-medium text-gray-600">
            {uploading ? 'Uploading...' : 'Click to upload'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Max size: {maxSize}MB
          </p>
        </button>
      )}
    </div>
  );
}

// Specialized component for student photos
export function StudentPhotoUpload({
  studentId,
  currentPhotoUrl,
  onUpload,
  onDelete,
}: {
  studentId: string;
  currentPhotoUrl?: string;
  onUpload: (filePath: string) => void;
  onDelete?: () => void;
}) {
  return (
    <TauriFileUpload
      resourceType="student_photos"
      resourceId={studentId}
      currentFilePath={currentPhotoUrl}
      onUpload={onUpload}
      onDelete={onDelete}
      accept="image/jpeg,image/png,image/gif,image/webp"
      maxSize={5}
      isImage={true}
      label="Student Photo"
    />
  );
}

// Specialized component for certification documents
export function CertificationDocUpload({
  certId,
  currentDocPath,
  onUpload,
  onDelete,
  resourceType = 'instructor_certs',
}: {
  certId: string;
  currentDocPath?: string;
  onUpload: (filePath: string) => void;
  onDelete?: () => void;
  resourceType?: 'instructor_certs' | 'student_certs';
}) {
  return (
    <TauriFileUpload
      resourceType={resourceType}
      resourceId={certId}
      currentFilePath={currentDocPath}
      onUpload={onUpload}
      onDelete={onDelete}
      accept="image/jpeg,image/png,.pdf"
      maxSize={10}
      isImage={false}
      label="Upload Document (PDF or Image)"
    />
  );
}
