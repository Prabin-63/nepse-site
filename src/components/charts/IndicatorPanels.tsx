import { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ReferenceLine, ComposedChart, Cell,
} from 'recharts';
import type { OHLCVBar } from '../../utils/indicators';
import {
  calcRSI, calcMACD, calcStochastic, calcATR, calcOBV, calcWilliamsR,
} from '../../utils/indicators';

const CHART_THEME = {
  bg: '#0A0F1E',
  grid: '#1A2240',
  text: '#4A5880',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-xs font-jetbrains shadow-xl">
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: <span className="text-text-primary font-bold">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  );
};
export function RSIPanel({ data }: { data: OHLCVBar[] }) {
  const rsi = useMemo(() => calcRSI(data), [data]);
  const chartData = data.map((d, i) => ({ date: d.date, rsi: rsi[i] })).filter(d => d.rsi !== null);
  const last = chartData[chartData.length - 1]?.rsi ?? 0;
  const color = (last as number) > 70 ? '#FF4D4F' : (last as number) < 30 ? '#00C48C' : '#00D4FF';

  return (
    <div className="h-full w-full">
      <div className="px-3 py-1 flex items-center gap-3">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">RSI (14)</span>
        <span className="font-jetbrains text-xs font-bold" style={{ color }}>{(last as number).toFixed(1)}</span>
        <span className="text-[10px] text-text-muted">{(last as number) > 70 ? 'Overbought' : (last as number) < 30 ? 'Oversold' : 'Neutral'}</span>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData} margin={{ left: 0, right: 55, top: 5, bottom: 5 }}>
          <XAxis dataKey="date" hide />
          <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tickFormatter={v => `${v}`} tick={{ fill: CHART_THEME.text, fontSize: 9 }} width={32} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={70} stroke="#FF4D4F" strokeDasharray="3 3" strokeWidth={1} />
          <ReferenceLine y={50} stroke="#4A5880" strokeDasharray="3 3" strokeWidth={1} />
          <ReferenceLine y={30} stroke="#00C48C" strokeDasharray="3 3" strokeWidth={1} />
          <Line dataKey="rsi" name="RSI" dot={false} strokeWidth={1.5} stroke="#00D4FF" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export function MACDPanel({ data }: { data: OHLCVBar[] }) {
  const { macdLine, signalLine, histogram } = useMemo(() => calcMACD(data), [data]);
  const chartData = data.map((d, i) => ({
    date: d.date,
    macd: macdLine[i],
    signal: signalLine[i],
    hist: histogram[i],
  })).filter(d => d.macd !== null);
  const last = macdLine[macdLine.length - 1] ?? 0;
  const lastSig = signalLine[signalLine.length - 1] ?? 0;

  return (
    <div className="h-full w-full">
      <div className="px-3 py-1 flex items-center gap-3">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">MACD (12,26,9)</span>
        <span className="font-jetbrains text-xs font-bold text-brand-cyan">{(last as number).toFixed(2)}</span>
        <span className="font-jetbrains text-xs text-bear-red">{(lastSig as number).toFixed(2)}</span>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <ComposedChart data={chartData} margin={{ left: 0, right: 55, top: 5, bottom: 5 }}>
          <XAxis dataKey="date" hide />
          <YAxis tick={{ fill: CHART_THEME.text, fontSize: 9 }} width={32} tickFormatter={v => v.toFixed(1)} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#4A5880" strokeWidth={1} />
          <Bar dataKey="hist" name="Hist" isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={(entry.hist as number) >= 0 ? 'rgba(0,196,140,0.7)' : 'rgba(255,77,79,0.7)'} />
            ))}
          </Bar>
          <Line dataKey="macd" name="MACD" dot={false} strokeWidth={1.5} stroke="#00D4FF" isAnimationActive={false} />
          <Line dataKey="signal" name="Signal" dot={false} strokeWidth={1.5} stroke="#FF4D4F" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
export function StochasticPanel({ data }: { data: OHLCVBar[] }) {
  const { k, d: stochD } = useMemo(() => calcStochastic(data), [data]);
  const chartData = data.map((bar, i) => ({ date: bar.date, k: k[i], d: stochD[i] })).filter(item => item.k !== null);

  return (
    <div className="h-full w-full">
      <div className="px-3 py-1 flex items-center gap-3">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Stochastic (14,3,3)</span>
        <span className="font-jetbrains text-xs text-brand-gold">%K: {(k[k.length - 1] as number ?? 0).toFixed(1)}</span>
        <span className="font-jetbrains text-xs text-bear-red">%D: {(stochD[stochD.length - 1] as number ?? 0).toFixed(1)}</span>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData} margin={{ left: 0, right: 55, top: 5, bottom: 5 }}>
          <XAxis dataKey="date" hide />
          <YAxis domain={[0, 100]} ticks={[20, 50, 80]} tick={{ fill: CHART_THEME.text, fontSize: 9 }} width={32} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={80} stroke="#FF4D4F" strokeDasharray="3 3" strokeWidth={1} />
          <ReferenceLine y={50} stroke="#4A5880" strokeDasharray="3 3" strokeWidth={1} />
          <ReferenceLine y={20} stroke="#00C48C" strokeDasharray="3 3" strokeWidth={1} />
          <Line dataKey="k" name="%K" dot={false} strokeWidth={1.5} stroke="#F5A623" isAnimationActive={false} />
          <Line dataKey="d" name="%D" dot={false} strokeWidth={1.5} stroke="#FF4D4F" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export function ATRPanel({ data }: { data: OHLCVBar[] }) {
  const atr = useMemo(() => calcATR(data), [data]);
  const chartData = data.map((d, i) => ({ date: d.date, atr: atr[i] })).filter(d => d.atr !== null);
  const last = atr.filter(Boolean).pop() ?? 0;

  return (
    <div className="h-full w-full">
      <div className="px-3 py-1 flex items-center gap-3">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">ATR (14)</span>
        <span className="font-jetbrains text-xs text-brand-violet font-bold">{(last as number).toFixed(2)}</span>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData} margin={{ left: 0, right: 55, top: 5, bottom: 5 }}>
          <XAxis dataKey="date" hide />
          <YAxis tick={{ fill: CHART_THEME.text, fontSize: 9 }} width={45} tickFormatter={v => v.toFixed(1)} />
          <Tooltip content={<CustomTooltip />} />
          <Line dataKey="atr" name="ATR" dot={false} strokeWidth={1.5} stroke="#8B5CF6" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export function OBVPanel({ data }: { data: OHLCVBar[] }) {
  const obv = useMemo(() => calcOBV(data), [data]);
  const chartData = data.map((d, i) => ({ date: d.date, obv: obv[i] }));
  const last = obv[obv.length - 1] ?? 0;
  const fmt = (v: number) => Math.abs(v) > 1e6 ? `${(v / 1e6).toFixed(1)}M` : Math.abs(v) > 1e3 ? `${(v / 1e3).toFixed(0)}K` : `${v}`;

  return (
    <div className="h-full w-full">
      <div className="px-3 py-1 flex items-center gap-3">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">OBV</span>
        <span className="font-jetbrains text-xs text-bull-green font-bold">{fmt(last)}</span>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData} margin={{ left: 0, right: 55, top: 5, bottom: 5 }}>
          <XAxis dataKey="date" hide />
          <YAxis tick={{ fill: CHART_THEME.text, fontSize: 9 }} width={45} tickFormatter={fmt} />
          <Tooltip content={<CustomTooltip />} />
          <Line dataKey="obv" name="OBV" dot={false} strokeWidth={1.5} stroke="#00C48C" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export function WilliamsRPanel({ data }: { data: OHLCVBar[] }) {
  const wr = useMemo(() => calcWilliamsR(data), [data]);
  const chartData = data.map((d, i) => ({ date: d.date, wr: wr[i] })).filter(d => d.wr !== null);
  const last = wr.filter(v => v !== null).pop() ?? 0;
  const color = (last as number) < -80 ? '#00C48C' : (last as number) > -20 ? '#FF4D4F' : '#00D4FF';

  return (
    <div className="h-full w-full">
      <div className="px-3 py-1 flex items-center gap-3">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Williams %R (14)</span>
        <span className="font-jetbrains text-xs font-bold" style={{ color }}>{(last as number).toFixed(1)}</span>
        <span className="text-[10px] text-text-muted">{(last as number) < -80 ? 'Oversold' : (last as number) > -20 ? 'Overbought' : 'Neutral'}</span>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData} margin={{ left: 0, right: 55, top: 5, bottom: 5 }}>
          <XAxis dataKey="date" hide />
          <YAxis domain={[-100, 0]} ticks={[-80, -50, -20]} tick={{ fill: CHART_THEME.text, fontSize: 9 }} width={36} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={-20} stroke="#FF4D4F" strokeDasharray="3 3" strokeWidth={1} />
          <ReferenceLine y={-50} stroke="#4A5880" strokeDasharray="3 3" strokeWidth={1} />
          <ReferenceLine y={-80} stroke="#00C48C" strokeDasharray="3 3" strokeWidth={1} />
          <Line dataKey="wr" name="%R" dot={false} strokeWidth={1.5} stroke="#00D4FF" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export function VolumePanel({ data }: { data: OHLCVBar[] }) {
  const chartData = data.map(d => ({ date: d.date, volume: d.volume, color: d.close >= d.open }));
  const fmt = (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : `${v}`;

  return (
    <div className="h-full w-full">
      <div className="px-3 py-1">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Volume</span>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={chartData} margin={{ left: 0, right: 55, top: 5, bottom: 5 }}>
          <XAxis dataKey="date" hide />
          <YAxis tick={{ fill: CHART_THEME.text, fontSize: 9 }} width={45} tickFormatter={fmt} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="volume" name="Volume" isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color ? 'rgba(0,196,140,0.6)' : 'rgba(255,77,79,0.6)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
