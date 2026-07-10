import { cn } from '../../lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: ToggleProps) {
  return (
    <div className={cn('rdcfe-toggle-wrapper', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-checked={checked}
        disabled={disabled}
        className={cn(
          'rdcfe-toggle',
          disabled && 'rdcfe-opacity-50 rdcfe-cursor-not-allowed'
        )}
        onClick={() => !disabled && onChange(!checked)}
      />
      {(label || description) && (
        <div className="rdcfe-flex rdcfe-flex-col">
          {label && <span className="rdcfe-toggle-label">{label}</span>}
          {description && (
            <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Standalone toggle without label (for form rows)
interface ToggleInputProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function ToggleInput({
  checked,
  onChange,
  disabled = false,
  className,
}: ToggleInputProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-checked={checked}
      disabled={disabled}
      className={cn(
        'rdcfe-toggle',
        disabled && 'rdcfe-opacity-50 rdcfe-cursor-not-allowed',
        className
      )}
      onClick={() => !disabled && onChange(!checked)}
    />
  );
}

