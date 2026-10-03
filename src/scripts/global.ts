import './lang-memory';

declare global {
  interface Window {
    __psNavigated?: boolean;
  }
}

// Set on any client-side navigation. The boot sequence (Task 6) never plays after one.
document.addEventListener('astro:before-preparation', () => {
  window.__psNavigated = true;
});
