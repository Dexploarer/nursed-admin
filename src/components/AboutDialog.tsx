import { Modal } from './Modal';
import { Stethoscope, Heart } from 'lucide-react';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="About NursEd Admin"
      size="md"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary px-8 shadow-md whitespace-nowrap"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-linear-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
            <Stethoscope className="w-12 h-12 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">NursEd Admin</h2>
            <p className="text-sm text-gray-600">Version 1.0.0</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">About</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              NursEd Admin is a comprehensive management system designed specifically for nursing instructors.
              It helps you manage students, track clinical hours, monitor skills competency, and maintain
              compliance with VBON regulations.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Features</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Student enrollment and management</li>
              <li>Clinical hours tracking and compliance</li>
              <li>Skills competency matrix</li>
              <li>Gradebook and academic records</li>
              <li>Calendar and event scheduling</li>
              <li>AI-powered co-instructor assistant</li>
              <li>Analytics and reporting</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Compliance</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Built to comply with VBON 18VAC90-27 regulations, including clinical hour requirements,
              simulation caps, and faculty-to-student ratios.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Heart className="w-4 h-4 text-red-500" />
              <span>Made with care for nursing educators</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
