import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { appCategories } from '../appRegistry';
import { categoryForLocation } from '../lib/appNavigation';

export function SiteHeader() {
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!header.current) return;
    const update = () => document.documentElement.style.setProperty('--site-header-height', `${header.current!.getBoundingClientRect().height}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header.current);
    return () => observer.disconnect();
  }, []);
  const location = useLocation();
  const activeCategory = categoryForLocation(location.pathname, location.search);
  return <header ref={header} className="site-header">
    <div className="site-heading">
      <div className="site-brand">
        <p className="site-name">Lehr-Apps</p>
        <p className="site-subtitle">Interaktive Lehrapps zur Applikations- und Verfahrenstechnik der Oberflächenbeschichtung</p>
      </div>
      <img src="/HSE-Logo.jpg" alt="Hochschule Esslingen" />
    </div>
    <nav className="category-tabs" aria-label="Fokus auswählen">
      {appCategories.map(category => <Link key={category.id}
        className={`category-tab category-tab-${category.id}`}
        to={`/?fokus=${category.id}`}
        aria-current={activeCategory === category.id ? 'page' : undefined}>
        {category.label}
      </Link>)}
    </nav>
  </header>;
}
