import { useState, useMemo } from 'react';
import { Check, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Ingredient, BowlSizeRule, CustomBowl, BowlBuilderStep } from '@/types';
import { useBowlRules, useIngredients } from '@/hooks/use-catalog';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MAX_SAUCES = 2;

const steps: { id: BowlBuilderStep; label: string }[] = [
  { id: 'size', label: 'Tamaño' },
  { id: 'bases', label: 'Bases' },
  { id: 'proteins', label: 'Proteínas' },
  { id: 'acompanantes', label: 'Acompañantes' },
  { id: 'salsas', label: 'Salsas' },
  { id: 'summary', label: 'Resumen' },
];

interface BowlBuilderProps {
  onComplete?: () => void;
}

export default function BowlBuilder({ onComplete }: BowlBuilderProps) {
  const { addCustomBowl } = useCart();
  
  const { data: bowlSizeRules = [], isLoading: loadingRules } = useBowlRules();
  const { data: bases = [], isLoading: loadingBases } = useIngredients('base');
  const { data: proteins = [], isLoading: loadingProteins } = useIngredients('protein');
  const { data: acompanantes = [], isLoading: loadingAcc } = useIngredients('acompanante');
  const { data: sauces = [], isLoading: loadingSauces } = useIngredients('sauce');

  const isLoadingData = loadingRules || loadingBases || loadingProteins || loadingAcc || loadingSauces;

  const [currentStep, setCurrentStep] = useState<BowlBuilderStep>('size');
  const [selectedSize, setSelectedSize] = useState<BowlSizeRule | null>(null);
  const [selectedBases, setSelectedBases] = useState<Ingredient[]>([]);
  const [selectedProteins, setSelectedProteins] = useState<Ingredient[]>([]);
  const [selectedAcompanantes, setSelectedAcompanantes] = useState<Ingredient[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<Ingredient[]>([]);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const filterBySearch = (items: Ingredient[]) => {
    if (!searchQuery) return items;
    return items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);
  };

  const calculatePrice = useMemo(() => {
    if (!selectedSize) return 0;
    let price = selectedSize.price;
    selectedProteins.forEach(p => { if (p.price) price += p.price; });
    return price;
  }, [selectedSize, selectedProteins]);

  const isStepComplete = (step: BowlBuilderStep): boolean => {
    if (!selectedSize) return false;
    switch (step) {
      case 'size': return selectedSize !== null;
      case 'bases': return selectedBases.length === selectedSize.maxBases;
      case 'proteins': return selectedProteins.length > 0 && selectedProteins.length <= selectedSize.maxProteins;
      case 'acompanantes': return selectedAcompanantes.length > 0 && selectedAcompanantes.length <= selectedSize.maxAcompanantes;
      case 'salsas': return true; // salsas are optional, always complete
      case 'summary': return true;
      default: return false;
    }
  };

  const canProceed = (): boolean => isStepComplete(currentStep);

  const toggleIngredient = (
    ingredient: Ingredient,
    selected: Ingredient[],
    setSelected: React.Dispatch<React.SetStateAction<Ingredient[]>>,
    max: number
  ) => {
    const isSelected = selected.some(i => i.id === ingredient.id);
    if (isSelected) {
      setSelected(selected.filter(i => i.id !== ingredient.id));
    } else if (selected.length < max) {
      setSelected([...selected, ingredient]);
    }
  };

  const goNext = () => {
    if (!canProceed()) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
      setSearchQuery('');
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
      setSearchQuery('');
    }
  };

  const handleSubmit = () => {
    if (!selectedSize) return;
    const customBowl: CustomBowl = {
      size: selectedSize,
      bases: selectedBases,
      proteins: selectedProteins,
      acompanantes: selectedAcompanantes,
      sauces: selectedSauces.length > 0 ? selectedSauces : undefined,
      notes: notes || undefined,
    };
    addCustomBowl(customBowl, notes || undefined);
    toast.success('Bowl personalizado agregado al carrito', {
      description: `${selectedSize.name} - ${formatPrice(calculatePrice)}`,
    });
    setSelectedSize(null);
    setSelectedBases([]);
    setSelectedProteins([]);
    setSelectedAcompanantes([]);
    setSelectedSauces([]);
    setNotes('');
    setCurrentStep('size');
    onComplete?.();
  };

  const CounterBadge = ({ current, max, label }: { current: number; max: number; label: string }) => (
    <div className={cn(
      'counter-badge',
      current === max ? 'counter-badge-full' : current > 0 ? 'counter-badge-ok' : 'bg-muted text-muted-foreground'
    )}>
      {label} {current}/{max}
      {current === max && <Check className="w-3 h-3" />}
    </div>
  );

  const IngredientChip = ({ ingredient, isSelected, isDisabled, onClick }: { 
    ingredient: Ingredient; isSelected: boolean; isDisabled: boolean; onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      disabled={isDisabled && !isSelected}
      aria-pressed={isSelected}
      aria-label={`${ingredient.name}${ingredient.price && ingredient.price > 0 ? ` +${formatPrice(ingredient.price)}` : ''}`}
      className={cn(
        'ingredient-chip flex items-center gap-2',
        isSelected ? 'ingredient-chip-selected' : isDisabled ? 'ingredient-chip-disabled' : 'ingredient-chip-unselected'
      )}
    >
      <span>{ingredient.name}</span>
      {ingredient.price && ingredient.price > 0 && (
        <span className="text-xs opacity-70">+{formatPrice(ingredient.price)}</span>
      )}
      {isSelected && <Check className="w-4 h-4" />}
    </button>
  );

  if (isLoadingData) {
    return (
      <div className="bg-card rounded-2xl shadow-lg border p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-lg border overflow-hidden">
      {/* Progress indicator */}
      <div className="bg-ohana-light p-4">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => {
                  if (idx < currentStepIndex || (idx === currentStepIndex + 1 && canProceed())) {
                    setCurrentStep(step.id);
                  }
                }}
                disabled={idx > currentStepIndex + 1 || (idx === currentStepIndex + 1 && !canProceed())}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                  currentStep === step.id ? 'step-active' : idx < currentStepIndex || isStepComplete(step.id) ? 'step-completed' : 'step-inactive'
                )}
              >
                <span className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs',
                  currentStep === step.id ? 'bg-white/20' : idx < currentStepIndex || isStepComplete(step.id) ? 'bg-ohana/30' : 'bg-muted-foreground/20'
                )}>
                  {idx < currentStepIndex || (isStepComplete(step.id) && step.id !== currentStep) ? <Check className="w-3 h-3" /> : idx + 1}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className={cn('w-4 sm:w-8 h-0.5 mx-1', idx < currentStepIndex ? 'bg-ohana' : 'bg-muted')} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {currentStep === 'size' && (
          <div className="animate-fade-in">
            <h3 className="text-xl font-semibold mb-2">Elige el tamaño de tu bowl</h3>
            <p className="text-muted-foreground mb-6">Cada tamaño incluye diferentes cantidades de ingredientes</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {bowlSizeRules.map((size) => (
                <button
                  key={size.size}
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    'p-6 rounded-2xl border-2 transition-all text-left',
                    selectedSize?.size === size.size ? 'border-ohana bg-ohana/5 shadow-md' : 'border-border hover:border-ohana/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold">{size.name}</h4>
                    <span className="text-2xl font-bold text-ohana">{formatPrice(size.price)}</span>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• {size.maxBases} {size.maxBases === 1 ? 'base' : 'bases'}</li>
                    <li>• {size.maxProteins} {size.maxProteins === 1 ? 'proteína' : 'proteínas'}</li>
                    <li>• {size.maxAcompanantes} acompañantes</li>
                    <li>• Hasta {MAX_SAUCES} salsas</li>
                  </ul>
                  {selectedSize?.size === size.size && (
                    <div className="mt-4 flex items-center gap-2 text-ohana font-medium">
                      <Check className="w-4 h-4" /> Seleccionado
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 'bases' && selectedSize && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold">Elige tu base</h3>
                <p className="text-muted-foreground">Selecciona la base de tu bowl</p>
              </div>
              <CounterBadge current={selectedBases.length} max={selectedSize.maxBases} label="Bases" />
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar bases..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="flex flex-wrap gap-3">
              {filterBySearch(bases).map((base) => (
                <IngredientChip
                  key={base.id}
                  ingredient={base}
                  isSelected={selectedBases.some(b => b.id === base.id)}
                  isDisabled={selectedBases.length >= selectedSize.maxBases}
                  onClick={() => toggleIngredient(base, selectedBases, setSelectedBases, selectedSize.maxBases)}
                />
              ))}
            </div>
          </div>
        )}

        {currentStep === 'proteins' && selectedSize && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold">Elige tus proteínas</h3>
                <p className="text-muted-foreground">Algunas proteínas tienen costo adicional</p>
              </div>
              <CounterBadge current={selectedProteins.length} max={selectedSize.maxProteins} label="Proteínas" />
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar proteínas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="flex flex-wrap gap-3">
              {filterBySearch(proteins).map((protein) => (
                <IngredientChip
                  key={protein.id}
                  ingredient={protein}
                  isSelected={selectedProteins.some(p => p.id === protein.id)}
                  isDisabled={selectedProteins.length >= selectedSize.maxProteins}
                  onClick={() => toggleIngredient(protein, selectedProteins, setSelectedProteins, selectedSize.maxProteins)}
                />
              ))}
            </div>
          </div>
        )}

        {currentStep === 'acompanantes' && selectedSize && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold">Elige tus acompañantes</h3>
                <p className="text-muted-foreground">Personaliza tu bowl con vegetales y más</p>
              </div>
              <CounterBadge current={selectedAcompanantes.length} max={selectedSize.maxAcompanantes} label="Acompañantes" />
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar acompañantes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="flex flex-wrap gap-3">
              {filterBySearch(acompanantes).map((item) => (
                <IngredientChip
                  key={item.id}
                  ingredient={item}
                  isSelected={selectedAcompanantes.some(a => a.id === item.id)}
                  isDisabled={selectedAcompanantes.length >= selectedSize.maxAcompanantes}
                  onClick={() => toggleIngredient(item, selectedAcompanantes, setSelectedAcompanantes, selectedSize.maxAcompanantes)}
                />
              ))}
            </div>
          </div>
        )}

        {currentStep === 'salsas' && selectedSize && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold">Elige tus salsas</h3>
                <p className="text-muted-foreground">Opcional — elige hasta {MAX_SAUCES} salsas para tu bowl</p>
              </div>
              <CounterBadge current={selectedSauces.length} max={MAX_SAUCES} label="Salsas" />
            </div>
            <div className="flex flex-wrap gap-3">
              {sauces.map((sauce) => (
                <IngredientChip
                  key={sauce.id}
                  ingredient={sauce}
                  isSelected={selectedSauces.some(s => s.id === sauce.id)}
                  isDisabled={selectedSauces.length >= MAX_SAUCES}
                  onClick={() => toggleIngredient(sauce, selectedSauces, setSelectedSauces, MAX_SAUCES)}
                />
              ))}
            </div>
            {selectedSauces.length === 0 && (
              <p className="text-sm text-muted-foreground mt-4 italic">
                Puedes continuar sin elegir salsas si prefieres.
              </p>
            )}
          </div>
        )}

        {currentStep === 'summary' && selectedSize && (
          <div className="animate-fade-in">
            <h3 className="text-xl font-semibold mb-6">Resumen de tu bowl</h3>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center pb-4 border-b">
                <span className="font-medium">Tamaño</span>
                <span className="font-bold">{selectedSize.name} - {formatPrice(selectedSize.price)}</span>
              </div>
              <div className="pb-4 border-b">
                <span className="font-medium block mb-2">Base</span>
                <div className="flex flex-wrap gap-2">
                  {selectedBases.map(b => <span key={b.id} className="badge-ohana">{b.name}</span>)}
                </div>
              </div>
              <div className="pb-4 border-b">
                <span className="font-medium block mb-2">Proteínas</span>
                <div className="flex flex-wrap gap-2">
                  {selectedProteins.map(p => (
                    <span key={p.id} className="badge-ohana">{p.name} {p.price ? `(+${formatPrice(p.price)})` : ''}</span>
                  ))}
                </div>
              </div>
              <div className="pb-4 border-b">
                <span className="font-medium block mb-2">Acompañantes ({selectedAcompanantes.length})</span>
                <div className="flex flex-wrap gap-2">
                  {selectedAcompanantes.map(a => <span key={a.id} className="badge-ohana">{a.name}</span>)}
                </div>
              </div>
              {selectedSauces.length > 0 && (
                <div className="pb-4 border-b">
                  <span className="font-medium block mb-2">Salsas ({selectedSauces.length})</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedSauces.map(s => <span key={s.id} className="badge-ohana">{s.name}</span>)}
                  </div>
                </div>
              )}
            </div>
            <div className="mb-6">
              <label className="font-medium block mb-2">Notas adicionales (opcional)</label>
              <Textarea placeholder="Ej: Sin cilantro, salsa aparte..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-between items-center p-4 bg-ohana-light rounded-xl">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-ohana">{formatPrice(calculatePrice)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="border-t p-4 flex justify-between">
        <Button variant="outline" onClick={goBack} disabled={currentStepIndex === 0} className="flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Anterior
        </Button>
        {currentStep === 'summary' ? (
          <Button onClick={handleSubmit} className="btn-ohana flex items-center gap-2">
            Agregar al Carrito
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!canProceed()} className="btn-ohana flex items-center gap-2">
            Siguiente <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
