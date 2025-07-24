import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

const Textarea: React.FC<TextareaProps> = ({ className = "", ...props }) => {
  return (
    <textarea
      className={`
        flex min-h-[80px] w-full rounded-md border border-gray-300 dark:border-yellow-500 
        bg-white dark:bg-chocolate-800 px-3 py-2 text-sm 
        text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-chocolate-400
        focus:outline-none focus:ring-2 focus:ring-yellow-500 
        focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50
        transition-colors duration-200
        ${className}
      `}
      {...props}
    />
  );
};

export default Textarea; 