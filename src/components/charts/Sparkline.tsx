interface SparklineProps {
  values: number[];
  positive?: boolean;
}

export function Sparkline({ values, positive = true }: SparklineProps) {
  if (values.length < 2) {
    return <span className="text-xs text-slate-400 font-mono">—</span>;
  }

  const width = 88;
  const height = 26;
  const pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const coords = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const strokeColor = positive ? '#0D9488' : '#DC2626';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block overflow-visible"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(' ')}
      />
    </svg>
  );
}
