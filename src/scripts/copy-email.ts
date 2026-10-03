// Progressive enhancement: reveal "copy email" buttons only when the Clipboard API exists.
function bind(): void {
  if (!navigator.clipboard) return;
  document.querySelectorAll<HTMLButtonElement>('button[data-copy-email]').forEach((button) => {
    button.hidden = false;
    if (button.dataset.bound) return;
    button.dataset.bound = '1';
    button.addEventListener('click', async () => {
      const status = button.parentElement?.querySelector<HTMLElement>('[data-copy-status]');
      try {
        await navigator.clipboard.writeText(button.dataset.copyEmail ?? '');
        if (status) {
          status.textContent = button.dataset.copiedLabel ?? '';
          window.setTimeout(() => {
            status.textContent = '';
          }, 2000);
        }
      } catch {
        // Clipboard denied: the mailto link next to the button still works.
      }
    });
  });
}

document.addEventListener('astro:page-load', bind);
