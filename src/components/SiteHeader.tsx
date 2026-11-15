import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { appTags } from '../appRegistry';
import { filterQuery, readAppFilter, toggleTag } from '../lib/appNavigation';

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
  const navigate = useNavigate();
  const filter = readAppFilter(location.search);
  return <header ref={header} className="site-header">
    <div className="site-heading">
      <div className="site-brand">
        <p className="site-name">Lehr-Apps</p>
        <p className="site-subtitle">Interaktive Lehrapps zur Applikations- und Verfahrenstechnik der Oberflächenbeschichtung</p>
      </div>
      <img src="/HSE-Logo.jpg" alt="Hochschule Esslingen" />
    </div>
    <nav className="hashtag-toolbar" aria-label="Programme nach Hashtags filtern">
      <div className="hashtag-buttons">
        {appTags.map(tag => <button type="button" key={tag.id}
          className="hashtag-button" aria-pressed={filter.tags.includes(tag.id)}
          onClick={() => navigate('/' + filterQuery(toggleTag(filter, tag.id)))}>
          #{tag.label}
        </button>)}
      </div>
      <button type="button" className="filter-mode" aria-label={`Filterverknüpfung: ${filter.mode}. Auf ${filter.mode === 'AND' ? 'OR' : 'AND'} umschalten`}
        aria-pressed={filter.mode === 'OR'} title={filter.mode === 'AND' ? 'Alle gewählten Hashtags müssen zutreffen' : 'Mindestens ein gewählter Hashtag muss zutreffen'}
        onClick={() => navigate('/' + filterQuery({ ...filter, mode: filter.mode === 'AND' ? 'OR' : 'AND' }))}>
        {filter.mode}
      </button>
    </nav>
  </header>;
}
