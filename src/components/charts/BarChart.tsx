import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  title?: string;
  /** When true, renders horizontal bars (method names on Y, counts on X) */
  horizontal?: boolean;
  /** Y-axis label width when horizontal=true */
  yAxisWidth?: number;
}

export function BarChart({
  data,
  xKey,
  yKey,
  color = '#D62B2B',
  height = 220,
  title,
  horizontal = false,
  yAxisWidth = 90,
}: BarChartProps) {
  if (horizontal) {
    return (
      <div>
        {title && <h3 className="text-sm font-medium text-white mb-4">{title}</h3>}
        <ResponsiveContainer width="100%" height={height}>
          <ReBarChart data={data} layout="vertical" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey={xKey}
              tick={{ fill: '#999', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={yAxisWidth}
            />
            <Tooltip
              contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#999' }}
              cursor={{ fill: '#2A2A2A' }}
            />
            <Bar dataKey={yKey} fill={color} radius={[0, 4, 4, 0]} />
          </ReBarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div>
      {title && <h3 className="text-sm font-medium text-white mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <ReBarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#999' }}
            cursor={{ fill: '#2A2A2A' }}
          />
          <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
}
