import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useIngredients, useBowlRules } from '@/hooks/use-catalog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/context/CartContext';
import {
  calculateBowlExtraCharges,
  calculateBowlPrice,
  EXTRA_PROTEIN_PRICE,
  EXTRA_TOPPING_PRICE,
  getBowlChargeLines,
  getIngredientExtraCharge,
} from '@/domain/bowlPricing';
import { formatGroupedIngredients, getBowlSummaryRows } from '@/domain/bowlSummary';
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

type SelectionStep = Exclude<BowlBuilderStep, 'size' | 'summary'>;

interface BowlBuilderProps {
  onComplete?: () => void;
}

interface StepConfig {
  label: string;
  title: string;
  subtitle: string;
  singular: string;
  plural: string;
  min: number;
  max: number;
  /** When set, the +/- counter is per-ingredient (capped at perItemMax) instead of per-total. */
  perItemMax?: number;
  /** When true, the step can be skipped without selecting anything. */
  optional?: boolean;
}

function getSizeStructure(size: BowlSizeRule) {
  return [
    `${size.maxBases} base${size.maxBases !== 1 ? 's' : ''}`,
    `${size.maxProteins} proteína${size.maxProteins !== 1 ? 's' : ''}`,
    `${size.maxAcompanantes} acompañante${size.maxAcompanantes !== 1 ? 's' : ''}`,
    `Hasta ${size.maxSauces} salsa${size.maxSauces !== 1 ? 's' : ''}`,
    `Hasta ${size.maxComplementos} complemento${size.maxComplementos !== 1 ? 's' : ''}`,
  ];
}

function getIngredientCount(items: Ingredient[], ingredientId: string) {
  return items.filter((item) => item.id === ingredientId).length;
}

function updateIngredientSelection(
  ingredient: Ingredient,
  setSelectedItems: Dispatch<SetStateAction<Ingredient[]>>,
  action: 'add' | 'remove',
  max: number,
  perItemMax?: number,
) {
  setSelectedItems((previousItems) => {
    if (action === 'add') {
      if (perItemMax !== undefined) {
        const itemCount = previousItems.filter((i) => i.id === ingredient.id).length;
        if (itemCount >= perItemMax) return previousItems;
      } else {
        if (previousItems.length >= max) return previousItems;
      }
      return [...previousItems, ingredient];
    }

    const removableIndex = previousItems.map((item) => item.id).lastIndexOf(ingredient.id);
    if (removableIndex === -1) return previousItems;

    const nextItems = [...previousItems];
    nextItems.splice(removableIndex, 1);
    return nextItems;
  });
}

function formatStepQuantity(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getStepHint(config: StepConfig, currentCount: number) {
  if (config.max === 0) {
    return 'No hay opciones activas en esta sección.';
  }

  if (config.optional && currentCount === 0) {
    return 'Opcional — puedes saltar este paso.';
  }

  const remainingRequired = Math.max(config.min - currentCount, 0);

  if (remainingRequired > 0) {
    return `Te faltan ${formatStepQuantity(remainingRequired, config.singular, config.plural)} para continuar.`;
  }

  if (config.perItemMax !== undefined) {
    return `Incluidos listos. Puedes agregar hasta ${config.perItemMax} de cada uno — los extras tienen costo adicional.`;
  }

  if (currentCount === config.max) {
    return 'Llegaste al límite de esta sección.';
  }

  if (config.min === 0) {
    return `Puedes omitir esta sección o elegir hasta ${formatStepQuantity(config.max, config.singular, config.plural)}.`;
  }

  return `Puedes repetir ingredientes mientras no superes ${formatStepQuantity(config.max, config.singular, config.plural)}.`;
}

function getStepNextLabel(currentStep: BowlBuilderStep, canProceed: boolean, isOptionalBlank: boolean) {
  if (currentStep === 'summary') return 'Agregar al carrito';
  if (!canProceed) return 'Siguiente';
  if (isOptionalBlank) return 'Omitir';
  return 'Siguiente';
}

export default function BowlBuilder({ onComplete }: BowlBuilderProps) {
  const { addCustomBowl } = useCart();

  const { data: bowlSizes = [], isLoading: sizesLoading, error: sizesError } = useBowlRules();
  const { data: baseOptions = [], isLoading: basesLoading, error: basesError } = useIngredients('base');
  const { data: proteinOptions = [], isLoading: proteinsLoading, error: proteinsError } = useIngredients('protein');
  const { data: acompananteOptions = [], isLoading: acompLoading, error: acompError } = useIngredients('acompanante');
  const { data: sauceOptions = [], isLoading: saucesLoading, error: saucesError } = useIngredients('sauce');
  const { data: complementoOptions = [], isLoading: complLoading, error: complError } = useIngredients('topping');
  const dataLoading = sizesLoading || basesLoading || proteinsLoading || acompLoading || saucesLoading || complLoading;
  const dataError = sizesError || basesError || proteinsError || acompError || saucesError || complError;

  const [currentStep, setCurrentStep] = useState<BowlBuilderStep>('size');
  const [selectedSize, setSelectedSize] = useState<BowlSizeRule | null>(null);
  const [selectedBases, setSelectedBases] = useState<Ingredient[]>([]);
  const [selectedProteins, setSelectedProteins] = useState<Ingredient[]>([]);
  const [selectedAcompanantes, setSelectedAcompanantes] = useState<Ingredient[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<Ingredient[]>([]);
  const [selectedComplementos, setSelectedComplementos] = useState<Ingredient[]>([]);
  const [notes, setNotes] = useState('');
  const [stepVisible, setStepVisible] = useState(false);

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  useEffect(() => {
    setStepVisible(false);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setStepVisible(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [currentStep]);

  const stepConfigs = useMemo<Record<SelectionStep, StepConfig> | null>(() => {
    if (!selectedSize) return null;

    return {
      bases: {
        label: 'Bases',
        title: 'Elige tu base',
        subtitle: 'Completa la porción incluida por tu bowl. Puedes repetir la misma base si así la quieres.',
        singular: 'base',
        plural: 'bases',
        min: selectedSize.maxBases,
        max: selectedSize.maxBases,
      },
      proteins: {
        label: 'Proteínas',
        title: 'Elige tus proteínas',
        subtitle: `Completa las proteínas incluidas. Si existe una opción de proteína extra, suma ${formatPrice(EXTRA_PROTEIN_PRICE)}.`,
        singular: 'proteína',
        plural: 'proteínas',
        min: selectedSize.maxProteins,
        max: selectedSize.maxProteins,
      },
      acompanantes: {
        label: 'Acomp.',
        title: 'Elige tus acompañantes',
        subtitle: `Selecciona los incluidos (${selectedSize.maxAcompanantes}). Puedes pedir hasta 3 de cada uno — los marcados como extra suman ${formatPrice(EXTRA_TOPPING_PRICE)} c/u.`,
        singular: 'acompañante',
        plural: 'acompañantes',
        min: selectedSize.maxAcompanantes,
        max: selectedSize.maxAcompanantes,
        perItemMax: 3,
      },
      salsas: {
        label: 'Salsas',
        title: 'Elige tus salsas',
        subtitle: 'Esta sección es opcional. Puedes omitirla o elegir solo las salsas que sí quieres.',
        singular: 'salsa',
        plural: 'salsas',
        min: 0,
        max: selectedSize.maxSauces,
        optional: true,
      },
      complementos: {
        label: 'Compl.',
        title: 'Elige tus complementos',
        subtitle: 'Esta sección es opcional. Los complementos premium muestran su recargo en tiempo real.',
        singular: 'complemento',
        plural: 'complementos',
        min: 0,
        max: selectedSize.maxComplementos,
        optional: true,
      },
    };
  }, [selectedSize]);

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

  const extraChargeTotal = useMemo(() => {
    if (!previewBowl) return 0;
    return calculateBowlExtraCharges(previewBowl);
  }, [previewBowl]);

  const extraChargeLines = useMemo(() => {
    if (!previewBowl) return [];
    return getBowlChargeLines(previewBowl);
  }, [previewBowl]);

  const summaryRows = useMemo(() => {
    if (!previewBowl) return [];
    return getBowlSummaryRows(previewBowl);
  }, [previewBowl]);

  const liveSummaryRows = useMemo(() => {
    if (!selectedSize) return [];

    return [
      { label: 'Base', value: formatGroupedIngredients(selectedBases) },
      { label: 'Proteínas', value: formatGroupedIngredients(selectedProteins) },
      { label: 'Acompañantes', value: formatGroupedIngredients(selectedAcompanantes) },
      { label: 'Salsas', value: formatGroupedIngredients(selectedSauces) },
      { label: 'Complementos', value: formatGroupedIngredients(selectedComplementos) },
    ];
  }, [selectedAcompanantes, selectedBases, selectedComplementos, selectedProteins, selectedSauces, selectedSize]);

  const currentSelectionCount = useMemo(() => {
    switch (currentStep) {
      case 'bases':
        return selectedBases.length;
      case 'proteins':
        return selectedProteins.length;
      case 'acompanantes':
        return selectedAcompanantes.length;
      case 'salsas':
        return selectedSauces.length;
      case 'complementos':
        return selectedComplementos.length;
      default:
        return 0;
    }
  }, [currentStep, selectedAcompanantes.length, selectedBases.length, selectedComplementos.length, selectedProteins.length, selectedSauces.length]);

  const currentStepConfig = currentStep !== 'size' && currentStep !== 'summary' && stepConfigs ? stepConfigs[currentStep] : null;

  const isStepComplete = (step: BowlBuilderStep) => {
    if (!selectedSize && step !== 'size') return false;

    switch (step) {
      case 'size':
        return selectedSize !== null;
      case 'bases':
        return selectedBases.length >= (stepConfigs?.bases.min ?? 0);
      case 'proteins':
        return selectedProteins.length >= (stepConfigs?.proteins.min ?? 0);
      case 'acompanantes':
        return selectedAcompanantes.length >= (stepConfigs?.acompanantes.min ?? 0);
      case 'salsas':
        return selectedSauces.length >= (stepConfigs?.salsas.min ?? 0);
      case 'complementos':
        return selectedComplementos.length >= (stepConfigs?.complementos.min ?? 0);
      case 'summary':
        return true;
      default:
        return false;
    }
  };

  const canProceed = isStepComplete(currentStep);
  const isOptionalBlank = Boolean(currentStepConfig && currentStepConfig.min === 0 && currentSelectionCount === 0);

  const resetBuilder = () => {
    setSelectedSize(null);
    setSelectedBases([]);
    setSelectedProteins([]);
    setSelectedAcompanantes([]);
    setSelectedSauces([]);
    setSelectedComplementos([]);
    setNotes('');
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

    addCustomBowl(previewBowl, notes || undefined);
    toast.success('Bowl personalizado agregado al carrito', {
      description: `${previewBowl.size.name} - ${formatPrice(totalPrice)}`,
    });
    resetBuilder();
    onComplete?.();
  };

  const CounterBadge = ({
    current,
    config,
  }: {
    current: number;
    config: StepConfig;
  }) => {
    // When perItemMax is set the total can exceed max (extras are allowed), so only
    // check the lower bound for the "complete" colour.
    const isComplete = current >= config.min && (config.perItemMax !== undefined || current <= config.max);

    return (
      <div
        className={cn(
          'rounded-full px-3 py-1 text-xs font-semibold transition-all duration-300',
          isComplete ? 'bg-ohana text-ohana-foreground scale-105' : 'bg-muted text-muted-foreground',
        )}
      >
        {config.label} {current}/{config.max}{config.min === 0 ? ' opcional' : ''}
      </div>
    );
  };

  const IngredientCard = ({
    ingredient,
    count,
    max,
    onAdd,
    onRemove,
    perItemMax,
  }: {
    ingredient: Ingredient;
    count: number;
    max: number;
    onAdd: () => void;
    onRemove: () => void;
    perItemMax?: number;
  }) => {
    const charge = getIngredientExtraCharge(ingredient);
    const isIncluded = charge === 0;
    const isAddDisabled = max <= 0 || (perItemMax !== undefined ? count >= perItemMax : currentSelectionCount >= max);
    const isMaxedForNewSelection = perItemMax !== undefined ? count >= perItemMax : currentSelectionCount >= max;

    return (
      <div
        className={cn(
          'rounded-2xl border bg-card p-4 shadow-sm transition-all duration-200',
          count > 0
            ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
            : 'border-border hover:border-primary/40 hover:bg-primary/5 hover:shadow-md',
          isMaxedForNewSelection && 'opacity-60',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{ingredient.name}</p>
            <p className="text-xs text-muted-foreground">
              {isIncluded ? 'Incluido' : `+${formatPrice(charge)}`}
            </p>
          </div>
          <span
            className={cn(
              'inline-flex min-w-[2rem] items-center justify-center rounded-full border px-2 py-1 text-xs font-semibold transition-colors',
              count > 0 ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted/50 text-muted-foreground',
            )}
          >
            x{count}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {count > 0
              ? `${formatStepQuantity(count, 'selección', 'selecciones')}`
              : isMaxedForNewSelection
                ? 'Límite alcanzado'
                : 'Disponible'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onRemove}
              disabled={count === 0}
              aria-label={`Quitar ${ingredient.name}`}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onAdd}
              disabled={isAddDisabled}
              aria-label={`Agregar ${ingredient.name}`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const StepPicker = ({
    items,
    selectedItems,
    setSelectedItems,
    config,
  }: {
    items: Ingredient[];
    selectedItems: Ingredient[];
    setSelectedItems: Dispatch<SetStateAction<Ingredient[]>>;
    config: StepConfig;
  }) => (
    <div className="animate-slide-in">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div>
            <h3 className="text-xl font-semibold">{config.title}</h3>
            <p className="text-sm text-muted-foreground">{config.subtitle}</p>
          </div>
          <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <p>{getStepHint(config, selectedItems.length)}</p>
            <p className="mt-2 font-medium text-foreground">
              Selección actual: {formatGroupedIngredients(selectedItems)}
            </p>
          </div>
        </div>
        <CounterBadge current={selectedItems.length} config={config} />
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          No hay ingredientes disponibles en esta sección por ahora.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {items.map((item) => (
            <IngredientCard
              key={item.id}
              ingredient={item}
              count={getIngredientCount(selectedItems, item.id)}
              max={config.max}
              perItemMax={config.perItemMax}
              onAdd={() => updateIngredientSelection(item, setSelectedItems, 'add', config.max, config.perItemMax)}
              onRemove={() => updateIngredientSelection(item, setSelectedItems, 'remove', config.max)}
            />
          ))}
        </div>
      )}
    </div>
  );

  const SizeSelector = () => (
    <section className="border-b bg-muted/20 px-6 py-6">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Paso 1</p>
          <h3 className="text-xl font-semibold">Elige el tamaño de tu bowl</h3>
          <p className="text-sm text-muted-foreground">
            El tamaño define el precio base y cuántas selecciones puedes hacer en cada sección.
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
                  ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                  : 'border-border hover:border-primary/40 hover:bg-primary/5 hover:shadow-md',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">{size.name}</p>
                  <p className="mt-1 text-2xl font-bold text-ohana-dark">{formatPrice(size.price)}</p>
                </div>
                {isSelected ? (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    ✓
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
      <div className="flex min-h-[300px] items-center justify-center overflow-hidden rounded-[2rem] border bg-card p-12 shadow-lg">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-ohana border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando ingredientes...</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="flex min-h-[300px] items-center justify-center overflow-hidden rounded-[2rem] border bg-card p-12 shadow-lg">
        <div className="space-y-3 text-center">
          <p className="text-base font-semibold text-foreground">No pudimos cargar el menú</p>
          <p className="text-sm text-muted-foreground">Revisa tu conexión e intenta de nuevo.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-full border border-ohana px-5 py-2 text-sm font-medium text-ohana transition-colors hover:bg-ohana/10"
          >
            Reintentar
          </button>
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
                Las tarjetas superiores definen el precio base y te llevan al siguiente paso automáticamente.
              </p>
            </div>
          ) : null}

          {currentStep === 'bases' && currentStepConfig ? (
            <StepPicker
              items={baseOptions}
              selectedItems={selectedBases}
              setSelectedItems={setSelectedBases}
              config={currentStepConfig}
            />
          ) : null}

          {currentStep === 'proteins' && currentStepConfig ? (
            <StepPicker
              items={proteinOptions}
              selectedItems={selectedProteins}
              setSelectedItems={setSelectedProteins}
              config={currentStepConfig}
            />
          ) : null}

          {currentStep === 'acompanantes' && currentStepConfig ? (
            <StepPicker
              items={acompananteOptions}
              selectedItems={selectedAcompanantes}
              setSelectedItems={setSelectedAcompanantes}
              config={currentStepConfig}
            />
          ) : null}

          {currentStep === 'salsas' && currentStepConfig ? (
            <StepPicker
              items={sauceOptions}
              selectedItems={selectedSauces}
              setSelectedItems={setSelectedSauces}
              config={currentStepConfig}
            />
          ) : null}

          {currentStep === 'complementos' && currentStepConfig ? (
            <StepPicker
              items={complementoOptions}
              selectedItems={selectedComplementos}
              setSelectedItems={setSelectedComplementos}
              config={currentStepConfig}
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
                {extraChargeLines.map((line) => (
                  <div key={`${line.label}-${line.unitAmount}`} className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {line.label}
                      {line.quantity > 1 ? ` x${line.quantity}` : ''}
                    </span>
                    <span>{formatPrice(line.amount)}</span>
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Extras</span>
                  <span>{formatPrice(extraChargeTotal)}</span>
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

      {selectedSize && currentStep !== 'summary' ? (
        <div className="border-t bg-muted/20 px-4 py-4">
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tu bowl</p>
                <p className="mt-1 text-lg font-semibold">{selectedSize.name}</p>
                <p className="text-sm text-muted-foreground">
                  Base: {formatPrice(selectedSize.price)} · Extras: {formatPrice(extraChargeTotal)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total</p>
                <p className="mt-1 text-xl font-bold text-ohana-dark">{formatPrice(totalPrice)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {liveSummaryRows.map((row) => (
                <div key={row.label}>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{row.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4 border-t p-4">
        <Button variant="ghost" onClick={goBack} disabled={currentStepIndex === 0} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>

        <div className="flex flex-1 flex-col items-center gap-1.5">
          {currentStep !== 'summary' && currentStepConfig && (!canProceed || (currentStepConfig.optional && currentSelectionCount === 0)) ? (
            <p className="animate-fade-in text-center text-xs text-muted-foreground">
              {getStepHint(currentStepConfig, currentSelectionCount)}
            </p>
          ) : null}

          {currentStep === 'summary' ? (
            <Button onClick={handleSubmit} className="btn-ohana gap-2">
              {getStepNextLabel(currentStep, canProceed, isOptionalBlank)}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                onClick={goNext}
                disabled={!canProceed}
                className={cn('btn-ohana gap-2', !canProceed && 'opacity-50')}
              >
                {getStepNextLabel(currentStep, canProceed, isOptionalBlank)}
                <ChevronRight className="h-4 w-4" />
              </Button>
              {currentStepConfig?.optional && currentSelectionCount === 0 ? (
                <Button variant="ghost" size="sm" onClick={goNext} className="text-muted-foreground">
                  Saltar este paso →
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
