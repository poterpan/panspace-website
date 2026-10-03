export {};

function bind(): void {
  document.querySelectorAll<HTMLElement>('.timeline-filters').forEach((group) => {
    group.hidden = false;
    if (group.dataset.bound) return;
    group.dataset.bound = '1';
    const section = group.closest('section');
    group.addEventListener('click', (event) => {
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>('button[data-timeline-filter]');
      if (!button || !section) return;
      const type = button.dataset.timelineFilter;
      group.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      section.querySelectorAll<HTMLElement>('.timeline-item').forEach((item) => {
        item.hidden = type !== 'all' && item.dataset.type !== type;
      });
    });
  });
}

document.addEventListener('astro:page-load', bind);
