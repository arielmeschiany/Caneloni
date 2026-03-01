'use client';

interface StarRatingProps {
  rating: number;
  max?: number;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onRate?: (rating: number) => void;
}

const SIZES = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
};

export function StarRating({
  rating,
  max = 5,
  interactive = false,
  size = 'md',
  onRate,
}: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5" role={interactive ? 'radiogroup' : 'img'} aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const value = i + 1;
        const filled = value <= rating;
        const half = !filled && value - 0.5 <= rating;

        return (
          <button
            key={i}
            type={interactive ? 'button' : undefined}
            className={`${SIZES[size]} transition-transform ${
              interactive ? 'cursor-pointer hover:scale-110 focus:outline-none' : 'cursor-default'
            } ${filled ? 'text-amber-400' : half ? 'text-amber-300' : 'text-gray-200'}`}
            onClick={interactive ? () => onRate?.(value) : undefined}
            aria-label={interactive ? `${value} star${value !== 1 ? 's' : ''}` : undefined}
            disabled={!interactive}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
