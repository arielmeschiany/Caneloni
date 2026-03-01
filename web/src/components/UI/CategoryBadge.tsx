import type { Category } from '@canaloni/shared';
import { CATEGORY_COLORS, CATEGORY_EMOJIS, CATEGORY_LABELS } from '@canaloni/shared';

interface CategoryBadgeProps {
  category: Category;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  const color = CATEGORY_COLORS[category];
  const emoji = CATEGORY_EMOJIS[category];
  const label = CATEGORY_LABELS[category];

  const paddingClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide ${paddingClass}`}
      style={{
        backgroundColor: `${color}22`,
        color,
        border: `1px solid ${color}44`,
      }}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}
