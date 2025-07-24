import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = ({ 
  className = "", 
  checked, 
  onCheckedChange, 
  ...props 
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onCheckedChange) {
      onCheckedChange(e.target.checked);
    }
  };

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={handleChange}
      className={`
        h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500
        ${className}
      `}
      {...props}
    />
  );
};

export default Checkbox; 