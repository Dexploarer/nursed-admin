import { useState, useCallback } from 'react';
import { Upload, AlertCircle, CheckCircle, X, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { PreceptorEvaluation, Student } from '@/types';
import { importPreceptorEvaluations, loadStudents } from '@/lib/db';

interface EvaluationCSVImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface CSVRow {
  [key: string]: string;
}

interface MappedEvaluation {
  original: CSVRow;
  mapped: PreceptorEvaluation | null;
  studentMatch: Student | null;
  error?: string;
}

// Common Google Forms column names that might map to our fields
const COLUMN_MAPPINGS: Record<string, string[]> = {
  studentName: ['Student Name', 'Student', 'Name', 'student_name', 'student'],
  preceptorName: ['Preceptor Name', 'Preceptor', 'Evaluator', 'preceptor_name', 'preceptor', 'Your Name'],
  evaluationDate: ['Date', 'Evaluation Date', 'evaluation_date', 'Timestamp', 'date'],
  overallRating: ['Overall Rating', 'Overall', 'overall_rating', 'Overall Performance', 'overall'],
  clinicalSkillsRating: ['Clinical Skills', 'Clinical Skills Rating', 'clinical_skills_rating', 'Clinical Competency'],
  professionalismRating: ['Professionalism', 'Professionalism Rating', 'professionalism_rating', 'Professional Behavior'],
  communicationRating: ['Communication', 'Communication Rating', 'communication_rating', 'Communication Skills'],
  comments: ['Comments', 'Additional Comments', 'comments', 'Notes', 'General Comments'],
  areasForImprovement: ['Areas for Improvement', 'Improvement Areas', 'areas_for_improvement', 'Needs Improvement'],
  strengths: ['Strengths', 'strengths', 'Strong Points', 'Positive Observations'],
};

function parseCSV(text: string): CSVRow[] {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);

  // Parse rows
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      rows.push(row);
    }
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function findMatchingColumn(headers: string[], fieldMappings: string[]): string | null {
  for (const header of headers) {
    const normalizedHeader = header.toLowerCase().trim();
    for (const mapping of fieldMappings) {
      if (normalizedHeader === mapping.toLowerCase()) {
        return header;
      }
    }
  }
  return null;
}

function parseRating(value: string | undefined): number | undefined {
  if (!value) return undefined;
  // Handle various rating formats: "5", "5/5", "Excellent (5)", etc.
  const match = value.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    // Normalize to 1-5 scale if needed
    if (num >= 1 && num <= 5) return num;
    if (num >= 1 && num <= 10) return Math.round(num / 2);
  }
  return undefined;
}

function fuzzyMatchStudent(name: string, students: Student[]): Student | null {
  const normalizedName = name.toLowerCase().trim();

  // Try exact match first
  for (const student of students) {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const reverseName = `${student.lastName}, ${student.firstName}`.toLowerCase();
    const reverseNameAlt = `${student.lastName} ${student.firstName}`.toLowerCase();

    if (fullName === normalizedName || reverseName === normalizedName || reverseNameAlt === normalizedName) {
      return student;
    }
  }

  // Try partial match
  for (const student of students) {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    if (fullName.includes(normalizedName) || normalizedName.includes(fullName)) {
      return student;
    }
    // Check last name only
    if (student.lastName.toLowerCase() === normalizedName) {
      return student;
    }
  }

  return null;
}

export function EvaluationCSVImport({ isOpen, onClose, onImportComplete }: EvaluationCSVImportProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'complete'>('upload');
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [mappedEvaluations, setMappedEvaluations] = useState<MappedEvaluation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      setError(null);
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        setError('No data found in CSV file');
        return;
      }

      const csvHeaders = Object.keys(rows[0]);
      setHeaders(csvHeaders);
      setCsvData(rows);

      // Auto-detect column mappings
      const detectedMappings: Record<string, string> = {};
      for (const [field, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
        const match = findMatchingColumn(csvHeaders, possibleNames);
        if (match) {
          detectedMappings[field] = match;
        }
      }
      setColumnMappings(detectedMappings);

      // Load students for matching
      const loadedStudents = await loadStudents();
      setStudents(loadedStudents);

      setStep('mapping');
    } catch (err) {
      setError(`Failed to parse CSV: ${err}`);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      handleFileUpload(file);
    } else {
      setError('Please upload a CSV file');
    }
  }, [handleFileUpload]);

  const handleMappingChange = (field: string, column: string) => {
    setColumnMappings(prev => ({
      ...prev,
      [field]: column
    }));
  };

  const processMapping = () => {
    const mapped: MappedEvaluation[] = csvData.map((row) => {
      const studentName = row[columnMappings.studentName] || '';
      const studentMatch = fuzzyMatchStudent(studentName, students);

      if (!studentMatch) {
        return {
          original: row,
          mapped: null,
          studentMatch: null,
          error: `Could not match student: "${studentName}"`
        };
      }

      const evaluation: PreceptorEvaluation = {
        id: crypto.randomUUID(),
        studentId: studentMatch.id,
        preceptorName: row[columnMappings.preceptorName] || 'Unknown',
        evaluationDate: row[columnMappings.evaluationDate] || new Date().toISOString().split('T')[0],
        overallRating: parseRating(row[columnMappings.overallRating]),
        clinicalSkillsRating: parseRating(row[columnMappings.clinicalSkillsRating]),
        professionalismRating: parseRating(row[columnMappings.professionalismRating]),
        communicationRating: parseRating(row[columnMappings.communicationRating]),
        comments: row[columnMappings.comments],
        areasForImprovement: row[columnMappings.areasForImprovement],
        strengths: row[columnMappings.strengths],
        status: 'Pending',
        submittedAt: new Date().toISOString()
      };

      return {
        original: row,
        mapped: evaluation,
        studentMatch
      };
    });

    setMappedEvaluations(mapped);
    setStep('preview');
  };

  const handleImport = async () => {
    setStep('importing');

    const validEvaluations = mappedEvaluations
      .filter(m => m.mapped !== null)
      .map(m => m.mapped!);

    try {
      const result = await importPreceptorEvaluations(validEvaluations);
      setImportResult(result);
      setStep('complete');
    } catch (err) {
      setError(`Import failed: ${err}`);
      setStep('preview');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setCsvData([]);
    setHeaders([]);
    setColumnMappings({});
    setMappedEvaluations([]);
    setImportResult(null);
    setError(null);
    onClose();
  };

  const handleComplete = () => {
    handleClose();
    onImportComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Import Preceptor Evaluations</h2>
              <p className="text-sm text-gray-500">Import evaluations from Google Sheets CSV export</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4 px-6 bg-gray-50 border-b border-gray-200">
          {['Upload', 'Map Columns', 'Preview', 'Import'].map((label, index) => {
            const stepIndex = ['upload', 'mapping', 'preview', 'importing'].indexOf(step);
            const isActive = index === stepIndex || (step === 'complete' && index === 3);
            const isComplete = index < stepIndex || step === 'complete';

            return (
              <div key={label} className="flex items-center gap-2">
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  isComplete ? 'bg-green-500 text-white' :
                  isActive ? 'bg-indigo-600 text-white' :
                  'bg-gray-200 text-gray-500'
                )}>
                  {isComplete ? <CheckCircle className="w-5 h-5" /> : index + 1}
                </div>
                <span className={clsx(
                  'text-sm font-medium',
                  isActive || isComplete ? 'text-gray-900' : 'text-gray-400'
                )}>{label}</span>
                {index < 3 && <ArrowRight className="w-4 h-4 text-gray-300 mx-2" />}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer"
              onClick={() => document.getElementById('csv-file-input')?.click()}
            >
              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                className="hidden"
              />
              <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold text-gray-700 mb-2">
                Drop your CSV file here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse
              </p>
              <p className="text-xs text-gray-400">
                Export your Google Sheets form responses as CSV first
              </p>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  Found {csvData.length} rows in your CSV. Map the columns below to import fields.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(COLUMN_MAPPINGS).map(([field, _]) => (
                  <div key={field} className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 capitalize">
                      {field.replace(/([A-Z])/g, ' $1').trim()}
                      {field === 'studentName' && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={columnMappings[field] || ''}
                      onChange={(e) => handleMappingChange(field, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={processMapping}
                  disabled={!columnMappings.studentName}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-600">
                    {mappedEvaluations.filter(m => m.mapped).length} ready to import
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-gray-600">
                    {mappedEvaluations.filter(m => !m.mapped).length} with errors
                  </span>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Student</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Preceptor</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {mappedEvaluations.slice(0, 10).map((item, index) => (
                      <tr key={index} className={item.error ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3">
                          {item.mapped ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.studentMatch ? (
                            <span className="text-gray-900">
                              {item.studentMatch.firstName} {item.studentMatch.lastName}
                            </span>
                          ) : (
                            <span className="text-red-600">{item.error}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {item.mapped?.preceptorName || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {item.mapped?.evaluationDate || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {item.mapped?.overallRating ? `${item.mapped.overallRating}/5` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {mappedEvaluations.length > 10 && (
                  <div className="px-4 py-3 bg-gray-50 text-sm text-gray-500 text-center">
                    ... and {mappedEvaluations.length - 10} more rows
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setStep('mapping')}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={mappedEvaluations.filter(m => m.mapped).length === 0}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Import {mappedEvaluations.filter(m => m.mapped).length} Evaluations
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4"></div>
              <p className="text-lg font-medium text-gray-700">Importing evaluations...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && importResult && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Import Complete!</h3>
              <p className="text-gray-600 mb-6">
                Successfully imported {importResult.imported} evaluations
                {importResult.failed > 0 && ` (${importResult.failed} failed)`}
              </p>

              {importResult.errors.length > 0 && (
                <div className="text-left bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-red-800 mb-2">Errors:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleComplete}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
