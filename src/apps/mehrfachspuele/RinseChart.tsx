import { useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-basic-dist-min';
import type { Data, Layout } from 'plotly.js';
const Plot = createPlotlyComponent(Plotly);
/** Allow annotation boxes to move while their data anchors remain fixed. */
export function RinseChart({ title, description, data, layout }: { title: string; description: string; data: Data[]; layout: Partial<Layout> }) {
  const [positions, setPositions] = useState<Record<string, { ax: number; ay: number }>>({});
  const legendHeight = data.filter(trace => 'showlegend' in trace && trace.showlegend).length * 26 + 40;
  const height = 460 + legendHeight;
  const annotations = layout.annotations?.map(a => ({ ...a, ...(positions[`${a.text}:${a.x}:${a.y}`] ?? {}) }));
  return <figure aria-label={title}><figcaption><h2>{title}</h2><p>{description} Eingriffskästen lassen sich mit der Maus verschieben.</p></figcaption>
    <Plot data={data} layout={{ autosize: true, height, font: { size: 16 }, paper_bgcolor: '#fff', plot_bgcolor: '#fff', ...layout, annotations, margin: { ...layout.margin, b: 75 + legendHeight }, legend: { orientation: 'v', x: 0, y: -0.22, xanchor: 'left', yanchor: 'top', font: { size: 15 } } }}
      config={{ responsive: true, displaylogo: false, edits: { annotationTail: true }, toImageButtonOptions: { format: 'png', filename: title } }}
      onRelayout={event => {
        const updates: Record<string, { ax: number; ay: number }> = {};
        annotations?.forEach((a, i) => {
          const ax = (event as Record<string, unknown>)[`annotations[${i}].ax`], ay = (event as Record<string, unknown>)[`annotations[${i}].ay`];
          if (typeof ax === 'number' || typeof ay === 'number') updates[`${a.text}:${a.x}:${a.y}`] = { ax: typeof ax === 'number' ? ax : Number(a.ax), ay: typeof ay === 'number' ? ay : Number(a.ay) };
        });
        if (Object.keys(updates).length) setPositions(old => ({ ...old, ...updates }));
      }} useResizeHandler className="rinse-chart" style={{ width: '100%', height }} />
  </figure>;
}
