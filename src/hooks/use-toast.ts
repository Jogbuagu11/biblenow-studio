import { useState } from 'react';

interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  id?: string;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const toast = ({ title, description, variant = 'default' }: ToastProps) => {
    const newToast = { 
      title, 
      description, 
      variant, 
      id: Date.now().toString() 
    };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { toast, toasts, removeToast };
}; 