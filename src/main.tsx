import { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { appRegistry } from './appRegistry';
import './styles/global.css';
createRoot(document.getElementById('root')!).render(<BrowserRouter><header className="site-header"><Link to="/">Lehr-Apps</Link><nav aria-label="Apps">{appRegistry.map(app => <Link key={app.path} to={app.path}>{app.name}</Link>)}</nav><img src="/HSE-Logo.jpg" alt="Hochschule Esslingen"/></header><main><Suspense fallback={<p>App wird geladen …</p>}><Routes><Route path="/" element={<Navigate to={appRegistry[0].path} replace/>}/>{appRegistry.map(({path,component: Component})=><Route key={path} path={path} element={<Component/>}/>)}<Route path="*" element={<><h1>Seite nicht gefunden</h1><Link to="/">Zu den Lehr-Apps</Link></>}/></Routes></Suspense></main></BrowserRouter>);
