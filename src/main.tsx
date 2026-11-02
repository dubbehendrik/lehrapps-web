import { Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { appRegistry } from './appRegistry';
import { SiteHeader } from './components/SiteHeader';
import { AppOverview } from './components/AppOverview';
import './styles/global.css';
function PageTitle() {
  const { pathname } = useLocation();
  const name = appRegistry.find(app => app.path === pathname)?.name;
  useEffect(() => { document.title = name ? `Lehr-Apps · ${name}` : 'Lehr-Apps · Hochschule Esslingen'; }, [name]);
  const { search } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname, search]);
  return null;
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><PageTitle/><SiteHeader/><main><Suspense fallback={<p>App wird geladen …</p>}><Routes><Route path="/" element={<AppOverview/>}/><Route path="/waermeleitung" element={<Navigate to="/Temperaturverteilung" replace/>}/>{appRegistry.map(({path,component: Component})=><Route key={path} path={path} element={<Component/>}/>)}<Route path="*" element={<><h1>Seite nicht gefunden</h1><Link to="/">Zu den Lehr-Apps</Link></>}/></Routes></Suspense></main></BrowserRouter>);
