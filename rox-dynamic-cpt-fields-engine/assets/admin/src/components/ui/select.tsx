import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, error, ...props }, ref) => {
    return (
      <select
        className={cn(
          'rdcfe-select',
          error && 'rdcfe-input-error',
          className
        )}
        ref={ref}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    );
  }
);

Select.displayName = 'Select';

// Multi-select with tags
interface MultiSelectProps {
  options: SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select options...',
  className,
}: MultiSelectProps) {
  const handleAdd = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    if (newValue && !value.includes(newValue)) {
      onChange([...value, newValue]);
    }
    e.target.value = '';
  };

  const handleRemove = (itemToRemove: string) => {
    onChange(value.filter((item) => item !== itemToRemove));
  };

  const availableOptions = options.filter((opt) => !value.includes(opt.value));

  return (
    <div className={cn('rdcfe-multiselect', className)}>
      <select
        className="rdcfe-select"
        onChange={handleAdd}
        defaultValue=""
        disabled={availableOptions.length === 0}
      >
        <option value="" disabled>
          {availableOptions.length === 0 ? 'All selected' : placeholder}
        </option>
        {availableOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {value.length > 0 && (
        <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-2 rdcfe-mt-2">
          {value.map((item) => {
            const option = options.find((opt) => opt.value === item);
            return (
              <span
                key={item}
                className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1 rdcfe-px-3 rdcfe-py-1 rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-text-[hsl(var(--rdcfe-accent-foreground))] rdcfe-rounded-md rdcfe-text-[13px]"
              >
                {option?.label || item}
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  className="rdcfe-ml-1 rdcfe-text-[hsl(var(--rdcfe-accent-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-destructive))] rdcfe-transition-colors"
                >
                  <svg
                    className="rdcfe-w-3.5 rdcfe-h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

