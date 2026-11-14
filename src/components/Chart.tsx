import type { ReactNode } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-basic-dist-min';
import type { Data, Layout, PlotMouseEvent, LegendClickEvent } from 'plotly.js';
const Plot = createPlotlyComponent(Plotly);
export function Chart({ title, description, data, layout, height = 370, onHover, onLegendClick, onLegendDoubleClick }: { title: string; description: ReactNode; data: Data[]; layout: Partial<Layout>; height?: number; onHover?: (event: PlotMouseEvent) => void; onLegendClick?: (event: Readonly<LegendClickEvent>) => boolean; onLegendDoubleClick?: (event: Readonly<LegendClickEvent>) => boolean }) {
  return <figure aria-label={title}><figcaption><h2>{title}</h2><p>{description}</p></figcaption><Plot data={data} layout={{ autosize: true, height, margin: { l: 65, r: 20, t: 30, b: 95 }, font: { size: 16 }, paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff', ...layout }} config={{ responsive: true, displaylogo: false, toImageButtonOptions: { format: 'png', filename: title } }} onHover={onHover} onLegendClick={onLegendClick} onLegendDoubleClick={onLegendDoubleClick} useResizeHandler style={{ width: '100%', height: `${height}px`, display: 'block' }} /></figure>;
}
