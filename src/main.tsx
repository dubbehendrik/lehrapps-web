import { Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { appRegistry } from './appRegistry';
import { AppOverview } from './components/AppOverview';
import './styles/global.css';
function PageTitle() {
  const { pathname } = useLocation();
  const name = appRegistry.find(app => app.path === pathname)?.name;
  useEffect(() => { document.title = name ? `Lehr-Apps · ${name}` : 'Lehr-Apps · Hochschule Esslingen'; }, [name]);
  return null;
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><PageTitle/><header className="site-header"><Link to="/">Lehr-Apps</Link><nav aria-label="Apps"><NavLink to="/" end>Übersicht</NavLink>{appRegistry.map(app => <NavLink key={app.path} to={app.path}>{app.name}</NavLink>)}</nav><img src="/HSE-Logo.jpg" alt="Hochschule Esslingen"/></header><main><Suspense fallback={<p>App wird geladen …</p>}><Routes><Route path="/" element={<AppOverview/>}/>{appRegistry.map(({path,component: Component})=><Route key={path} path={path} element={<Component/>}/>)}<Route path="*" element={<><h1>Seite nicht gefunden</h1><Link to="/">Zu den Lehr-Apps</Link></>}/></Routes></Suspense></main></BrowserRouter>);
