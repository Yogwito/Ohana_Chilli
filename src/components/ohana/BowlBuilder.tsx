import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Ingredient, BowlBuilderStep, BowlSizeRule, CustomBowl } from '@/types';
import { useBowlRules, useIngredients } from '@/hooks/use-catalog';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/domain/formatPrice';

const steps: { id: BowlBuilderStep; label: string }[] = [
  { id: 'size', label: 'Tamano' },
  { id: 'bases', label: 'Bases' },
  { id: 'proteins', label: 'Proteinas' },
  { id: 'acompanantes', label: 'Acompanantes' },
  { id: 'salsas', label: 'Salsas' },
  { id: 'complementos', label: 'Complementos' },
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
  const { data: acompanantes = [], isLoading: loadingAcompanantes } = useIngredients('acompanante');
  const { data: sauces = [], isLoading: loadingSauces } = useIngredients('sauce');
  const { data: complementos = [], isLoading: loadingComplementos } = useIngredients('topping');

  const isLoadingData =
    loadingRules || loadingBases || loadingProteins || loadingAcompanantes || loadingSauces || loadingComplementos;

  const [currentStep, setCurrentStep] = useState<BowlBuilderStep>('size');
  const [selectedSize, setSelectedSize] = useState<BowlSizeRule | null>(null);
  const [selectedBases, setSelectedBases] = useState<Ingredient[]>([]);
  const [selectedProteins, setSelectedProteins] = useState<Ingredient[]>([]);
  const [selectedAcompanantes, setSelectedAcompanantes] = useState<Ingredient[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<Ingredient[]>([]);
  const [selectedComplementos, setSelectedComplementos] = useState<Ingredient[]>([]);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  const totalPrice = useMemo(() => {
    if (!selectedSize) return 0;
    return [
      ...selectedBases,
      ...selectedProteins,
      ...selectedAcompanantes,
      ...selectedSauces,
      ...selectedComplementos,
    ].reduce((sum, item) => sum + (item.price ?? 0), selectedSize.price);
  }, [selectedAcompanantes, selectedBases, selectedComplementos, selectedProteins, selectedSauces, selectedSize]);

  const filterBySearch = (items: Ingredient[]) => {
    if (!searchQuery.trim()) return items;
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(normalizedQuery));
  };

  const resetBuilder = () => {
    setSelectedSize(null);
    setSelectedBases([]);
    setSelectedProteins([]);
    setSelectedAcompanantes([]);
    setSelectedSauces([]);
    setSelectedComplementos([]);
    setNotes('');
    setSearchQuery('');
    setCurrentStep('size');
  };

  const toggleIngredient = (
    ingredient: Ingredient,
    selectedItems: Ingredient[],
    setSelectedItems: Dispatch<SetStateAction<Ingredient[]>>,
    max: number,
  ) => {
    const isSelected = selectedItems.some((item) => item.id === ingredient.id);
    if (isSelected) {
      setSelectedItems(selectedItems.filter((item) => item.id !== ingredient.id));
      return;
    }

    if (selectedItems.length < max) {
      setSelectedItems([...selectedItems, ingredient]);
    }
  };

  const isStepComplete = (step: BowlBuilderStep) => {
    if (!selectedSize && step !== 'size') return false;

    switch (step) {
      case 'size':
        return selectedSize !== null;
      case 'bases':
        return selectedBases.length === (selectedSize?.maxBases ?? 0);
      case 'proteins':
        return selectedProteins.length === (selectedSize?.maxProteins ?? 0);
      case 'acompanantes':
        return selectedAcompanantes.length === (selectedSize?.maxAcompanantes ?? 0);
      case 'salsas':
        return selectedSauces.length === (selectedSize?.maxSauces ?? 0);
      case 'complementos':
        return selectedComplementos.length === (selectedSize?.maxComplementos ?? 0);
      case 'summary':
        return true;
      default:
        return false;
    }
  };

  const canProceed = isStepComplete(currentStep);

  const goBack = () => {
    const previousStep = steps[currentStepIndex - 1];
    if (!previousStep) return;
    setCurrentStep(previousStep.id);
    setSearchQuery('');
  };

  const goNext = () => {
    if (!canProceed) return;
    const nextStep = steps[currentStepIndex + 1];
    if (!nextStep) return;
    setCurrentStep(nextStep.id);
    setSearchQuery('');
  };

  const handleSubmit = () => {
    if (!selectedSize) return;

    const customBowl: CustomBowl = {
      size: selectedSize,
      bases: selectedBases,
      proteins: selectedProteins,
      acompanantes: selectedAcompanantes,
      sauces: selectedSauces,
      complementos: selectedComplementos,
      notes: notes || undefined,
    };

    addCustomBowl(customBowl, notes || undefined);
    toast.success('Bowl personalizado agregado al carrito', {
      description: `${selectedSize.name} - ${formatPrice(totalPrice)}`,
    });
    resetBuilder();
    onComplete?.();
  };

  const CounterBadge = ({ current, max, label }: { current: number; max: number; label: string }) => (
    <div
      className={cn(
        'rounded-full px-3 py-1 text-xs font-semibold',
        current === max ? 'bg-ohana text-ohana-foreground' : 'bg-muted text-muted-foreground',
      )}
    >
      {label} {current}/{max}
    </div>
  );

  const IngredientChip = ({
    ingredient,
    isSelected,
    isDisabled,
    onClick,
  }: {
    ingredient: Ingredient;
    isSelected: boolean;
    isDisabled: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled && !isSelected}
      className={cn(
        'flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors',
        isSelected ? 'border-ohana bg-ohana/10 text-ohana-dark' : 'border-border bg-card hover:bg-muted/50',
        isDisabled && !isSelected && 'cursor-not-allowed opacity-50',
      )}
    >
      <span>{ingredient.name}</span>
      {ingredient.price ? <span className="text-xs text-muted-foreground">+{formatPrice(ingredient.price)}</span> : null}
      {isSelected ? <Check className="h-4 w-4" /> : null}
    </button>
  );

  const StepPicker = ({
    title,
    subtitle,
    items,
    selectedItems,
    setSelectedItems,
    max,
    searchPlaceholder,
    label,
  }: {
    title: string;
    subtitle: string;
    items: Ingredient[];
    selectedItems: Ingredient[];
    setSelectedItems: Dispatch<SetStateAction<Ingredient[]>>;
    max: number;
    searchPlaceholder: string;
    label: string;
  }) => (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <CounterBadge current={selectedItems.length} max={max} label={label} />
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-10"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {filterBySearch(items).map((item) => (
          <IngredientChip
            key={item.id}
            ingredient={item}
            isSelected={selectedItems.some((selectedItem) => selectedItem.id === item.id)}
            isDisabled={selectedItems.length >= max}
            onClick={() => toggleIngredient(item, selectedItems, setSelectedItems, max)}
          />
        ))}
      </div>
    </div>
  );

  if (isLoadingData) {
    return (
      <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-lg">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border bg-card shadow-lg">
      <div className="bg-ohana-light p-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {steps.map((step, index) => {
            const available = index <= currentStepIndex || (index === currentStepIndex + 1 && canProceed);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => available && setCurrentStep(step.id)}
                disabled={!available}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  currentStep === step.id ? 'bg-ohana text-ohana-foreground' : 'bg-white/70 text-foreground',
                  !available && 'opacity-50',
                )}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-xs">
                  {isStepComplete(step.id) && step.id !== currentStep ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {step.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        {currentStep === 'size' && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-xl font-semibold">Elige el tamano de tu bowl</h3>
            <p className="mb-6 text-sm text-muted-foreground">Cada tamano sigue la estructura oficial de la carta definitiva.</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {bowlSizeRules.map((size) => (
                <button
                  key={size.size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    'rounded-2xl border-2 p-5 text-left transition-colors',
                    selectedSize?.size === size.size ? 'border-ohana bg-ohana/5' : 'border-border hover:border-ohana/40',
                  )}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-bold">{size.name}</h4>
                      <p className="text-sm text-muted-foreground">{formatPrice(size.price)}</p>
                    </div>
                    {selectedSize?.size === size.size ? <Check className="h-5 w-5 text-ohana" /> : null}
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>{size.maxBases} base</li>
                    <li>{size.maxProteins} proteinas</li>
                    <li>{size.maxAcompanantes} acompanantes</li>
                    <li>{size.maxSauces} salsas</li>
                    <li>{size.maxComplementos} complementos</li>
                  </ul>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 'bases' && selectedSize && (
          <StepPicker
            title="Elige tu base"
            subtitle="Selecciona exactamente las bases incluidas por tu tamano."
            items={bases}
            selectedItems={selectedBases}
            setSelectedItems={setSelectedBases}
            max={selectedSize.maxBases}
            searchPlaceholder="Buscar bases..."
            label="Bases"
          />
        )}

        {currentStep === 'proteins' && selectedSize && (
          <StepPicker
            title="Elige tus proteinas"
            subtitle="Las proteinas o bases premium muestran su recargo directo en el selector."
            items={proteins}
            selectedItems={selectedProteins}
            setSelectedItems={setSelectedProteins}
            max={selectedSize.maxProteins}
            searchPlaceholder="Buscar proteinas..."
            label="Proteinas"
          />
        )}

        {currentStep === 'acompanantes' && selectedSize && (
          <StepPicker
            title="Elige tus acompanantes"
            subtitle="Organiza tu bowl con la cantidad exacta incluida en la carta."
            items={acompanantes}
            selectedItems={selectedAcompanantes}
            setSelectedItems={setSelectedAcompanantes}
            max={selectedSize.maxAcompanantes}
            searchPlaceholder="Buscar acompanantes..."
            label="Acompanantes"
          />
        )}

        {currentStep === 'salsas' && selectedSize && (
          <StepPicker
            title="Elige tus salsas"
            subtitle="Selecciona la cantidad exacta de salsas incluida para tu tamano."
            items={sauces}
            selectedItems={selectedSauces}
            setSelectedItems={setSelectedSauces}
            max={selectedSize.maxSauces}
            searchPlaceholder="Buscar salsas..."
            label="Salsas"
          />
        )}

        {currentStep === 'complementos' && selectedSize && (
          <StepPicker
            title="Elige tus complementos"
            subtitle="Incluye texturas, toppings y complementos premium si aplican."
            items={complementos}
            selectedItems={selectedComplementos}
            setSelectedItems={setSelectedComplementos}
            max={selectedSize.maxComplementos}
            searchPlaceholder="Buscar complementos..."
            label="Complementos"
          />
        )}

        {currentStep === 'summary' && selectedSize && (
          <div className="animate-fade-in space-y-6">
            <div>
              <h3 className="text-xl font-semibold">Resumen de tu bowl</h3>
              <p className="text-sm text-muted-foreground">Revisa la configuracion antes de agregarla al carrito.</p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-sm font-semibold">Tamano</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedSize.name} - {formatPrice(selectedSize.price)}
                </p>
              </div>

              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-sm font-semibold">Base</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedBases.map((item) => item.name).join(', ')}</p>
              </div>

              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-sm font-semibold">Proteinas</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedProteins.map((item) => `${item.name}${item.price ? ` (+${formatPrice(item.price)})` : ''}`).join(', ')}
                </p>
              </div>

              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-sm font-semibold">Acompanantes</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedAcompanantes.map((item) => item.name).join(', ')}</p>
              </div>

              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-sm font-semibold">Salsas</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedSauces.map((item) => item.name).join(', ')}</p>
              </div>

              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-sm font-semibold">Complementos</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedComplementos.map((item) => `${item.name}${item.price ? ` (+${formatPrice(item.price)})` : ''}`).join(', ')}
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Notas adicionales</label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ej: salsa aparte, sin mani..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-ohana-light p-4">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-ohana">{formatPrice(totalPrice)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t p-4">
        <Button variant="outline" onClick={goBack} disabled={currentStepIndex === 0}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>

        {currentStep === 'summary' ? (
          <Button onClick={handleSubmit} className="btn-ohana">
            Agregar al carrito
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!canProceed} className="btn-ohana">
            Siguiente
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
