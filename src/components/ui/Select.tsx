import React, { useState, useRef, useEffect } from 'react';

interface SelectProps {
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  placeholder?: string;
  children: React.ReactNode;
  required?: boolean;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selectedValue?: string;
  selectedLabel?: string;
  placeholder?: string;
}

interface SelectContentProps {
  children: React.ReactNode;
  onSelect?: (value: string, label: string) => void;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  onSelect?: (value: string, label: string) => void;
}

interface SelectValueProps {
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ 
  onValueChange, 
  defaultValue, 
  placeholder, 
  children, 
  required 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(defaultValue || '');
  const [selectedLabel, setSelectedLabel] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (value: string, label: string) => {
    setSelectedValue(value);
    setSelectedLabel(label);
    setIsOpen(false);
    if (onValueChange) {
      onValueChange(value);
    }
  };

  return (
    <div className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === SelectTrigger) {
            return React.cloneElement(child, {
              onClick: () => setIsOpen(!isOpen),
              selectedValue,
              selectedLabel,
              placeholder,
              required
            } as any);
          }
          if (child.type === SelectContent && isOpen) {
            return React.cloneElement(child, {
              onSelect: handleSelect
            } as any);
          }
        }
        return child;
      })}
    </div>
  );
};

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ 
  children, 
  className = "", 
  onClick,
  selectedValue, 
  selectedLabel, 
  placeholder 
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex h-10 w-full items-center justify-between rounded-md border border-gray-300 
        bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none 
        focus:ring-2 focus:ring-yellow-500 focus:border-transparent disabled:cursor-not-allowed 
        disabled:opacity-50 ${className}
      `}
    >
      <span className={selectedValue ? 'text-gray-900' : 'text-gray-400'}>
        {selectedLabel || placeholder}
      </span>
      <span className="ml-2">▼</span>
    </button>
  );
};

export const SelectContent: React.FC<SelectContentProps> = ({ children, onSelect }) => {
  return (
    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === SelectItem) {
          return React.cloneElement(child, { onSelect } as any);
        }
        return child;
      })}
    </div>
  );
};

export const SelectItem: React.FC<SelectItemProps> = ({ value, children, onSelect }) => {
  return (
    <button
      type="button"
      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
      onClick={() => onSelect?.(value, children as string)}
    >
      {children}
    </button>
  );
};

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  return <span>{placeholder}</span>;
}; 