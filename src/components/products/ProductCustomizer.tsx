import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductDefaultIngredients } from '@/hooks/use-catalog';
import { cn } from '@/lib/utils';

interface ProductCustomizerProps {
  productId: string;
  onChange: (removedIngredients: string[]) => void;
}

export default function ProductCustomizer({ productId, onChange }: ProductCustomizerProps) {
  const { data: ingredients = [], isLoading } = useProductDefaultIngredients(productId);
  const [removed, setRemoved] = useState<string[]>([]);

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2 mb-3">
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-14 rounded-full" />
      </div>
    );
  }

  if (ingredients.length === 0) return null;

  const toggle = (name: string) => {
    const next = removed.includes(name)
      ? removed.filter((r) => r !== name)
      : [...removed, name];
    setRemoved(next);
    onChange(next);
  };

  return (
    <div className="mb-3">
      <p className="text-sm font-semibold text-foreground mb-2">¿Quieres quitar algo?</p>
      <div className="flex flex-wrap gap-1.5">
        {ingredients.map((ing) => {
          const isRemoved = removed.includes(ing.ingredient_name);
          return (
            <button
              key={ing.id}
              type="button"
              onClick={() => toggle(ing.ingredient_name)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs cursor-pointer transition-all',
                isRemoved
                  ? 'bg-red-50 border-red-300 text-red-500 line-through'
                  : 'bg-background border-border text-foreground',
              )}
            >
              {ing.ingredient_name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
