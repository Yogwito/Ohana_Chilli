import { Plus, Star, Sparkles, Leaf, Wheat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product, Brand } from '@/types';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact';
}

export default function ProductCard({ product, variant = 'default' }: ProductCardProps) {
  const { addProduct } = useCart();
  const isOhana = product.brand === 'ohana';

  const handleAddToCart = () => {
    addProduct(product);
    toast.success(`${product.name} agregado al carrito`, {
      description: `$${product.price} MXN`,
    });
  };

  if (variant === 'compact') {
    return (
      <div className={`product-card ${isOhana ? 'card-ohana' : 'card-chilli'} flex items-center p-3 gap-3`}>
        {/* Image placeholder */}
        <div className={`w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center ${
          isOhana ? 'bg-ohana-light' : 'bg-chilli-muted'
        }`}>
          <span className="text-2xl">
            {isOhana ? '🥗' : '🍔'}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{product.name}</h4>
          <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
          <p className={`text-sm font-bold mt-1 ${isOhana ? 'text-ohana' : 'text-chilli-dark'}`}>
            ${product.price}
          </p>
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={handleAddToCart}
          className={`shrink-0 ${isOhana ? 'hover:bg-ohana/10 text-ohana' : 'hover:bg-chilli/10 text-chilli-dark'}`}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`product-card ${isOhana ? 'card-ohana' : 'card-chilli'} flex flex-col h-full`}>
      {/* Image area */}
      <div className={`relative aspect-[4/3] flex items-center justify-center ${
        isOhana ? 'bg-ohana-light' : 'bg-chilli-muted'
      }`}>
        <span className="text-6xl">
          {isOhana ? '🥗' : product.categoryId.includes('burger') ? '🍔' : 
            product.categoryId.includes('hotdog') ? '🌭' : 
            product.categoryId.includes('fries') ? '🍟' : 
            product.categoryId.includes('mazorcada') ? '🌽' : '🧀'}
        </span>
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {product.isPopular && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-2xs font-medium">
              <Star className="w-3 h-3" />
              Popular
            </span>
          )}
          {product.isNew && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-ohana text-ohana-foreground text-2xs font-medium">
              <Sparkles className="w-3 h-3" />
              Nuevo
            </span>
          )}
        </div>

        {/* Diet badges */}
        <div className="absolute top-2 right-2 flex gap-1">
          {product.isVegan && (
            <span className="p-1 rounded-full bg-ohana/20" title="Vegano">
              <Leaf className="w-3 h-3 text-ohana" />
            </span>
          )}
          {product.isGlutenFree && (
            <span className="p-1 rounded-full bg-amber-500/20" title="Sin gluten">
              <Wheat className="w-3 h-3 text-amber-600" />
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        <h3 className="font-semibold text-lg leading-tight mb-1">{product.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
          {product.description}
        </p>
        
        {/* Ingredients preview */}
        {product.ingredients && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.ingredients.slice(0, 3).map((ing, idx) => (
              <span 
                key={idx} 
                className={`text-2xs px-2 py-0.5 rounded-full ${
                  isOhana ? 'bg-ohana/10 text-ohana' : 'bg-chilli/10 text-chilli-dark'
                }`}
              >
                {ing}
              </span>
            ))}
            {product.ingredients.length > 3 && (
              <span className="text-2xs px-2 py-0.5 text-muted-foreground">
                +{product.ingredients.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Calories */}
        {product.calories && (
          <p className="text-xs text-muted-foreground mb-3">
            {product.calories} kcal
          </p>
        )}

        {/* Price and Add */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t">
          <span className={`text-xl font-bold ${isOhana ? 'text-ohana' : 'text-chilli-dark'}`}>
            ${product.price}
          </span>
          <Button
            onClick={handleAddToCart}
            size="sm"
            className={isOhana ? 'btn-ohana py-2' : 'btn-chilli py-2'}
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
}
