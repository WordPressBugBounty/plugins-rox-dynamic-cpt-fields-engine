import React from 'react';
import { cn } from '../../lib/utils';
import { ProBadge } from './pro-badge';

interface FormFieldProps {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  pro?: boolean;
}

export function FormField({
  label,
  description,
  error,
  required,
  children,
  className,
  pro = false,
}: FormFieldProps) {
  return (
    <div className={cn('rdcfe-form-row', className)}>
      <div className="rdcfe-form-row-label">
        <label className="rdcfe-label">
          {label}
          {required && <span className="rdcfe-text-red-500 rdcfe-ml-0.5">*</span>}
          {pro && <ProBadge className="rdcfe-ml-2" />}
        </label>
        {description && <p className="rdcfe-help-text">{description}</p>}
      </div>
      <div className="rdcfe-form-row-field">
        {children}
        {error && <p className="rdcfe-error-text">{error}</p>}
      </div>
    </div>
  );
}

// Simple inline form field (no two-column layout)
interface InlineFormFieldProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function InlineFormField({
  label,
  description,
  error,
  required,
  children,
  className,
}: InlineFormFieldProps) {
  return (
    <div className={cn('rdcfe-mb-4', className)}>
      {label && (
        <label className="rdcfe-label">
          {label}
          {required && <span className="rdcfe-text-red-500 rdcfe-ml-0.5">*</span>}
        </label>
      )}
      {children}
      {description && <p className="rdcfe-help-text">{description}</p>}
      {error && <p className="rdcfe-error-text">{error}</p>}
    </div>
  );
}

