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
            className="group flex flex-col items-center p-6 rounded-3xl bg-gradient-to-br from-ohana-light to-white border-2 border-transparent hover:border-ohana transition-all duration-300 hover:shadow-lg hover:shadow-ohana/20"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-ohana to-ohana-dark flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-ohana/30">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-medium text-ohana-dark mb-2 tracking-wide">Ohana</h3>
            <p className="text-sm text-muted-foreground text-center">
              Bowls saludables y personalizables
            </p>
          </button>

          {/* Chilli Option */}
          <button
            onClick={() => handleSelectBrand('chilli')}
            className="group flex flex-col items-center p-6 bg-gradient-to-br from-chilli-light to-white border-l-4 border-chilli-dark hover:bg-chilli-light transition-all duration-150"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-chilli to-chilli-dark flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-150 shadow-lg shadow-chilli-dark/40">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-black text-chilli-dark mb-2 uppercase tracking-widest">Chilli</h3>
            <p className="text-sm text-muted-foreground text-center">
              Comida rápida irresistible
            </p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
