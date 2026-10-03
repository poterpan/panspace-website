import { useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { filterByCategory } from '../../lib/projects';
import { vtNames } from '../../lib/transitions';
import { parseCategoryParam, type WorkCardData, type WorkFilter, type WorkFilterKey } from '../../lib/work';

interface Props {
  items: WorkCardData[];
  filters: WorkFilter[];
  filterLabel: string;
  countTemplate: string;
}

export default function WorkGrid({ items, filters, filterLabel, countTemplate }: Props) {
  const [active, setActive] = useState<WorkFilterKey>('all');
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    setActive(parseCategoryParam(new URLSearchParams(window.location.search).get('cat')));
    setReady(true);
  }, []);

  function choose(key: WorkFilterKey): void {
    setActive(key);
    const url = new URL(window.location.href);
    if (key === 'all') url.searchParams.delete('cat');
    else url.searchParams.set('cat', key);
    window.history.replaceState(window.history.state, '', url);
  }

  const visible = filterByCategory(items, active);
  const transition = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 32 };

  return (
    <MotionConfig reducedMotion="user" transition={transition}>
      <div className="work-filters" role="group" aria-label={filterLabel} hidden={!ready}>
        {filters.map((f) => (
          <button key={f.key} type="button" className="filter-chip" aria-pressed={active === f.key} onClick={() => choose(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      <p className="mono-path work-status" role="status" aria-live="polite">
        {countTemplate.replace('{n}', String(visible.length))}
      </p>
      <motion.ul layout className="work-grid" style={{ position: 'relative' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((item) => {
            return (
              <motion.li
                key={item.slug}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <a href={item.href} className="bento-card work-card vt-card" data-spotlight data-vt={vtNames(item.slug).card}>
                  <picture>
                    <source type="image/avif" srcSet={item.cover.avifSrcset} sizes="(min-width: 1024px) 360px, 100vw" />
                    <source type="image/webp" srcSet={item.cover.webpSrcset} sizes="(min-width: 1024px) 360px, 100vw" />
                    <img
                      className="card-cover"
                      src={item.cover.src}
                      alt={item.cover.alt}
                      width={item.cover.width}
                      height={item.cover.height}
                      loading="lazy"
                      decoding="async"
                    />
                  </picture>
                  <span className="mono-path">{item.categoryLabels.join(' · ')} · {item.period}</span>
                  <h2 className="card-title">{item.title}</h2>
                  <p className="card-summary">{item.summary}</p>
                </a>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ul>
    </MotionConfig>
  );
}
