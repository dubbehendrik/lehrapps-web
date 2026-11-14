import type { ReactNode } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-basic-dist-min';
import type { Data, Layout, PlotMouseEvent } from 'plotly.js';
const Plot = createPlotlyComponent(Plotly);
export function Chart({ title, description, data, layout, height = 370, onHover }: { title: string; description: ReactNode; data: Data[]; layout: Partial<Layout>; height?: number; onHover?: (event: PlotMouseEvent) => void }) {
  return <figure aria-label={title}><figcaption><h2>{title}</h2><p>{description}</p></figcaption><Plot data={data} layout={{ autosize: true, height, margin: { l: 65, r: 20, t: 30, b: 95 }, font: { size: 16 }, paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff', ...layout }} config={{ responsive: true, displaylogo: false, toImageButtonOptions: { format: 'png', filename: title } }} onHover={onHover} useResizeHandler style={{ width: '100%', height: `${height}px`, display: 'block' }} /></figure>;
}
