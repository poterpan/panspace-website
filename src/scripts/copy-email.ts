// Progressive enhancement: reveal "copy email" buttons only when the Clipboard API exists.
export {};

function bind(): void {
  if (!navigator.clipboard) return;
  document.querySelectorAll<HTMLButtonElement>('button[data-copy-email]').forEach((button) => {
    button.hidden = false;
    if (button.dataset.bound) return;
    button.dataset.bound = '1';
    button.addEventListener('click', async () => {
      const status = button.parentElement?.querySelector<HTMLElement>('[data-copy-status]');
      const label = button.querySelector<HTMLElement>('[data-copy-text]');
      try {
        await navigator.clipboard.writeText(button.dataset.copyEmail ?? '');
        button.dataset.copied = '';
        if (label) label.textContent = button.dataset.copiedLabel ?? '';
        if (status) status.textContent = button.dataset.copiedLabel ?? '';
        window.clearTimeout(Number(button.dataset.timer));
        button.dataset.timer = String(
          window.setTimeout(() => {
            delete button.dataset.copied;
            if (label) label.textContent = button.dataset.copyLabel ?? '';
            if (status) status.textContent = '';
          }, 1500),
        );
      } catch {
        // Clipboard denied: the mailto link next to the button still works.
      }
    });
  });
}

document.addEventListener('astro:page-load', bind);
