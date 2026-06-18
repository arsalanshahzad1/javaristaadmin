import { AreaChart as ReAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AreaChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  title?: string;
  height?: number;
  xAxisInterval?: number | 'preserveStart' | 'preserveEnd' | 'preserveStartEnd';
}

export function AreaChart({
  data,
  xKey,
  yKey,
  color = '#D62B2B',
  title,
  height = 220,
  xAxisInterval = 'preserveStartEnd',
}: AreaChartProps) {
  return (
    <div>
      {title && <h3 className="text-sm font-medium text-white mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <ReAreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id={`areaGrad-${yKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
          <XAxis
            dataKey={xKey}
            tick={{ fill: '#666', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={xAxisInterval}
          />
          <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#999' }}
            itemStyle={{ color }}
          />
          <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} fill={`url(#areaGrad-${yKey})`} dot={false} />
        </ReAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
