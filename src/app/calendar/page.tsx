'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface DayData {
  date: string;
  count: number;
}

export default function Calendar() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewType, setViewType] = useState<'month' | 'year'>('month');
  const [calendarData, setCalendarData] = useState<DayData[]>([]);

  const loadCalendarData = useCallback(async (userId: string) => {
    const startDate = viewType === 'month'
      ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      : new Date(currentMonth.getFullYear(), 0, 1);
    
    const endDate = viewType === 'month'
      ? new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      : new Date(currentMonth.getFullYear(), 11, 31);

    const { data: records } = await supabase
      .from('pushup_records')
      .select('count, created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (records) {
      const formattedData: DayData[] = records.map(record => ({
        date: record.created_at.split('T')[0],
        count: record.count
      }));
      setCalendarData(formattedData);
    }
  }, [currentMonth, viewType]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      loadCalendarData(user.id);
    };
    checkUser();
  }, [router, loadCalendarData]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
  };

  const getMonthsInYear = (year: number) => {
    return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  };

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (count < 20) return 'bg-blue-100 dark:bg-blue-900';
    if (count < 40) return 'bg-blue-300 dark:bg-blue-700';
    if (count < 60) return 'bg-blue-500 dark:bg-blue-500';
    return 'bg-blue-700 dark:bg-blue-300';
  };

  const previousMonth = () => {
    if (viewType === 'month') {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    } else {
      setCurrentMonth(new Date(currentMonth.getFullYear() - 1, 0));
    }
  };

  const nextMonth = () => {
    if (viewType === 'month') {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    } else {
      setCurrentMonth(new Date(currentMonth.getFullYear() + 1, 0));
    }
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(currentMonth);
    return (
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <div key={`header-${index}`} className="text-center text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
            {day[0]}
          </div>
        ))}
        
        {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }).map((_, i) => (
          <div key={`empty-${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${i}`} className="h-12 sm:h-16 rounded-lg"></div>
        ))}

        {days.map(day => {
          const dateStr = day.toISOString().split('T')[0];
          const dayData = calendarData.find(d => d.date === dateStr);
          const count = dayData?.count || 0;

          return (
            <div
              key={dateStr}
              className={`h-12 sm:h-16 rounded-lg ${getHeatmapColor(count)} flex flex-col items-center justify-center transition-colors cursor-pointer hover:opacity-75`}
            >
              <div className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">{day.getDate()}</div>
              {count > 0 && (
                <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300">{count}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderYearView = () => {
    const months = getMonthsInYear(currentMonth.getFullYear());
    return (
      <div className="grid grid-cols-3 gap-6">
        {months.map(month => {
          const days = getDaysInMonth(month);
          return (
            <div key={month.getMonth()} className="">
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                {month.toLocaleString('default', { month: 'long' })}
              </h3>
              <div className="grid grid-cols-7 gap-1">
                {days.map(day => {
                  const dateStr = day.toISOString().split('T')[0];
                  const dayData = calendarData.find(d => d.date === dateStr);
                  const count = dayData?.count || 0;

                  return (
                    <div
                      key={dateStr}
                      className={`h-4 w-4 rounded-sm ${getHeatmapColor(count)} transition-colors cursor-pointer hover:opacity-75`}
                      title={`${day.toLocaleDateString()}: ${count} pushups`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <main className="max-w-4xl mx-auto pt-6 sm:pt-12">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm sm:text-base">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white order-first sm:order-none">Progress Calendar</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setViewType('month')}
              className={`px-2 sm:px-3 py-1 rounded-lg text-sm ${viewType === 'month' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}
            >
              Month
            </button>
            <button
              onClick={() => setViewType('year')}
              className={`px-2 sm:px-3 py-1 rounded-lg text-sm ${viewType === 'year' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}
            >
              Year
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-3 sm:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <button
              onClick={previousMonth}
              className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              ←
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
              {viewType === 'month' 
                ? currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
                : currentMonth.getFullYear().toString()
              }
            </h2>
            <button
              onClick={nextMonth}
              className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              →
            </button>
          </div>

          {viewType === 'month' ? renderMonthView() : renderYearView()}
        </div>

        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Activity Legend</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-gray-100 dark:bg-gray-800"></div>
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">No activity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-blue-100 dark:bg-blue-900"></div>
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">1-19</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-blue-300 dark:bg-blue-700"></div>
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">20-39</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-blue-500 dark:bg-blue-500"></div>
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">40-59</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-blue-700 dark:bg-blue-300"></div>
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">60+</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}