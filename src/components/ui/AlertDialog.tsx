import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './Dialog';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface AlertDialogContentProps {
  children: React.ReactNode;
}

interface AlertDialogHeaderProps {
  children: React.ReactNode;
}

interface AlertDialogTitleProps {
  children: React.ReactNode;
}

interface AlertDialogDescriptionProps {
  children: React.ReactNode;
}

interface AlertDialogFooterProps {
  children: React.ReactNode;
}

interface AlertDialogActionProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

interface AlertDialogCancelProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({ open, onOpenChange, children }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  );
};

export const AlertDialogContent: React.FC<AlertDialogContentProps> = ({ children }) => {
  return (
    <DialogContent className="sm:max-w-[425px]">
      {children}
    </DialogContent>
  );
};

export const AlertDialogHeader: React.FC<AlertDialogHeaderProps> = ({ children }) => {
  return (
    <DialogHeader>
      {children}
    </DialogHeader>
  );
};

export const AlertDialogTitle: React.FC<AlertDialogTitleProps> = ({ children }) => {
  return (
    <DialogTitle>
      {children}
    </DialogTitle>
  );
};

export const AlertDialogDescription: React.FC<AlertDialogDescriptionProps> = ({ children }) => {
  return (
    <p className="text-sm text-gray-600 mt-2">
      {children}
    </p>
  );
};

export const AlertDialogFooter: React.FC<AlertDialogFooterProps> = ({ children }) => {
  return (
    <div className="flex justify-end gap-2 mt-6">
      {children}
    </div>
  );
};

export const AlertDialogAction: React.FC<AlertDialogActionProps> = ({ children, onClick, className = "" }) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors ${className}`}
    >
      {children}
    </button>
  );
};

export const AlertDialogCancel: React.FC<AlertDialogCancelProps> = ({ children, onClick, className = "" }) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}; 