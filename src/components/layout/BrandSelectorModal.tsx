import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Leaf, Flame } from 'lucide-react';

interface BrandSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BrandSelectorModal({ open, onOpenChange }: BrandSelectorModalProps) {
  const navigate = useNavigate();

  const handleSelectBrand = (brand: 'ohana' | 'chilli') => {
    onOpenChange(false);
    navigate(`/${brand}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">¿Qué se te antoja?</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* Ohana Option */}
          <button
            onClick={() => handleSelectBrand('ohana')}
            className="group flex flex-col items-center p-6 rounded-2xl bg-ohana-light hover:bg-ohana/10 border-2 border-transparent hover:border-ohana transition-all duration-300"
          >
            <div className="w-16 h-16 rounded-full bg-ohana/10 flex items-center justify-center mb-4 group-hover:bg-ohana/20 transition-colors">
              <Leaf className="w-8 h-8 text-ohana" />
            </div>
            <h3 className="text-xl font-bold text-ohana mb-2">Ohana</h3>
            <p className="text-sm text-muted-foreground text-center">
              Bowls saludables y personalizables
            </p>
          </button>

          {/* Chilli Option */}
          <button
            onClick={() => handleSelectBrand('chilli')}
            className="group flex flex-col items-center p-6 rounded-xl bg-chilli-muted hover:bg-chilli/10 border-2 border-transparent hover:border-chilli transition-all duration-200"
          >
            <div className="w-16 h-16 rounded-lg bg-chilli/10 flex items-center justify-center mb-4 group-hover:bg-chilli/20 transition-colors">
              <Flame className="w-8 h-8 text-chilli-dark" />
            </div>
            <h3 className="text-xl font-bold text-chilli-dark mb-2">Chilli</h3>
            <p className="text-sm text-muted-foreground text-center">
              Comida rápida irresistible
            </p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
