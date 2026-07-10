import { cn } from '../../lib/utils';

interface CheckboxOption {
  value: string;
  label: string;
  description?: string;
}

interface CheckboxGroupProps {
  options: CheckboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
  layout?: 'vertical' | 'horizontal' | 'grid';
  columns?: number;
  className?: string;
}

export function CheckboxGroup({
  options,
  value,
  onChange,
  layout = 'vertical',
  columns = 2,
  className,
}: CheckboxGroupProps) {
  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter((v) => v !== optionValue));
    }
  };

  const layoutClass = {
    vertical: 'rdcfe-flex rdcfe-flex-col rdcfe-gap-3',
    horizontal: 'rdcfe-flex rdcfe-flex-wrap rdcfe-gap-4',
    grid: `rdcfe-grid rdcfe-gap-3`,
  };

  return (
    <div
      className={cn(layoutClass[layout], className)}
      style={layout === 'grid' ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}
    >
      {options.map((option) => (
        <label key={option.value} className="rdcfe-checkbox-wrapper">
          <input
            type="checkbox"
            className="rdcfe-checkbox"
            checked={value.includes(option.value)}
            onChange={(e) => handleChange(option.value, e.target.checked)}
          />
          <div>
            <span className="rdcfe-checkbox-label">{option.label}</span>
            {option.description && (
              <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                {option.description}
              </p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}

// Single checkbox
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: CheckboxProps) {
  return (
    <label className={cn('rdcfe-checkbox-wrapper', disabled && 'rdcfe-opacity-50', className)}>
      <input
        type="checkbox"
        className="rdcfe-checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      {(label || description) && (
        <div>
          {label && <span className="rdcfe-checkbox-label">{label}</span>}
          {description && (
            <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              {description}
            </p>
          )}
        </div>
      )}
    </label>
  );
}

