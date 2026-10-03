import { localizedPath, otherLocale, type Locale } from './i18n';

export type PaletteAction =
  | { type: 'navigate'; href: string }
  | { type: 'switch-lang'; target: Locale }
  | { type: 'copy'; text: string }
  | { type: 'external'; href: string }
  | { type: 'download'; href: string };

export interface PaletteItem {
  id: string;
  label: string;
  hint: string;
  group: 'page' | 'project' | 'action';
  keywords: string;
  action: PaletteAction;
}

export interface PaletteItemLabels {
  home: string;
  work: string;
  about: string;
  switchLang: string;
  copyEmail: string;
  resume: string;
  github: string;
  linkedin: string;
  action: string;
}

export interface PaletteInput {
  lang: Locale;
  labels: PaletteItemLabels;
  projects: { slug: string; title: string; altTitle: string }[];
  email: string;
  github: string;
  linkedin?: string;
  resumeHref: string | null;
}

export function buildPaletteItems(input: PaletteInput): PaletteItem[] {
  const { lang, labels } = input;
  const page = (id: string, path: string, label: string, keywords: string): PaletteItem => ({
    id: `page:${id}`,
    label,
    hint: path === '/' ? '~/' : `~${path}`,
    group: 'page',
    keywords,
    action: { type: 'navigate', href: localizedPath(lang, path) },
  });
  const items: PaletteItem[] = [
    page('home', '/', labels.home, 'home 首頁 panspace'),
    page('work', '/work', labels.work, 'work projects portfolio 作品'),
    page('about', '/about', labels.about, 'about me experience awards skills 關於 經歷 獎項 技能'),
    ...input.projects.map<PaletteItem>((p) => ({
      id: `project:${p.slug}`,
      label: p.title,
      hint: `~/work/${p.slug}`,
      group: 'project',
      keywords: `${p.slug} ${p.altTitle}`,
      action: { type: 'navigate', href: localizedPath(lang, `/work/${p.slug}`) },
    })),
    {
      id: 'action:lang',
      label: labels.switchLang,
      hint: labels.action,
      group: 'action',
      keywords: 'language switch english chinese 語言 中文 英文',
      action: { type: 'switch-lang', target: otherLocale(lang) },
    },
    {
      id: 'action:email',
      label: labels.copyEmail,
      hint: input.email,
      group: 'action',
      keywords: 'email mail contact copy 聯絡 信箱 複製',
      action: { type: 'copy', text: input.email },
    },
  ];
  if (input.resumeHref) {
    items.push({ id: 'action:resume', label: labels.resume, hint: 'pdf', group: 'action', keywords: 'resume cv pdf 履歷', action: { type: 'download', href: input.resumeHref } });
  }
  items.push({ id: 'action:github', label: labels.github, hint: 'github.com/poterpan', group: 'action', keywords: 'github code source', action: { type: 'external', href: input.github } });
  if (input.linkedin) {
    items.push({ id: 'action:linkedin', label: labels.linkedin, hint: 'linkedin', group: 'action', keywords: 'linkedin profile', action: { type: 'external', href: input.linkedin } });
  }
  return items;
}
