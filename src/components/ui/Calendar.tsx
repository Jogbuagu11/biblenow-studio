import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

interface CalendarProps {
  mode?: 'single';
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
}

const Calendar: React.FC<CalendarProps> = ({ 
  mode = 'single', 
  selected, 
  onSelect, 
  className = "" 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    if (onSelect) {
      onSelect(date);
    }
  };

  const isSelected = (date: Date) => {
    return selected && isSameDay(date, selected);
  };

  const isCurrentMonth = (date: Date) => {
    return isSameMonth(date, currentMonth);
  };

  return (
    <div className={`bg-offWhite-25 dark:bg-darkBrown-800 rounded-lg border border-gray-200 dark:border-yellow-500 ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-yellow-500">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-darkBrown-700 rounded-lg transition-colors text-sm text-gray-600 dark:text-white"
        >
          ←
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-darkBrown-700 rounded-lg transition-colors text-sm text-gray-600 dark:text-white"
        >
          →
        </button>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-7 gap-2 mb-3">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-darkBrown-300 py-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {daysInMonth.map((date) => (
            <button
              key={date.toISOString()}
              onClick={() => handleDateClick(date)}
              className={`
                p-3 text-sm rounded-lg transition-colors min-h-[40px] flex items-center justify-center
                ${isSelected(date) 
                  ? 'bg-yellow-600 text-white' 
                  : isCurrentMonth(date)
                    ? 'hover:bg-gray-100 dark:hover:bg-darkBrown-700 text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-darkBrown-400'
                }
              `}
            >
              {format(date, 'd')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Calendar; 