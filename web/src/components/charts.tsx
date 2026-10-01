'use client';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#16a34a', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

export function TrendChart({
  data,
  xKey = 'label',
  yKey = 'value',
  type = 'area',
  height = 260,
  color = '#16a34a',
}: {
  data: any[];
  xKey?: string;
  yKey?: string;
  type?: 'area' | 'line' | 'bar';
  height?: number;
  color?: string;
}) {
  const grid = <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />;
  const axes = (
    <>
      <XAxis dataKey={xKey} tickLine={false} axisLine={false} fontSize={12} />
      <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
      <Tooltip />
    </>
  );
  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === 'bar' ? (
        <BarChart data={data}>{grid}{axes}<Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} /></BarChart>
      ) : type === 'line' ? (
        <LineChart data={data}>{grid}{axes}<Line dataKey={yKey} stroke={color} strokeWidth={2} dot={false} /></LineChart>
      ) : (
        <AreaChart data={data}>
          {grid}{axes}
          <defs>
            <linearGradient id={`g-${yKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area dataKey={yKey} stroke={color} strokeWidth={2} fill={`url(#g-${yKey})`} />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}

export function MacroPie({ data, height = 240 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
