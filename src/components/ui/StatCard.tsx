import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
}

const changeConfig = {
  up: { color: 'text-green-400', Icon: TrendingUp },
  down: { color: 'text-red-400', Icon: TrendingDown },
  neutral: { color: 'text-[#666]', Icon: Minus },
};

export function StatCard({ title, value, icon, change, changeType = 'neutral' }: StatCardProps) {
  const { color, Icon } = changeConfig[changeType];

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[#666] text-xs mb-1 truncate">{title}</p>
          <p className="text-2xl font-bold text-white leading-none">{value}</p>
          {change && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${color}`}>
              <Icon size={12} />
              <span>{change}</span>
            </div>
          )}
        </div>
        <div className="shrink-0 p-2.5 rounded-lg bg-[#D62B2B]/10 text-[#D62B2B]">
          {icon}
        </div>
      </div>
    </Card>
  );
}
