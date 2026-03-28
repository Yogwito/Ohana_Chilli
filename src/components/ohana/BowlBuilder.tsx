import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useIngredients, useBowlRules } from '@/hooks/use-catalog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/context/CartContext';
import { calculateBowlExtraCharges, calculateBowlPrice, getBowlChargeableIngredients } from '@/domain/bowlPricing';
import { formatPrice } from '@/domain/formatPrice';
import { cn } from '@/lib/utils';
import type { BowlBuilderStep, BowlSizeRule, CustomBowl, Ingredient } from '@/types';

const steps: { id: BowlBuilderStep; label: string }[] = [
  { id: 'size', label: 'Tamaño' },
  { id: 'bases', label: 'Bases' },
  { id: 'proteins', label: 'Proteínas' },
  { id: 'acompanantes', label: 'Acompañantes' },
  { id: 'salsas', label: 'Salsas' },
  { id: 'complementos', label: 'Complementos' },
  { id: 'summary', label: 'Resumen' },
];

interface BowlBuilderProps {
  onComplete?: () => void;
}

function getSizeStructure(size: BowlSizeRule) {
  return [
    `${size.maxBases} base${size.maxBases !== 1 ? 's' : ''}`,
    `${size.maxProteins} proteína${size.maxProteins !== 1 ? 's' : ''}`,
    `${size.maxAcompanantes} acompañante${size.maxAcompanantes !== 1 ? 's' : ''}`,
    `${size.maxSauces} salsa${size.maxSauces !== 1 ? 's' : ''}`,
    `${size.maxComplementos} complemento${size.maxComplementos !== 1 ? 's' : ''}`,
  ];
}

function getSelectionLabel(items: Ingredient[]) {
  return items.length > 0 ? items.map((item) => item.name).join(', ') : 'Sin seleccionar';
}

export default function BowlBuilder({ onComplete }: BowlBuilderProps) {
  const { addCustomBowl } = useCart();

  const { data: bowlSizes = [], isLoading: sizesLoading } = useBowlRules();
  const { data: baseOptions = [], isLoading: basesLoading } = useIngredients('base');
  const { data: proteinOptions = [], isLoading: proteinsLoading } = useIngredients('protein');
  const { data: acompananteOptions = [], isLoading: acompLoading } = useIngredients('acompanante');
  const { data: sauceOptions = [], isLoading: saucesLoading } = useIngredients('sauce');
  const { data: complementoOptions = [], isLoading: complLoading } = useIngredients('topping');
  const dataLoading = sizesLoading || basesLoading || proteinsLoading || acompLoading || saucesLoading || complLoading;

  const [currentStep, setCurrentStep] = useState<BowlBuilderStep>('size');
  const [selectedSize, setSelectedSize] = useState<BowlSizeRule | null>(null);
  const [selectedBases, setSelectedBases] = useState<Ingredient[]>([]);
  const [selectedProteins, setSelectedProteins] = useState<Ingredient[]>([]);
  const [selectedAcompanantes, setSelectedAcompanantes] = useState<Ingredient[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<Ingredient[]>([]);
  const [selectedComplementos, setSelectedComplementos] = useState<Ingredient[]>([]);
  const [notes, setNotes] = useState('');
  const [adicionalSelections, setAdicionalSelections] = useState<Record<string, Ingredient | null>>({});
  const [stepVisible, setStepVisible] = useState(false);

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  // Double-RAF trick: reset → layout → transition to visible on each step change
  useEffect(() => {
    setStepVisible(false);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setStepVisible(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [currentStep]);

  const previewBowl = useMemo<CustomBowl | null>(() => {
    if (!selectedSize) return null;
    return {
      size: selectedSize,
      bases: selectedBases,
      proteins: selectedProteins,
      acompanantes: selectedAcompanantes,
      sauces: selectedSauces,
      complementos: selectedComplementos,
      notes: notes || undefined,
    };
  }, [
    notes,
    selectedAcompanantes,
    selectedBases,
    selectedComplementos,
    selectedProteins,
    selectedSauces,
    selectedSize,
  ]);

  const totalPrice = useMemo(() => {
    if (!previewBowl) return 0;
    return calculateBowlPrice(previewBowl);
  }, [previewBowl]);

  const extraChargeItems = useMemo(() => {
    if (!previewBowl) return [];
    return getBowlChargeableIngredients(previewBowl);
  }, [previewBowl]);

  const extraChargeTotal = useMemo(() => {
    if (!previewBowl) return 0;
    return calculateBowlExtraCharges(previewBowl);
  }, [previewBowl]);

  const summaryRows = useMemo(() => {
    if (!previewBowl) return [];

    return [
      { label: 'Base', value: getSelectionLabel(previewBowl.bases) },
      { label: 'Proteínas', value: getSelectionLabel(previewBowl.proteins) },
      { label: 'Acompañantes', value: getSelectionLabel(previewBowl.acompanantes) },
      { label: 'Salsas', value: getSelectionLabel(previewBowl.sauces ?? []) },
      { label: 'Complementos', value: getSelectionLabel(previewBowl.complementos ?? []) },
      {
        label: 'Cargos extra',
        value: extraChargeItems.length > 0
          ? extraChargeItems.map((item) => `${item.name} (+${formatPrice(item.price ?? 0)})`).join(', ')
          : 'Sin cargos extra',
      },
    ];
  }, [extraChargeItems, previewBowl]);

  const resetBuilder = () => {
    setSelectedSize(null);
    setSelectedBases([]);
    setSelectedProteins([]);
    setSelectedAcompanantes([]);
    setSelectedSauces([]);
    setSelectedComplementos([]);
    setNotes('');
    setAdicionalSelections({});
    setCurrentStep('size');
  };

  const resetSelectionsForSizeChange = () => {
    setSelectedBases([]);
    setSelectedProteins([]);
    setSelectedAcompanantes([]);
    setSelectedSauces([]);
    setSelectedComplementos([]);
    setNotes('');
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
      case 'proteins': {
        const filled = selectedProteins.length === (selectedSize?.maxProteins ?? 0);
        const adicionales = selectedProteins.filter(i => i.name.toLowerCase().includes('adicional'));
        const allSpecified = adicionales.every(a => adicionalSelections[a.id]);
        return filled && allSpecified;
      }
      case 'acompanantes': {
        const filled = selectedAcompanantes.length === (selectedSize?.maxAcompanantes ?? 0);
        const adicionales = selectedAcompanantes.filter(i => i.name.toLowerCase().includes('adicional'));
        const allSpecified = adicionales.every(a => adicionalSelections[a.id]);
        return filled && allSpecified;
      }
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
  };

  const goNext = () => {
    if (!canProceed) return;
    const nextStep = steps[currentStepIndex + 1];
    if (!nextStep) return;
    setCurrentStep(nextStep.id);
  };

  const handleSizeSelect = (size: BowlSizeRule) => {
    const hasChanged = selectedSize?.size !== size.size;
    setSelectedSize(size);
    if (hasChanged) {
      resetSelectionsForSizeChange();
    }
    setCurrentStep('bases');
  };

  const handleSubmit = () => {
    if (!previewBowl) return;

    const enrichedProteins = selectedProteins.map(item => {
      if (item.name.toLowerCase().includes('adicional')) {
        const specific = adicionalSelections[item.id];
        return specific ? { ...item, name: `${item.name} (${specific.name})` } : item;
      }
      return item;
    });
    const enrichedAcompanantes = selectedAcompanantes.map(item => {
      if (item.name.toLowerCase().includes('adicional')) {
        const specific = adicionalSelections[item.id];
        return specific ? { ...item, name: `${item.name} (${specific.name})` } : item;
      }
      return item;
    });
    const enrichedBowl: CustomBowl = {
      ...previewBowl,
      proteins: enrichedProteins,
      acompanantes: enrichedAcompanantes,
    };

    addCustomBowl(enrichedBowl, notes || undefined);
    toast.success('Bowl personalizado agregado al carrito', {
      description: `${previewBowl.size.name} - ${formatPrice(totalPrice)}`,
    });
    resetBuilder();
    onComplete?.();
  };

  const CounterBadge = ({ current, max, label }: { current: number; max: number; label: string }) => {
    const isFull = current === max;
    return (
      <div
        className={cn(
          'rounded-full px-3 py-1 text-xs font-semibold transition-all duration-300',
          isFull ? 'bg-ohana text-ohana-foreground scale-105' : 'bg-muted text-muted-foreground',
        )}
      >
        {label} {current}/{max}
      </div>
    );
  };

  const IngredientCard = ({
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
        'group rounded-2xl border bg-card p-4 text-left shadow-sm transition-all duration-200',
        isSelected
          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md shadow-primary/10'
          : 'border-border hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 hover:shadow-md',
        isDisabled && !isSelected && 'cursor-not-allowed opacity-40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{ingredient.name}</p>
          <p className="text-xs text-muted-foreground">
            {ingredient.price ? `+${formatPrice(ingredient.price)}` : 'Incluido'}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors',
            isSelected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-muted/50 text-transparent group-hover:border-primary/30',
          )}
        >
          <Check className="h-4 w-4" />
        </span>
      </div>
    </button>
  );

  const StepPicker = ({
    title,
    subtitle,
    items,
    selectedItems,
    setSelectedItems,
    max,
    label,
  }: {
    title: string;
    subtitle: string;
    items: Ingredient[];
    selectedItems: Ingredient[];
    setSelectedItems: Dispatch<SetStateAction<Ingredient[]>>;
    max: number;
    label: string;
  }) => {
    const selectedAdicionales = selectedItems.filter(item =>
      item.name.toLowerCase().includes('adicional')
    );

    return (
      <div className="animate-slide-in">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <CounterBadge current={selectedItems.length} max={max} label={label} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {items.map((item) => (
            <IngredientCard
              key={item.id}
              ingredient={item}
              isSelected={selectedItems.some((selectedItem) => selectedItem.id === item.id)}
              isDisabled={selectedItems.length >= max}
              onClick={() => toggleIngredient(item, selectedItems, setSelectedItems, max)}
            />
          ))}
        </div>

        {selectedAdicionales.map(adicional => (
          <div
            key={adicional.id}
            className="mt-4 p-4 rounded-xl border border-brand/20 dark:border-brand/30 bg-brand/5 dark:bg-brand/10 animate-fade-in"
          >
            <p className="text-sm font-medium text-brand-dark mb-2">
              ¿Cuál {adicional.name.replace(/\s*adicional/i, '').trim().toLowerCase()} extra quieres?
            </p>
            <div className="flex flex-wrap gap-2">
              {items
                .filter(i => !i.name.toLowerCase().includes('adicional'))
                .map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setAdicionalSelections(prev => ({
                      ...prev,
                      [adicional.id]: prev[adicional.id]?.id === option.id ? null : option,
                    }))}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm border transition-colors',
                      adicionalSelections[adicional.id]?.id === option.id
                        ? 'bg-brand text-white border-brand'
                        : 'bg-card border-border hover:border-brand/50',
                    )}
                  >
                    {option.name}
                  </button>
                ))}
            </div>
            {!adicionalSelections[adicional.id] && (
              <p className="text-xs text-amber-600 mt-2">
                Selecciona cuál quieres agregar
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const SizeSelector = () => (
    <section className="border-b bg-muted/20 px-6 py-6">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Paso 1</p>
          <h3 className="text-xl font-semibold">Elige el tamaño de tu bowl</h3>
          <p className="text-sm text-muted-foreground">
            Una sola selección. Estas tarjetas definen el tamaño, el precio base y los límites del bowl.
          </p>
        </div>
        {selectedSize ? (
          <div className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
            Seleccionado: {selectedSize.name}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {bowlSizes.map((size) => {
          const isSelected = selectedSize?.size === size.size;

          return (
            <button
              key={size.size}
              type="button"
              onClick={() => handleSizeSelect(size)}
              aria-pressed={isSelected}
              className={cn(
                'rounded-2xl border bg-card p-5 text-left shadow-sm transition-all duration-200',
                isSelected
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md shadow-primary/10'
                  : 'border-border hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 hover:shadow-md',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">{size.name}</p>
                  <p className="mt-1 text-2xl font-bold text-ohana-dark">{formatPrice(size.price)}</p>
                </div>
                {isSelected ? (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </span>
                ) : null}
              </div>

              <div className="my-4 h-px bg-border/70" />

              <div className="space-y-2 text-sm text-muted-foreground">
                {getSizeStructure(size).map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );

  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;

  if (dataLoading) {
    return (
      <div className="overflow-hidden rounded-[2rem] border bg-card shadow-lg p-12 flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ohana border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Cargando ingredientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border bg-card shadow-lg">
      <div className="h-0.5 bg-muted">
        <div
          className="h-full bg-ohana transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="border-b px-4 pb-3 pt-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 overflow-x-auto scrollbar-thin pb-1" role="tablist">
            {steps.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = step.id === currentStep;
              const isUpcoming = index > currentStepIndex;
              const available = index <= currentStepIndex || (index === currentStepIndex + 1 && canProceed);

              return (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  onClick={() => available && setCurrentStep(step.id)}
                  disabled={!available}
                  className={cn(
                    'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200',
                    isCurrent && 'bg-ohana text-white shadow-sm',
                    isCompleted && !isCurrent && 'bg-ohana/10 text-ohana/70',
                    isUpcoming && 'cursor-default opacity-40',
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-ohana/70" />
                  ) : null}
                  {step.label}
                </button>
              );
            })}
          </div>
          <span className="ml-1 shrink-0 whitespace-nowrap text-xs text-muted-foreground">
            {currentStepIndex + 1}/{steps.length}
          </span>
        </div>
      </div>

      <SizeSelector />

      <div className="p-6" role="tabpanel">
        <div className={cn('scroll-fade-up', stepVisible && 'in-view')}>
          {currentStep === 'size' ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <h3 className="text-xl font-semibold">Selecciona un tamaño arriba</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Las tarjetas superiores son el único selector de tamaño. Al tocar una, avanzas directo a Bases.
              </p>
            </div>
          ) : null}

          {currentStep === 'bases' && selectedSize ? (
            <StepPicker
              title="Elige tu base"
              subtitle="Selecciona exactamente una base. Las opciones con recargo suman al total al instante."
              items={baseOptions}
              selectedItems={selectedBases}
              setSelectedItems={setSelectedBases}
              max={selectedSize.maxBases}
              label="Bases"
            />
          ) : null}

          {currentStep === 'proteins' && selectedSize ? (
            <StepPicker
              title="Elige tus proteínas"
              subtitle="Respeta el límite de tu tamaño. La proteína adicional suma recargo automáticamente."
              items={proteinOptions}
              selectedItems={selectedProteins}
              setSelectedItems={setSelectedProteins}
              max={selectedSize.maxProteins}
              label="Proteínas"
            />
          ) : null}

          {currentStep === 'acompanantes' && selectedSize ? (
            <StepPicker
              title="Elige tus acompañantes"
              subtitle="Completa exactamente la cantidad incluida por tu bowl. El acompañante adicional también suma recargo."
              items={acompananteOptions}
              selectedItems={selectedAcompanantes}
              setSelectedItems={setSelectedAcompanantes}
              max={selectedSize.maxAcompanantes}
              label="Acomp."
            />
          ) : null}

          {currentStep === 'salsas' && selectedSize ? (
            <StepPicker
              title="Elige tus salsas"
              subtitle="Selecciona la cantidad exacta de salsas incluida para tu tamaño."
              items={sauceOptions}
              selectedItems={selectedSauces}
              setSelectedItems={setSelectedSauces}
              max={selectedSize.maxSauces}
              label="Salsas"
            />
          ) : null}

          {currentStep === 'complementos' && selectedSize ? (
            <StepPicker
              title="Elige tus complementos"
              subtitle="Estos complementos siguen la carta oficial. Croqueta veggie y queso frito suman recargo."
              items={complementoOptions}
              selectedItems={selectedComplementos}
              setSelectedItems={setSelectedComplementos}
              max={selectedSize.maxComplementos}
              label="Compl."
            />
          ) : null}

          {currentStep === 'summary' && selectedSize ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold">Resumen de tu bowl</h3>
                <p className="text-sm text-muted-foreground">
                  Revisa toda la configuración antes de agregarla al carrito.
                </p>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-5">
                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tamaño</p>
                    <p className="mt-1 text-lg font-semibold">{selectedSize.name}</p>
                  </div>
                  <p className="text-xl font-bold text-ohana-dark">{formatPrice(selectedSize.price)}</p>
                </div>

                <div className="space-y-4 pt-4">
                  {summaryRows.map((row) => (
                    <div key={row.label}>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{row.label}</p>
                      <p className="mt-1 text-sm leading-relaxed text-foreground">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Notas adicionales</label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ej: salsa aparte, sin maní..."
                  rows={3}
                />
              </div>

              <div className="rounded-2xl border bg-primary/5 p-5">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Base del bowl</span>
                  <span>{formatPrice(selectedSize.price)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Extras</span>
                  <span>{extraChargeTotal > 0 ? formatPrice(extraChargeTotal) : formatPrice(0)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                  <span className="text-base font-semibold">Total</span>
                  <span className="text-2xl font-bold text-ohana-dark">{formatPrice(totalPrice)}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t p-4">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={currentStepIndex === 0}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>

        <div className="flex flex-1 flex-col items-center gap-1.5">
          {!canProceed && currentStep !== 'summary' ? (
            <p className="animate-fade-in text-center text-xs text-muted-foreground">
              Completa la selección exacta para continuar
            </p>
          ) : null}

          {currentStep === 'summary' ? (
            <Button onClick={handleSubmit} className="btn-ohana gap-2">
              Agregar al carrito
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canProceed}
              className={cn('btn-ohana gap-2', !canProceed && 'opacity-50')}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
