export const CATEGORIES = ['ios', 'web', 'ai', 'research', 'competition'] as const;
export type Category = (typeof CATEGORIES)[number];

export const EXPERIENCE_TYPES = ['education', 'work', 'teaching', 'freelance'] as const;
export type ExperienceType = (typeof EXPERIENCE_TYPES)[number];
