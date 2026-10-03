import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { navigate } from 'astro:transitions/client';
import { fuzzyFilter } from '../../lib/fuzzy';
import { switchLangPath } from '../../lib/i18n';
import type { PaletteItem } from '../../lib/palette';
import { LANG_KEY, safeSet } from '../../lib/storage';

export interface PaletteLabels {
  title: string;
  placeholder: string;
  listLabel: string;
  empty: string;
  open: string;
  copied: string;
}

interface Props {
  items: PaletteItem[];
  labels: PaletteLabels;
}

function isTypingTarget(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

export default function CommandPalette({ items, labels }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState('');
  const [ready, setReady] = useState(false);
  const listId = useId();
  const optionId = (i: number) => `${listId}-option-${i}`;
  const results = useMemo(() => fuzzyFilter(items, query, (i) => `${i.label} ${i.keywords}`), [items, query]);

  const open = useCallback(() => {
    const d = dialogRef.current;
    if (!d || d.open) return;
    setQuery('');
    setActive(0);
    setStatus('');
    d.showModal();
    inputRef.current?.focus();
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    setReady(true);
    const reveal = () =>
      document.querySelectorAll<HTMLElement>('[data-palette-open]').forEach((el) => {
        el.hidden = false;
      });
    const onKey = (e: KeyboardEvent) => {
      const d = dialogRef.current;
      if (!d) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (d.open) close();
        else open();
        return;
      }
      if (e.key === '/' && !d.open && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(document.activeElement)) {
        e.preventDefault();
        open();
      }
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest('[data-palette-open]')) open();
    };
    reveal();
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    document.addEventListener('astro:page-load', reveal);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
      document.removeEventListener('astro:page-load', reveal);
    };
  }, [open, close]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(item: PaletteItem): Promise<void> {
    const action = item.action;
    switch (action.type) {
      case 'navigate':
        close();
        await navigate(action.href);
        break;
      case 'switch-lang':
        safeSet(() => window.localStorage, LANG_KEY, action.target);
        close();
        await navigate(switchLangPath(window.location.pathname, action.target));
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(action.text);
          setStatus(labels.copied);
        } catch {
          window.location.href = `mailto:${action.text}`;
        }
        break;
      case 'external':
        close();
        window.open(action.href, '_blank', 'noopener');
        break;
      case 'download': {
        close();
        const link = document.createElement('a');
        link.href = action.href;
        link.download = '';
        document.body.append(link);
        link.click();
        link.remove();
        break;
      }
    }
  }

  function onInputKeyDown(e: ReactKeyboardEvent<HTMLInputElement>): void {
    const n = results.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (n ? (i + 1) % n : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (n ? (i - 1 + n) % n : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[active];
      if (item) void run(item);
    }
  }

  function onDialogKeyDown(e: ReactKeyboardEvent<HTMLDialogElement>): void {
    // Focus trap: the input is the only tabbable element; options are reached with arrow keys.
    if (e.key === 'Tab') {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <button type="button" className="palette-fab" aria-label={labels.open} onClick={open} hidden={!ready}>
        ⌘K
      </button>
      <dialog
        ref={dialogRef}
        className="palette"
        aria-label={labels.title}
        onKeyDown={onDialogKeyDown}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="palette-panel">
          <input
            ref={inputRef}
            className="palette-input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={results.length ? optionId(active) : undefined}
            aria-label={labels.placeholder}
            placeholder={labels.placeholder}
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
          />
          <ul id={listId} role="listbox" aria-label={labels.listLabel} className="palette-list">
            {results.map((item, i) => (
              <li
                key={item.id}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                className="palette-option"
                onMouseMove={() => setActive(i)}
                onClick={() => void run(item)}
              >
                <span>{item.label}</span>
                <span className="palette-hint">{item.hint}</span>
              </li>
            ))}
          </ul>
          {results.length === 0 && <p className="palette-empty">{labels.empty}</p>}
          <p className="sr-only" role="status" aria-live="polite">{status}</p>
          {status && <p className="palette-status" aria-hidden="true">{status}</p>}
        </div>
      </dialog>
    </>
  );
}
