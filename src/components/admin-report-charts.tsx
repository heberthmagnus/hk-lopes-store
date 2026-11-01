"use client";

type ChartDatum = {
  label: string;
  value: number;
};

type ReportBarChartProps = {
  title: string;
  subtitle: string;
  items: ChartDatum[];
  formatter: (value: number) => string;
};

type ReportTrendPoint = {
  label: string;
  revenue: number;
  profit: number;
};

type ReportTrendChartProps = {
  title: string;
  subtitle: string;
  points: ReportTrendPoint[];
  formatter: (value: number) => string;
  mode?: "line" | "bar";
  seriesLabel?: string;
};

type ReportDonutChartProps = {
  title: string;
  subtitle: string;
  items: ChartDatum[];
  formatter: (value: number) => string;
  variant?: "donut" | "pie";
};

type ReportRankListProps = {
  title: string;
  subtitle: string;
  items: Array<{ label: string; primary: string; secondary: string }>;
};

function getPlotPoints(values: number[], width: number, height: number, padding: number) {
  if (!values.length) {
    return [];
  }

  const maxValue = Math.max(...values, 1);
  const stepX = values.length === 1 ? 0 : (width - padding * 2) / (values.length - 1);

  return values.map((value, index) => ({
    x: padding + stepX * index,
    y: height - padding - (value / maxValue) * (height - padding * 2),
  }));
}

function buildSmoothPath(values: number[], width: number, height: number, padding: number) {
  const points = getPlotPoints(values, width, height, padding);

  if (!points.length) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previous = points[index - 1];
    const midpointX = (previous.x + point.x) / 2;
    return `${path} Q ${previous.x} ${previous.y} ${midpointX} ${(previous.y + point.y) / 2}`;
  }, "") + ` T ${points[points.length - 1].x} ${points[points.length - 1].y}`;
}

function buildAreaPath(values: number[], width: number, height: number, padding: number) {
  const points = getPlotPoints(values, width, height, padding);

  if (!points.length) {
    return "";
  }

  const line = buildSmoothPath(values, width, height, padding);
  const baseline = height - padding;
  const endX = points[points.length - 1].x;

  return `${line} L ${endX} ${baseline} L ${points[0].x} ${baseline} Z`;
}

export function ReportBarChart({ title, subtitle, items, formatter }: ReportBarChartProps) {
  const safeItems = items.filter((item) => item.value > 0).slice(0, 6);
  const maxValue = Math.max(...safeItems.map((item) => item.value), 1);

  return (
    <section className="report-chart-card">
      <div className="report-chart-card__header">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>

      {!safeItems.length ? (
        <div className="empty-state">Sem dados suficientes neste periodo.</div>
      ) : (
        <div className="report-bar-list">
          {safeItems.map((item) => (
            <article key={item.label} className="report-bar-row">
              <div className="report-bar-row__copy">
                <strong>{item.label}</strong>
                <span>{formatter(item.value)}</span>
              </div>
              <div className="report-bar-track">
                <div
                  className="report-bar-fill"
                  style={{ width: `${Math.max((item.value / maxValue) * 100, 6)}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function ReportTrendChart({
  title,
  subtitle,
  points,
  formatter,
  mode = "line",
  seriesLabel,
}: ReportTrendChartProps) {
  const safePoints = points.slice(-12);
  const revenueValues = safePoints.map((point) => point.revenue);
  const maxValue = Math.max(...revenueValues, 1);
  const width = 480;
  const height = 220;
  const padding = 20;
  const chartHeight = height - padding * 2;
  const stepX = safePoints.length <= 1 ? 0 : (width - padding * 2) / (safePoints.length - 1);
  const gradientId = `report-area-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  return (
    <section className="report-chart-card">
      <div className="report-chart-card__header">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>

      {!safePoints.length ? (
        <div className="empty-state">Sem vendas no periodo selecionado.</div>
      ) : (
        <>
          <div className="report-trend-chart">
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
              {mode === "line" ? (
                <defs>
                  <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#3ea0ff" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3ea0ff" stopOpacity="0" />
                  </linearGradient>
                  <filter id={`${gradientId}-glow`} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
              ) : null}
              {[0, 1, 2, 3].map((step) => {
                const y = padding + ((height - padding * 2) / 3) * step;
                const value = maxValue - (maxValue / 3) * step;

                return (
                  <g key={step}>
                    <line
                      x1={padding}
                      y1={y}
                      x2={width - padding}
                      y2={y}
                      className="report-trend-chart__grid"
                    />
                    <text x={0} y={y + 4} className="report-trend-chart__axis">
                      {formatter(Math.max(value, 0))}
                    </text>
                  </g>
                );
              })}

              {mode === "line" ? (
                <>
                  <path d={buildAreaPath(revenueValues, width, height, padding)} className="report-trend-chart__area" fill={`url(#${gradientId})`} />
                  <path
                    d={buildSmoothPath(revenueValues, width, height, padding)}
                    className="report-trend-chart__line report-trend-chart__line--revenue"
                    filter={`url(#${gradientId}-glow)`}
                  />
                  {revenueValues.map((value, index) => {
                    const x = padding + stepX * index;
                    const y = height - padding - (value / maxValue) * chartHeight;
                    return <circle key={`${title}-${index}`} cx={x} cy={y} r="3.8" className="report-trend-chart__dot" />;
                  })}
                </>
              ) : (
                revenueValues.map((value, index) => {
                  const slot = (width - padding * 2) / safePoints.length;
                  const barWidth = Math.max(slot * 0.72, 14);
                  const x = padding + slot * index + (slot - barWidth) / 2;
                  const barHeight = (value / maxValue) * chartHeight;
                  const y = height - padding - barHeight;

                  return (
                    <rect
                      key={`${title}-${index}`}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="0"
                      className="report-trend-chart__bar"
                    />
                  );
                })
              )}
            </svg>
          </div>

          <div className="report-trend-chart__legend">
            <span>
              <i className={`report-trend-chart__swatch ${mode === "line" ? "report-trend-chart__swatch--revenue" : "report-trend-chart__swatch--bar"}`} />
              {seriesLabel ?? (mode === "line" ? "Faturamento" : "Lucro")}
            </span>
          </div>

          <div className="report-trend-chart__labels">
            {safePoints.map((point) => (
              <span key={point.label}>{point.label}</span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export function ReportDonutChart({
  title,
  subtitle,
  items,
  formatter,
  variant = "donut",
}: ReportDonutChartProps) {
  const safeItems = items.filter((item) => item.value > 0).slice(0, 6);
  const total = safeItems.reduce((sum, item) => sum + item.value, 0);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const palette = ["#ff6900", "#fad214", "#28b473", "#0f3c78", "#0a1e37", "#e13732"];

  return (
    <section className="report-chart-card">
      <div className="report-chart-card__header">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>

      {!safeItems.length ? (
        <div className="empty-state">Sem dados suficientes neste periodo.</div>
      ) : (
        <div className="report-donut">
          <svg viewBox="0 0 200 200" className="report-donut__chart" role="img" aria-label={title}>
            <circle cx="100" cy="100" r={radius} className="report-donut__track" />
            {safeItems.map((item, index) => {
              const fraction = total ? item.value / total : 0;
              const dash = circumference * fraction;
              const dashArray = `${dash} ${circumference - dash}`;
              const strokeDashoffset = -offset;
              offset += dash;

              return (
                <circle
                  key={item.label}
                  cx="100"
                  cy="100"
                  r={radius}
                  className="report-donut__slice"
                  style={{
                    stroke: palette[index % palette.length],
                    strokeDasharray: dashArray,
                    strokeDashoffset,
                  }}
                />
              );
            })}
            <text x="100" y="95" textAnchor="middle" className="report-donut__total-label">
              {variant === "pie" ? "Receita" : "Total"}
            </text>
            <text x="100" y="118" textAnchor="middle" className="report-donut__total-value">
              {formatter(total)}
            </text>
          </svg>

          <div className="report-donut__legend">
            {safeItems.map((item, index) => (
              <div key={item.label} className="report-donut__legend-item">
                <span
                  className="report-donut__dot"
                  style={{ background: palette[index % palette.length] }}
                />
                <div>
                  <strong>{item.label}</strong>
                  <span>
                    {formatter(item.value)} · {total ? Math.round((item.value / total) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function ReportRankList({ title, subtitle, items }: ReportRankListProps) {
  return (
    <section className="report-chart-card">
      <div className="report-chart-card__header">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>

      {!items.length ? (
        <div className="empty-state">Sem dados suficientes neste periodo.</div>
      ) : (
        <div className="report-rank-list">
          {items.map((item, index) => (
            <article key={`${item.label}-${index}`} className="report-rank-item">
              <div>
                <div className="report-rank-item__name">{index + 1}. {item.label}</div>
                <div className="report-rank-item__meta">{item.secondary}</div>
              </div>
              <span className="report-rank-item__badge">{item.primary}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
