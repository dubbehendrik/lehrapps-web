import type { ReactNode } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-basic-dist-min';
import type { Data, Layout } from 'plotly.js';
const Plot = createPlotlyComponent(Plotly);
export function Chart({ title, description, data, layout }: { title: string; description: ReactNode; data: Data[]; layout: Partial<Layout> }) {
  return <figure aria-label={title}><figcaption><h2>{title}</h2><p>{description}</p></figcaption><Plot data={data} layout={{ autosize: true, height: 370, margin: { l: 65, r: 20, t: 30, b: 95 }, font: { size: 16 }, paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff', ...layout }} config={{ responsive: true, displaylogo: false, toImageButtonOptions: { format: 'png', filename: title } }} useResizeHandler style={{ width: '100%', height: '370px', display: 'block' }} /></figure>;
}
