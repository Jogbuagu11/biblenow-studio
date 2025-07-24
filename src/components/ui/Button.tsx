import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'default', 
  size = 'md', 
  className = "", 
  children, 
  ...props 
}) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variantClasses = {
    default: "bg-yellow-500 text-black hover:bg-yellow-600 dark:bg-yellow-600 dark:text-white dark:hover:bg-yellow-700",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-yellow-600 dark:bg-chocolate-800 dark:text-white dark:hover:bg-chocolate-700"
  };
  
  const sizeClasses = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 py-2",
    lg: "h-12 px-6 text-lg"
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button; 