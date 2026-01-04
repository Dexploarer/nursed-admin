import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import { Modal } from './Modal';
import { clsx } from 'clsx';

export type ExportFormat = 'pdf' | 'csv' | 'excel';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat, options?: ExportOptions) => void;
  title?: string;
  formats?: ExportFormat[];
}

interface ExportOptions {
  includeHeaders?: boolean;
  selectedFields?: string[];
  dateRange?: { from: Date; to: Date };
}

const formatOptions: Record<ExportFormat, { label: string; icon: React.ReactNode; description: string }> = {
  pdf: {
    label: 'PDF Document',
    icon: <FileText className="w-6 h-6" />,
    description: 'Best for printing and sharing',
  },
  csv: {
    label: 'CSV File',
    icon: <FileSpreadsheet className="w-6 h-6" />,
    description: 'Compatible with Excel and Google Sheets',
  },
  excel: {
    label: 'Excel Workbook',
    icon: <File className="w-6 h-6" />,
    description: 'Native Excel format with formatting',
  },
};

export function ExportDialog({
  isOpen,
  onClose,
  onExport,
  title = 'Export Data',
  formats = ['pdf', 'csv', 'excel'],
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(formats[0]);
  const [includeHeaders, setIncludeHeaders] = useState(true);

  const handleExport = () => {
    onExport(selectedFormat, {
      includeHeaders,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="btn btn-primary px-6 flex items-center gap-2 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Export {formatOptions[selectedFormat].label}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-600">Choose a format and options for your export:</p>

        {/* Format Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Format</label>
          <div className="grid grid-cols-1 gap-3">
            {formats.map((format) => {
              const option = formatOptions[format];
              const isSelected = selectedFormat === format;
              return (
                <button
                  key={format}
                  onClick={() => setSelectedFormat(format)}
                  className={clsx(
                    'flex items-start gap-4 p-4 border-2 rounded-xl transition-all text-left',
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className={clsx(
                    'p-2 rounded-lg shrink-0',
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                  )}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">Options</label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeHeaders}
              onChange={(e) => setIncludeHeaders(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Include column headers</span>
          </label>
        </div>
      </div>
    </Modal>
  );
}
