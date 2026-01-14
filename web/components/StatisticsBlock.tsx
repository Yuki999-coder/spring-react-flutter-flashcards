'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Flame, TrendingUp, BookOpen } from 'lucide-react';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

interface StatisticsSummary {
  streak: number;
  totalCardsLearned: number;
  dueCardsCount: number;
  heatmapData: Record<string, number>;
  pieChartData: {
    newCards: number;
    learningCards: number;
    reviewingCards: number;
    relearningCards: number;
  };
}

const COLORS = {
  new: '#94a3b8',       // Slate-400 (Gray)
  learning: '#fbbf24',  // Amber-400 (Yellow)
  reviewing: '#34d399', // Emerald-400 (Green)
  relearning: '#f87171', // Red-400
};

export function StatisticsBlock() {
  const [stats, setStats] = useState<StatisticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/statistics/summary');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error('Không thể tải thống kê');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border-2 p-8 mb-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-32 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Prepare pie chart data
  const pieData = [
    { name: 'Mới', value: stats.pieChartData.newCards, color: COLORS.new },
    { name: 'Đang học', value: stats.pieChartData.learningCards, color: COLORS.learning },
    { name: 'Ôn tập', value: stats.pieChartData.reviewingCards, color: COLORS.reviewing },
    { name: 'Học lại', value: stats.pieChartData.relearningCards, color: COLORS.relearning },
  ].filter(item => item.value > 0);

  // Prepare heatmap data (last 52 weeks)
  const heatmapData = prepareHeatmapData(stats.heatmapData);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border-2 p-8 mb-8 page-enter">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent mb-6">
        📊 Thống kê học tập
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Due Cards - MOST IMPORTANT */}
        <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border-2 border-red-300 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-red-700">Cần ôn tập ngay</div>
            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">
              !
            </div>
          </div>
          <div className="text-4xl font-bold text-red-600">
            {stats.dueCardsCount}
            <span className="text-lg ml-2 text-red-500">thẻ</span>
          </div>
          <div className="text-xs text-red-600 mt-2">
            {stats.dueCardsCount > 0 ? '🔴 Đến hạn ôn tập' : '✅ Không có thẻ đến hạn'}
          </div>
        </div>

        {/* Streak Card */}
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border-2 border-orange-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-orange-700">Chuỗi ngày học</div>
            <Flame className="w-8 h-8 text-orange-500" />
          </div>
          <div className="text-4xl font-bold text-orange-600">
            {stats.streak}
            <span className="text-lg ml-2 text-orange-500">ngày</span>
          </div>
          <div className="text-xs text-orange-600 mt-2">
            {stats.streak > 0 ? '🔥 Tiếp tục phát huy!' : 'Hãy bắt đầu học hôm nay!'}
          </div>
        </div>

        {/* Total Cards Learned */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-blue-700">Tổng thẻ đã học</div>
            <BookOpen className="w-8 h-8 text-blue-500" />
          </div>
          <div className="text-4xl font-bold text-blue-600">
            {stats.totalCardsLearned}
            <span className="text-lg ml-2 text-blue-500">thẻ</span>
          </div>
          <div className="text-xs text-blue-600 mt-2">
            Tổng số thẻ duy nhất đã học
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-green-700">Tiến độ</div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
          <div className="text-4xl font-bold text-green-600">
            {calculateProgress(stats.pieChartData)}%
          </div>
          <div className="text-xs text-green-600 mt-2">
            Thẻ đang ôn tập / tổng thẻ
          </div>
        </div>
      </div>

      {/* Heatmap and Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap */}
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            Lịch sử học tập (365 ngày)
          </h3>
          <div className="overflow-x-auto">
            <Heatmap data={heatmapData} />
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
            <span>Ít</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-slate-100 rounded-sm border"></div>
              <div className="w-3 h-3 bg-emerald-200 rounded-sm"></div>
              <div className="w-3 h-3 bg-emerald-400 rounded-sm"></div>
              <div className="w-3 h-3 bg-emerald-600 rounded-sm"></div>
              <div className="w-3 h-3 bg-emerald-800 rounded-sm"></div>
            </div>
            <span>Nhiều</span>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            Phân bố trạng thái thẻ
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Chưa có thẻ nào
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Heatmap Component
interface HeatmapProps {
  data: { date: string; count: number }[];
}

function Heatmap({ data }: HeatmapProps) {
  // Group by week
  const weeks: { date: string; count: number }[][] = [];
  let currentWeek: { date: string; count: number }[] = [];
  
  data.forEach((day, index) => {
    currentWeek.push(day);
    if ((index + 1) % 7 === 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Show last 52 weeks
  const last52Weeks = weeks.slice(-52);

  return (
    <div className="flex gap-1">
      {last52Weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="flex flex-col gap-1">
          {week.map((day, dayIndex) => (
            <HeatmapCell key={dayIndex} date={day.date} count={day.count} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Heatmap Cell
interface HeatmapCellProps {
  date: string;
  count: number;
}

function HeatmapCell({ date, count }: HeatmapCellProps) {
  const getColor = (count: number) => {
    if (count === 0) return 'bg-slate-100';
    if (count <= 2) return 'bg-emerald-200';
    if (count <= 5) return 'bg-emerald-400';
    if (count <= 10) return 'bg-emerald-600';
    return 'bg-emerald-800';
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div
      className={`w-3 h-3 rounded-sm border border-slate-200 ${getColor(count)} hover:ring-2 hover:ring-primary transition-all cursor-pointer`}
      title={`${formatDate(date)}: ${count} thẻ`}
    />
  );
}

// Helper functions
function prepareHeatmapData(heatmapData: Record<string, number>) {
  return Object.entries(heatmapData).map(([date, count]) => ({
    date,
    count,
  }));
}

function calculateProgress(pieChartData: StatisticsSummary['pieChartData']) {
  const total =
    pieChartData.newCards +
    pieChartData.learningCards +
    pieChartData.reviewingCards +
    pieChartData.relearningCards;
  
  if (total === 0) return 0;
  
  return Math.round((pieChartData.reviewingCards / total) * 100);
}

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs font-bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}
