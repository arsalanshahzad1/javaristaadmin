import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const DEFAULT_COLORS = ['#D62B2B', '#E84040', '#A01E1E', '#c0392b', '#922b21'];

interface PieChartProps {
  data: { name: string; value: number }[];
  height?: number;
  colors?: string[];
  title?: string;
  showLegend?: boolean;
}

export function PieChart({ data, height = 220, colors = DEFAULT_COLORS, title, showLegend = true }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div>
      {title && <h3 className="text-sm font-medium text-white mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RePieChart>
          <Pie data={data} cx="50%" cy="45%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
            itemStyle={{ color: '#fff' }}
          />
        </RePieChart>
      </ResponsiveContainer>
      {showLegend && (
        <div className="flex flex-col gap-2 mt-3">
          {data.map((item, i) => {
            const pct = total ? ((item.value / total) * 100).toFixed(1) : '0.0';

            return (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
                  <span className="text-[#999]">{item.name}</span>
                </div>
                <span className="text-white font-medium">
                  {item.value.toLocaleString()}{' '}
                  <span className="text-[#555] font-normal">({pct}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
