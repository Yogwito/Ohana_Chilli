import { Category } from '@/types';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  brand: 'ohana' | 'chilli';
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  brand,
}: CategoryFilterProps) {
  const isOhana = brand === 'ohana';

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelectCategory(null)}
        className={cn(
          'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
          selectedCategory === null
            ? isOhana
              ? 'bg-ohana text-ohana-foreground shadow-md'
              : 'bg-chilli text-chilli-foreground shadow-md'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
      >
        Todos
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5',
            selectedCategory === category.id
              ? isOhana
                ? 'bg-ohana text-ohana-foreground shadow-md'
                : 'bg-chilli text-chilli-foreground shadow-md'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {category.icon && <span>{category.icon}</span>}
          {category.name}
        </button>
      ))}
    </div>
  );
}
