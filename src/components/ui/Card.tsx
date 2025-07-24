import React from 'react';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

interface CardTitleProps {
  className?: string;
  children: React.ReactNode;
}

interface CardDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className = "", children }) => {
  return (
    <div className={`bg-offWhite-25 dark:bg-darkBrown-800 rounded-lg border border-gray-200 dark:border-yellow-500 shadow-md transition-colors duration-200 ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({ className = "", children }) => {
  return (
    <div className={`p-6 pb-0 ${className}`}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<CardTitleProps> = ({ className = "", children }) => {
  return (
    <h3 className={`text-xl font-bold text-gray-800 dark:text-white transition-colors duration-200 ${className}`}>
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<CardDescriptionProps> = ({ className = "", children }) => {
  return (
    <p className={`text-sm text-gray-700 dark:text-darkBrown-200 mt-2 transition-colors duration-200 ${className}`}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<CardContentProps> = ({ className = "", children }) => {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<CardFooterProps> = ({ className = "", children }) => {
  return (
    <div className={`p-6 pt-0 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}; 