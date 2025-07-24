import React from 'react';

interface AlertProps {
  className?: string;
  children: React.ReactNode;
}

interface AlertTitleProps {
  className?: string;
  children: React.ReactNode;
}

interface AlertDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ className = "", children }) => {
  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      {children}
    </div>
  );
};

export const AlertTitle: React.FC<AlertTitleProps> = ({ className = "", children }) => {
  return (
    <h5 className={`text-sm font-medium ${className}`}>
      {children}
    </h5>
  );
};

export const AlertDescription: React.FC<AlertDescriptionProps> = ({ className = "", children }) => {
  return (
    <div className={`text-sm mt-1 ${className}`}>
      {children}
    </div>
  );
}; 