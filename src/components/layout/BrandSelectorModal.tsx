import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Leaf } from 'lucide-react';

interface BrandSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BrandSelectorModal({ open, onOpenChange }: BrandSelectorModalProps) {
  const navigate = useNavigate();

  const handleSelect = () => {
    onOpenChange(false);
    navigate('/ohana');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">¿Qué se te antoja?</DialogTitle>
          <DialogDescription className="text-center text-sm">Ver el menú de Ohana Bowls</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center mt-4">
          <button
            onClick={handleSelect}
            className="group flex flex-col items-center p-6 rounded-3xl bg-gradient-to-br from-ohana-light to-white border-2 border-transparent hover:border-ohana transition-all duration-300 hover:shadow-lg hover:shadow-ohana/20"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-ohana to-ohana-dark flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-ohana/30">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-medium text-ohana-dark mb-2 tracking-wide">Ohana Bowls</h3>
            <p className="text-sm text-muted-foreground text-center">
              Bowls saludables y personalizables
            </p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
