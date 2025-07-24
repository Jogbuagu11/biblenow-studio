import React from 'react';

interface RadioGroupProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

interface RadioGroupItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  checked?: boolean;
  onValueChange?: (value: string) => void;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({ 
  value, 
  onValueChange, 
  children, 
  className = "" 
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === RadioGroupItem) {
          return React.cloneElement(child, {
            checked: value === child.props.value,
            onValueChange,
          } as any);
        }
        return child;
      })}
    </div>
  );
};

export const RadioGroupItem: React.FC<RadioGroupItemProps> = ({ 
  value, 
  children, 
  className = "",
  checked,
  onValueChange
}) => {
  return (
    <label className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
      checked 
        ? 'border-yellow-500 bg-yellow-50' 
        : 'border-gray-200 hover:border-gray-300'
    } ${className}`}>
      <input
        type="radio"
        value={value}
        checked={checked}
        onChange={() => onValueChange?.(value)}
        className="sr-only"
      />
      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
        checked 
          ? 'border-yellow-500' 
          : 'border-gray-300'
      }`}>
        {checked && (
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {children}
      </div>
    </label>
  );
}; 