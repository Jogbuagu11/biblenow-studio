import React, { useEffect, useState } from 'react';

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  activeTab?: string;
  onValueChange?: (value: string) => void;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  activeTab?: string;
  onValueChange?: (value: string) => void;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  activeTab?: string;
}

const isOfType = (child: any, name: string) => {
  if (!child) return false;
  return child.type === (name === 'TabsList' ? TabsList : name === 'TabsTrigger' ? TabsTrigger : TabsContent)
    || (child.type && (child.type.displayName === name || child.type.name === name));
};

export const Tabs: React.FC<TabsProps> = ({ 
  defaultValue, 
  value, 
  onValueChange, 
  children, 
  className = "" 
}) => {
  const isControlled = value !== undefined;
  const [internalActiveTab, setInternalActiveTab] = useState<string>(value ?? defaultValue ?? '');

  // Sync internal state when value prop changes (controlled mode)
  useEffect(() => {
    if (isControlled) {
      setInternalActiveTab(value as string);
    }
  }, [isControlled, value]);

  const activeTab = isControlled ? (value as string) : internalActiveTab;

  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setInternalActiveTab(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <div className={className}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (isOfType(child, 'TabsList')) {
            return React.cloneElement(child, {
              activeTab,
              onValueChange: handleValueChange,
            } as any);
          }
          if (isOfType(child, 'TabsContent')) {
            return React.cloneElement(child, {
              activeTab,
            } as any);
          }
        }
        return child;
      })}
    </div>
  );
};
Tabs.displayName = 'Tabs';

export const TabsList: React.FC<TabsListProps> = ({ 
  children, 
  className = "",
  activeTab,
  onValueChange
}) => {
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`} role="tablist">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && isOfType(child, 'TabsTrigger')) {
          return React.cloneElement(child, {
            activeTab,
            onValueChange,
          } as any);
        }
        return child;
      })}
    </div>
  );
};
TabsList.displayName = 'TabsList';

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ 
  value, 
  children, 
  className = "",
  activeTab,
  onValueChange
}) => {
  const isActive = activeTab === value;
  
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onValueChange?.(value)}
      className={`
        inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
        ${isActive 
          ? 'bg-background text-foreground shadow-sm' 
          : 'hover:bg-background/50 hover:text-foreground'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
};
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent: React.FC<TabsContentProps> = ({ 
  value, 
  children, 
  className = "",
  activeTab
}) => {
  if (activeTab !== value) return null;
  
  return (
    <div className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`} role="tabpanel">
      {children}
    </div>
  );
};
TabsContent.displayName = 'TabsContent'; 