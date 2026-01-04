import { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, required, error, hint, children, className }: FormFieldProps) {
  return (
    <div className={clsx('space-y-2', className)}>
      <label className="block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {hint && !error && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className, ...props }: InputProps) {
  return (
    <input
      className={clsx(
        'w-full px-4 py-2.5 border-2 rounded-xl text-sm font-medium',
        'focus:outline-none focus:ring-2 transition-all',
        error
          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
          : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20',
        className
      )}
      {...props}
    />
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ error, className, ...props }: TextareaProps) {
  return (
    <textarea
      className={clsx(
        'w-full px-4 py-2.5 border-2 rounded-xl text-sm font-medium resize-none',
        'focus:outline-none focus:ring-2 transition-all',
        error
          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
          : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20',
        className
      )}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function Select({ error, className, children, ...props }: SelectProps) {
  return (
    <select
      className={clsx(
        'w-full px-4 py-2.5 border-2 rounded-xl text-sm font-medium',
        'focus:outline-none focus:ring-2 transition-all appearance-none bg-white',
        'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236B7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3E%3C/svg%3E")] bg-size-[1.25rem] bg-position-[right_0.5rem_center] bg-no-repeat pr-10',
        error
          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
          : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
