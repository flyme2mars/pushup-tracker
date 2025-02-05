'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Line } from 'react-chartjs-2';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Home() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(50);
  const [streak, setStreak] = useState(0);
  const [inputCount, setInputCount] = useState('');
  const [message, setMessage] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const [pastWeekData, setPastWeekData] = useState({
    labels: [],
    datasets: [{
      label: 'Daily Pushups',
      data: [],
      fill: false,
      borderColor: 'rgb(59, 130, 246)',
      tension: 0.1
    }]
  });

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Past Week Progress'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      loadUserData(user.id);
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    // Update motivation message based on progress
    const progress = (count / dailyGoal) * 100;
    if (count === 0) {
      setMessage('Ready to start? Let\'s crush it! 💪');
    } else if (progress < 25) {
      setMessage('Great start! Keep pushing! 🚀');
    } else if (progress < 50) {
      setMessage('You\'re making progress! 🔥');
    } else if (progress < 75) {
      setMessage('More than halfway there! 🌟');
    } else if (progress < 100) {
      setMessage('Almost there! Finish strong! ✨');
    } else {
      setMessage('Daily goal achieved! You\'re amazing! 🏆');
    }

    // Reset animation state
    if (showAnimation) {
      const timer = setTimeout(() => setShowAnimation(false), 500);
      return () => clearTimeout(timer);
    }
  }, [count, dailyGoal, showAnimation]);

  const loadUserData = async (userId: string) => {
    // Load user's goal
    const { data: goalData } = await supabase
      .from('goals')
      .select('daily_target')
      .eq('user_id', userId)
      .single();

    if (goalData) {
      setDailyGoal(goalData.daily_target);
    }

    // Load today's pushups
    const today = new Date().toISOString().split('T')[0];
    const { data: todayData } = await supabase
      .from('pushup_records')
      .select('count')
      .eq('user_id', userId)
      .gte('created_at', today)
      .lt('created_at', new Date(new Date().setDate(new Date().getDate() + 1)).toISOString())
      .single();

    if (todayData) {
      setCount(todayData.count);
    }

    // Load past week data
    const pastWeek = new Date();
    pastWeek.setDate(pastWeek.getDate() - 7);
    const { data: weekData } = await supabase
      .from('pushup_records')
      .select('count, created_at')
      .eq('user_id', userId)
      .gte('created_at', pastWeek.toISOString())
      .order('created_at', { ascending: true });

    if (weekData) {
      const labels = [];
      const data = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const record = weekData.find(d => d.created_at.startsWith(dateStr));
        labels.push(i === 0 ? 'Today' : `${i} days ago`);
        data.push(record ? record.count : 0);
      }
      setPastWeekData({
        labels,
        datasets: [{
          label: 'Daily Pushups',
          data,
          fill: false,
          borderColor: 'rgb(59, 130, 246)',
          tension: 0.1
        }]
      });
    }

    // Calculate streak
    let currentStreak = 0;
    let date = new Date();
    while (true) {
      const dateStr = date.toISOString().split('T')[0];
      const record = weekData?.find(d => d.created_at.startsWith(dateStr));
      if (!record || record.count === 0) break;
      currentStreak++;
      date.setDate(date.getDate() - 1);
    }
    setStreak(currentStreak);
  };

  const addPushups = async () => {
    const numPushups = parseInt(inputCount) || 0;
    if (numPushups > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data: existingRecord } = await supabase
        .from('pushup_records')
        .select('id, count')
        .eq('user_id', user.id)
        .gte('created_at', today)
        .lt('created_at', new Date(new Date().setDate(new Date().getDate() + 1)).toISOString())
        .single();

      if (existingRecord) {
        const newCount = existingRecord.count + numPushups;
        await supabase
          .from('pushup_records')
          .update({ count: newCount })
          .eq('id', existingRecord.id);
        setCount(newCount);
      } else {
        await supabase
          .from('pushup_records')
          .insert([{ user_id: user.id, count: numPushups }]);
        setCount(numPushups);
      }

      setShowAnimation(true);
      setInputCount('');
      loadUserData(user.id);
    }
  };

  const incrementCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const { data: existingRecord } = await supabase
      .from('pushup_records')
      .select('id, count')
      .eq('user_id', user.id)
      .gte('created_at', today)
      .lt('created_at', new Date(new Date().setDate(new Date().getDate() + 1)).toISOString())
      .single();

    if (existingRecord) {
      const newCount = existingRecord.count + 1;
      await supabase
        .from('pushup_records')
        .update({ count: newCount })
        .eq('id', existingRecord.id);
      setCount(newCount);
    } else {
      await supabase
        .from('pushup_records')
        .insert([{ user_id: user.id, count: 1 }]);
      setCount(1);
    }

    setShowAnimation(true);
    loadUserData(user.id);
  };

  const resetCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const { data: existingRecord } = await supabase
      .from('pushup_records')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', today)
      .lt('created_at', new Date(new Date().setDate(new Date().getDate() + 1)).toISOString())
      .single();

    if (existingRecord) {
      await supabase
        .from('pushup_records')
        .delete()
        .eq('id', existingRecord.id);
    }

    setCount(0);
    setMessage('');
    loadUserData(user.id);
  };

  const updateGoal = async () => {
    const goal = parseInt(newGoal);
    if (goal > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingGoal } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingGoal) {
        await supabase
          .from('goals')
          .update({ daily_target: goal })
          .eq('id', existingGoal.id);
      } else {
        await supabase
          .from('goals')
          .insert([{ user_id: user.id, daily_target: goal }]);
      }

      setDailyGoal(goal);
      setNewGoal('');
      setIsEditingGoal(false);
      loadUserData(user.id);
    }
  };

  const progressWidth = `${Math.min((count / dailyGoal) * 100, 100)}%`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <main className="max-w-md mx-auto pt-12 flex flex-col items-center gap-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PushUp Tracker</h1>
        
        <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col items-center gap-4">
          <div className={`text-6xl font-bold text-blue-600 dark:text-blue-400 transition-transform duration-200 ${showAnimation ? 'scale-110' : 'scale-100'}`}>
            {count}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            <div 
              className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-500 ease-out rounded-full"
              style={{ width: progressWidth }}
            />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
            Today&apos;s Goal: {count}/{dailyGoal}
            <button
              onClick={() => setIsEditingGoal(true)}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ✏️
            </button>
          </div>
          {isEditingGoal && (
            <div className="flex gap-2">
              <input
                type="number"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="New goal"
                min="1"
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white w-24"
              />
              <button
                onClick={updateGoal}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                Set
              </button>
              <button
                onClick={() => setIsEditingGoal(false)}
                className="px-3 py-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="text-sm font-medium text-blue-600 dark:text-blue-400 min-h-[1.5rem] text-center">
            {message}
          </div>
          <div className="flex flex-col w-full gap-4 mt-4">
            <div className="flex gap-2">
              <input
                type="number"
                value={inputCount}
                onChange={(e) => setInputCount(e.target.value)}
                placeholder="Enter pushups"
                min="0"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={addPushups}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={incrementCount}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Add PushUp
              </button>
              <button
                onClick={resetCount}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Progress Chart</h2>
          <div className="w-full h-64">
            <Line options={chartOptions} data={pastWeekData} />
          </div>
        </div>

        <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Stats</h2>
          <div className="flex justify-between items-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{streak}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Day Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{count}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Today's Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{Math.round((count/dailyGoal) * 100)}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Goal Progress</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <Link href="/calendar" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-2">
            View Calendar 📅
          </Link>
          <div className="text-center text-gray-600 dark:text-gray-300 text-sm italic">
            &quot;Success is not final, failure is not fatal: it is the courage to continue that counts.&quot;
          </div>
        </div>
      </main>
    </div>
  );
}
