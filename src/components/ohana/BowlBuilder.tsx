import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  Heart,
  Sparkles,
  X,
  Minus,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useIngredients, useBowlRules, useProducts } from '@/hooks/use-catalog';
import { useCart } from '@/context/CartContext';
import { useSavedBowls } from '@/hooks/use-saved-bowls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { calculateBowlPrice, getBowlChargeLines } from '@/domain/bowlPricing';
import {
  extraPrice,
  isGenericExtra,
  reconcileBowl,
  sections,
  validateBowl,
} from '@/domain/bowlConfiguration';
import { formatGroupedIngredients } from '@/domain/bowlSummary';
import { formatPrice } from '@/domain/formatPrice';
import type {
  BowlExtra,
  BowlSizeRule,
  CustomBowl,
  Ingredient,
  Product,
} from '@/types';
import { getBowlUpsells } from '@/domain/bowlUpsells';
import BrandIllustration from '@/components/ohana/BrandIllustration';
import './bowl-studio.css';

const EXTRAS_STEP = sections.length + 1;
const DRINKS_STEP = EXTRAS_STEP + 1;
const SUMMARY_STEP = DRINKS_STEP + 1;
const steps = [
  'Tamaño',
  ...sections.map((s) => s.label),
  'Extras',
  'Bebidas',
  'Resumen',
];
const blank = (size: BowlSizeRule): CustomBowl => ({
  size,
  bases: [],
  proteins: [],
  acompanantes: [],
  sauces: [],
  complementos: [],
  extras: [],
  notes: '',
});
export default function BowlBuilder({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const { cart, addBowlOrder } = useCart();
  const { saved, saveBowl, removeBowl } = useSavedBowls();
  const {
    data: sizes = [],
    isLoading: sizesLoading,
    error: sizesError,
    refetch: refetchSizes,
  } = useBowlRules();
  const {
    data: ingredients = [],
    isLoading: ingredientsLoading,
    error: ingredientsError,
    refetch: refetchIngredients,
  } = useIngredients();
  const {
    data: drinks = [],
    isLoading: drinksLoading,
    error: drinksError,
    refetch: refetchDrinks,
  } = useProducts({ categoryId: 'ohana-bebidas' });
  const [bowl, setBowl] = useState<CustomBowl | null>(null);
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState<number[]>([0]);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [selectedDrinks, setSelectedDrinks] = useState<
    { product: Product; quantity: number }[]
  >([]);
  const [selector, setSelector] = useState<Ingredient | null>(null);
  const [saveName, setSaveName] = useState<string | null>(null);
  const [editId, setEditId] = useState<string>();
  const [notice, setNotice] = useState('');
  const content = useRef<HTMLFieldSetElement>(null);
  const selectorTrigger = useRef<HTMLButtonElement | null>(null);
  const [verifying, setVerifying] = useState(false);
  const submitting = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const total = bowl ? calculateBowlPrice(bowl) : 0;
  const drinksTotal = selectedDrinks.reduce(
    (sum, d) => sum + d.quantity * d.product.price,
    0,
  );
  const issues = bowl ? validateBowl(bowl, sizes, ingredients) : [];
  const section = sections[step - 1];
  const sectionIssues = section
    ? issues.filter((i) => i.section === section.key)
    : [];
  const scroll = () =>
    requestAnimationFrame(() => {
      content.current?.focus({ preventScroll: true });
      content.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
        block: 'start',
      });
    });
  const move = (next: number) => {
    setSelector(null);
    setStep(next);
    setVisited((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setRecipeOpen(false);
    scroll();
  };
  const load = (config: CustomBowl, id?: string) => {
    const current = reconcileBowl(config, sizes, ingredients);
    setBowl(current);
    setSelectedDrinks([]);
    setSelector(null);
    setSaveName(null);
    setEditId(id);
    submitting.current = false;
    setNotice(
      calculateBowlPrice(current) !== calculateBowlPrice(config)
        ? 'El precio se actualizó con el menú vigente. Revisa el total antes de confirmar.'
        : 'Revisa tu receta con las opciones del menú vigente.',
    );
    move(SUMMARY_STEP);
  };
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('editar-bowl');
    if (!id || ingredientsLoading || sizesLoading || editId === id) return;
    const item = cart?.items.find((i) => i.id === id);
    if (item && !item.customBowl) {
      setEditId(id);
      setNotice('Selecciona un tamaño para reconstruir la receta guardada.');
    }
    if (item?.customBowl) {
      try {
        load(item.customBowl, id);
      } catch {
        setNotice(
          'No pudimos recuperar esta receta. Selecciona un tamaño para reconstruirla.',
        );
        setEditId(id);
      }
    }
    // Catalog is consumed only when opening the editing request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, ingredientsLoading, sizesLoading, cart?.items]);
  const includedCount = (i: Ingredient) =>
    bowl
      ? (bowl[sections.find((s) => s.type === i.type)!.key] || []).filter(
          (x) => x.id === i.id,
        ).length
      : 0;
  const extrasCount = (i: Ingredient) =>
    (bowl?.extras || [])
      .filter((e) =>
        isGenericExtra(i) ? e.tariffId === i.id : e.ingredient.id === i.id,
      )
      .reduce((sum, e) => sum + e.quantity, 0);
  const addExtra = (
    i: Ingredient,
    source: BowlExtra['source'],
    tariff?: Ingredient,
  ) =>
    setBowl((prev) => {
      if (!prev) return prev;
      const unitPrice = extraPrice(i, source, tariff);
      const extras = [...(prev.extras || [])];
      const index = extras.findIndex(
        (e) =>
          e.ingredient.id === i.id &&
          e.source === source &&
          e.tariffId === tariff?.id &&
          e.unitPrice === unitPrice,
      );
      if (index < 0)
        extras.push({
          ingredient: i,
          source,
          tariffId: tariff?.id,
          unitPrice,
          quantity: 1,
        });
      else
        extras[index] = {
          ...extras[index],
          quantity: extras[index].quantity + 1,
        };
      return { ...prev, extras };
    });
  const add = (i: Ingredient, source: BowlExtra['source'] = 'suggestion') => {
    if (!bowl) return;
    if (isGenericExtra(i)) {
      setSelector(i);
      return;
    }
    const s = sections.find((s) => s.type === i.type)!;
    const included = bowl[s.key] || [];
    if (
      (i.type === 'base' || !i.price) &&
      included.length < bowl.size[s.max] &&
      (i.type !== 'acompanante' || includedCount(i) < 3)
    ) {
      setBowl((prev) => ({ ...prev!, [s.key]: [...(prev![s.key] || []), i] }));
    } else addExtra(i, i.price ? 'catalog' : source);
  };
  const remove = (i: Ingredient) =>
    setBowl((prev) => {
      if (!prev) return prev;
      const extras = [...(prev.extras || [])];
      const index = extras
        .map((e) => (isGenericExtra(i) ? e.tariffId : e.ingredient.id))
        .lastIndexOf(i.id);
      if (index >= 0) {
        if (extras[index].quantity > 1)
          extras[index] = {
            ...extras[index],
            quantity: extras[index].quantity - 1,
          };
        else extras.splice(index, 1);
        return { ...prev, extras };
      }
      const s = sections.find((s) => s.type === i.type)!;
      const list = [...(prev[s.key] || [])];
      const at = list.map((x) => x.id).lastIndexOf(i.id);
      if (at >= 0) list.splice(at, 1);
      return { ...prev, [s.key]: list };
    });
  const removeExtraAt = (index: number) =>
    setBowl((prev) =>
      prev
        ? {
            ...prev,
            extras: (prev.extras || []).flatMap((extra, at) =>
              at !== index
                ? [extra]
                : extra.quantity > 1
                  ? [{ ...extra, quantity: extra.quantity - 1 }]
                  : [],
            ),
          }
        : prev,
    );
  const shownPrice = (i: Ingredient, source: BowlExtra['source']) => {
    const s = sections.find((s) => s.type === i.type)!;
    if (!bowl) return 0;
    const hasSlot =
      (bowl[s.key] || []).length < bowl.size[s.max] &&
      (i.type !== 'acompanante' || includedCount(i) < 3);
    return !i.price && !isGenericExtra(i) && hasSlot
      ? 0
      : extraPrice(i, source, isGenericExtra(i) ? i : undefined);
  };
  const changeDrink = (product: Product, delta: number) =>
    setSelectedDrinks((prev) => {
      const quantity =
        prev.find((drink) => drink.product.id === product.id)?.quantity || 0;
      const rest = prev.filter((drink) => drink.product.id !== product.id);
      return quantity + delta > 0
        ? [...rest, { product, quantity: quantity + delta }]
        : rest;
    });
  const submit = async () => {
    if (!bowl || submitting.current) return;
    submitting.current = true;
    setVerifying(true);
    const [latestSizes, latestIngredients, latestDrinks] = await Promise.all([
      refetchSizes?.(),
      refetchIngredients?.(),
      refetchDrinks?.(),
    ]).catch(() => [null, null, null]);
    setVerifying(false);
    submitting.current = false;
    if (!latestSizes && refetchSizes) {
      setNotice('No pudimos verificar el menú. Intenta nuevamente.');
      return;
    }
    if (
      latestSizes?.isError ||
      latestIngredients?.isError ||
      (selectedDrinks.length && latestDrinks?.isError)
    ) {
      setNotice('No pudimos verificar el menú. Intenta confirmar nuevamente.');
      return;
    }
    const liveSizes = latestSizes?.data || sizes;
    const liveIngredients = latestIngredients?.data || ingredients;
    const liveDrinks = latestDrinks?.data || drinks;
    const canonical = reconcileBowl(bowl, liveSizes, liveIngredients);
    const invalid = validateBowl(canonical, liveSizes, liveIngredients);
    if (invalid.length) {
      setBowl(canonical);
      setNotice(invalid[0].message);
      const at = sections.findIndex((s) => s.key === invalid[0].section);
      move(at >= 0 ? at + 1 : invalid[0].section === 'size' ? 0 : 6);
      return;
    }
    const canonicalDrinks = selectedDrinks.map((d) => ({
      ...d,
      product: liveDrinks.find((p) => p.id === d.product.id),
    }));
    if (
      (selectedDrinks.length && drinksError) ||
      canonicalDrinks.some((d) => !d.product)
    ) {
      setNotice('Revisa las bebidas disponibles antes de confirmar.');
      move(DRINKS_STEP);
      return;
    }
    if (
      calculateBowlPrice(canonical) !== total ||
      canonicalDrinks.some(
        (d, i) => d.product!.price !== selectedDrinks[i].product.price,
      )
    ) {
      setBowl(canonical);
      setSelectedDrinks(canonicalDrinks as typeof selectedDrinks);
      setNotice(
        'El precio cambió. Revisa el nuevo total y confirma nuevamente.',
      );
      return;
    }
    submitting.current = true;
    addBowlOrder(canonical, canonicalDrinks as typeof selectedDrinks, editId);
    toast.success(
      editId ? 'Bowl actualizado' : 'Bowl personalizado agregado al carrito',
      { description: formatPrice(total + drinksTotal) },
    );
    setBowl(null);
    setSelectedDrinks([]);
    setStep(0);
    setVisited([0]);
    setRecipeOpen(false);
    setNotice('');
    setSaveName(null);
    setEditId(undefined);
    setSelector(null);
    if (editId) navigate('/#arma-tu-bowl', { replace: true });
    onComplete?.();
  };
  const cards = (
    items: Ingredient[],
    source: BowlExtra['source'],
    includedOnly = false,
  ) => (
    <div className="bowl-studio-options">
      {items.map((i) => {
        const count = includedCount(i) + extrasCount(i);
        const price =
          includedOnly && !isGenericExtra(i)
            ? i.price || 0
            : shownPrice(i, source);
        const selectedExtraAmount = (bowl?.extras || [])
          .filter((extra) =>
            isGenericExtra(i)
              ? extra.tariffId === i.id
              : extra.ingredient.id === i.id,
          )
          .reduce((sum, extra) => sum + extra.unitPrice * extra.quantity, 0);
        const s = sections.find((s) => s.type === i.type)!;
        const full =
          includedOnly &&
          (i.type === 'base' || !i.price) &&
          !isGenericExtra(i) &&
          ((bowl?.[s.key]?.length || 0) >= (bowl?.size[s.max] || 0) ||
            (i.type === 'acompanante' && includedCount(i) >= 3));
        return (
          <div
            key={i.id}
            className="bowl-studio-ingredient"
            data-selected={count > 0}
          >
            <div className="bowl-studio-option-copy">
              <p className="font-semibold">{i.name}</p>
              <p className="text-sm text-muted-foreground">
                {price
                  ? `${i.type === 'base' ? 'Recargo de base' : 'Porción adicional'}: +${formatPrice(price)}`
                  : full && !includedCount(i)
                    ? 'Cupo incluido completo'
                    : 'Incluido'}
                {i.type === 'acompanante' && !i.price
                  ? ' · Hasta 3 porciones incluidas'
                  : ''}
              </p>
              {count > 0 && (
                <p className="bowl-studio-portion-detail">
                  {includedCount(i) > 0
                    ? `${includedCount(i)} incluida${includedCount(i) !== 1 ? 's' : ''}`
                    : ''}
                  {includedCount(i) > 0 && extrasCount(i) > 0 ? ' · ' : ''}
                  {extrasCount(i) > 0
                    ? `${extrasCount(i)} adicional${extrasCount(i) !== 1 ? 'es' : ''} · +${formatPrice(selectedExtraAmount)}`
                    : ''}
                </p>
              )}
            </div>
            <div className="bowl-studio-quantity">
              <Button
                variant="outline"
                size="icon"
                disabled={!count}
                onClick={() => remove(i)}
                aria-label={`Quitar ${i.name}`}
              >
                <Minus size={16} />
              </Button>
              <span aria-live="polite">{count}</span>
              <Button
                variant="outline"
                size="icon"
                disabled={full}
                onClick={(event) => {
                  if (isGenericExtra(i))
                    selectorTrigger.current = event.currentTarget;
                  add(i, source);
                }}
                aria-label={`Agregar ${i.name}`}
              >
                <Plus size={16} />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
  const options = useMemo(
    () => (section ? ingredients.filter((i) => i.type === section.type) : []),
    [ingredients, section],
  );
  const recommendedExtras = bowl ? getBowlUpsells(bowl, ingredients) : [];
  const paidDrinks = drinks.filter((drink) => drink.price > 0);
  const recommendedDrink =
    !drinksError && !drinksLoading
      ? paidDrinks.find((drink) => /bretaña/i.test(drink.name)) || paidDrinks[0]
      : undefined;
  const recommendations = bowl &&
    (recommendedExtras.length > 0 || recommendedDrink) && (
      <section
        className="bowl-studio-upsells"
        aria-label="Extras recomendados para tu bowl"
      >
        <div className="bowl-studio-upsells-heading">
          <Sparkles size={20} aria-hidden="true" />
          <h4>Dale un extra a tu bowl</h4>
        </div>
        <p className="bowl-studio-upsells-description">
          Porciones adicionales y bebidas, con costo aparte. Tú eliges si las
          sumas.
        </p>
        <div className="bowl-studio-upsell-grid">
          {recommendedExtras.map((recommendation) => {
            const { ingredient, source, tariff, price } = recommendation;
            const matching = (extra: BowlExtra) =>
              extra.ingredient.id === ingredient.id &&
              extra.source === source &&
              extra.tariffId === tariff?.id &&
              extra.unitPrice === price;
            const quantity = (bowl.extras || [])
              .filter(matching)
              .reduce((sum, extra) => sum + extra.quantity, 0);
            return (
              <div
                className="bowl-studio-upsell-card"
                key={ingredient.id}
                data-selected={quantity > 0}
              >
                <div>
                  <p className="bowl-studio-upsell-kind">
                    {ingredient.type === 'protein'
                      ? 'MÁS PROTEÍNA'
                      : 'UN TOQUE EXTRA'}
                  </p>
                  <h5>Extra de {ingredient.name}</h5>
                  <strong>+{formatPrice(price)}</strong>
                  <span>por porción adicional</span>
                </div>
                <div className="bowl-studio-upsell-actions">
                  {quantity > 0 && (
                    <div className="bowl-studio-upsell-selected">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Restar extra de ${ingredient.name}`}
                        onClick={() =>
                          removeExtraAt((bowl.extras || []).findIndex(matching))
                        }
                      >
                        <Minus size={14} />
                      </Button>
                      <span aria-live="polite">
                        {quantity} agregado{quantity !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    aria-label={`Sumar extra de ${ingredient.name}`}
                    onClick={() => addExtra(ingredient, source, tariff)}
                  >
                    <Plus size={14} />
                    {quantity ? 'Sumar otra' : 'Sumar'}
                  </Button>
                </div>
              </div>
            );
          })}
          {recommendedDrink &&
            (() => {
              const quantity =
                selectedDrinks.find(
                  (drink) => drink.product.id === recommendedDrink.id,
                )?.quantity || 0;
              return (
                <div
                  className="bowl-studio-upsell-card"
                  data-selected={quantity > 0}
                >
                  <div>
                    <p className="bowl-studio-upsell-kind">ACOMPAÑA TU BOWL</p>
                    <h5>{recommendedDrink.name}</h5>
                    <strong>+{formatPrice(recommendedDrink.price)}</strong>
                    <span>por bebida</span>
                  </div>
                  <div className="bowl-studio-upsell-actions">
                    {quantity > 0 && (
                      <div className="bowl-studio-upsell-selected">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Restar bebida ${recommendedDrink.name}`}
                          onClick={() => changeDrink(recommendedDrink, -1)}
                        >
                          <Minus size={14} />
                        </Button>
                        <span aria-live="polite">
                          {quantity} agregada{quantity !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      aria-label={`Sumar bebida ${recommendedDrink.name}`}
                      onClick={() => changeDrink(recommendedDrink, 1)}
                    >
                      <Plus size={14} />
                      {quantity ? 'Sumar otra' : 'Sumar'}
                    </Button>
                  </div>
                </div>
              );
            })()}
        </div>
        {step !== EXTRAS_STEP && (
          <button
            type="button"
            className="bowl-studio-upsells-more"
            onClick={() => move(EXTRAS_STEP)}
          >
            Ver todos los extras <ChevronRight size={14} />
          </button>
        )}
        {step !== DRINKS_STEP && recommendedDrink && (
          <button
            type="button"
            className="bowl-studio-upsells-more"
            onClick={() => move(DRINKS_STEP)}
          >
            Ver todas las bebidas <ChevronRight size={14} />
          </button>
        )}
      </section>
    );
  const chargeLines = bowl ? getBowlChargeLines(bowl) : [];
  const stepNeedsReview = (index: number) => {
    const key =
      index === 0
        ? 'size'
        : index === EXTRAS_STEP
          ? 'extras'
          : index === DRINKS_STEP
            ? 'drinks'
            : sections[index - 1]?.key;
    return index === SUMMARY_STEP
      ? issues.length > 0
      : issues.some((issue) => issue.section === key);
  };
  const recipe = bowl && (
    <div className="bowl-studio-recipe-content">
      <div className="bowl-studio-recipe-heading">
        <div>
          <p className="bowl-studio-eyebrow">HECHO A TU GUSTO</p>
          <h4>Tu receta</h4>
        </div>
        <button
          type="button"
          className="bowl-studio-size-chip"
          disabled={verifying}
          onClick={() => move(0)}
          aria-label="Editar tamaño"
        >
          {bowl.size.name} <ChevronDown size={12} />
        </button>
      </div>
      <div className="bowl-studio-recipe-rows">
        {sections.map((s, index) => (
          <div className="bowl-studio-recipe-row" key={s.key}>
            <div className="bowl-studio-recipe-row-title">
              <strong>{s.label}</strong>
              <button
                type="button"
                disabled={verifying}
                onClick={() => move(index + 1)}
                aria-label={`Editar ${s.label.toLowerCase()}`}
              >
                Editar
              </button>
            </div>
            <p>
              {(bowl[s.key] || []).length
                ? formatGroupedIngredients(bowl[s.key] || [])
                : s.min
                  ? 'Pendiente de elegir'
                  : 'Sin seleccionar'}
            </p>
            {issues
              .filter((issue) => issue.section === s.key)
              .map((issue) => (
                <p className="bowl-studio-review" key={issue.message}>
                  {issue.message}
                </p>
              ))}
          </div>
        ))}
        <div className="bowl-studio-recipe-row">
          <div className="bowl-studio-recipe-row-title">
            <strong>Adicionales</strong>
            <button
              type="button"
              disabled={verifying}
              onClick={() => move(EXTRAS_STEP)}
              aria-label="Editar adicionales"
            >
              Editar
            </button>
          </div>
          {issues
            .filter((issue) => issue.section === 'extras')
            .map((issue) => (
              <p className="bowl-studio-review" key={issue.message}>
                {issue.message}
              </p>
            ))}
          {(bowl.extras || []).length ? (
            bowl.extras!.map((extra, index) => (
              <div
                className="bowl-studio-extra-row"
                key={`${extra.ingredient.id}-${index}`}
              >
                <p>
                  {extra.ingredient.name} x{extra.quantity} ·{' '}
                  {formatPrice(extra.quantity * extra.unitPrice)}
                </p>
                <button
                  type="button"
                  disabled={verifying}
                  aria-label={`Quitar una porción adicional de ${extra.ingredient.name}`}
                  onClick={() => removeExtraAt(index)}
                >
                  <Minus size={14} />
                </button>
              </div>
            ))
          ) : (
            <p>Sin adicionales</p>
          )}
        </div>
        <div className="bowl-studio-recipe-row">
          <div className="bowl-studio-recipe-row-title">
            <strong>Bebidas</strong>
            <button
              type="button"
              disabled={verifying}
              onClick={() => move(DRINKS_STEP)}
              aria-label="Editar bebidas"
            >
              Editar
            </button>
          </div>
          {selectedDrinks.length ? (
            selectedDrinks.map((d) => (
              <p key={d.product.id}>
                {d.product.name} x{d.quantity} ·{' '}
                {formatPrice(d.product.price * d.quantity)}
              </p>
            ))
          ) : (
            <p>Sin bebidas</p>
          )}
        </div>
      </div>
      <dl className="bowl-studio-price-breakdown">
        <div>
          <dt>Precio base</dt>
          <dd>{formatPrice(bowl.size.price)}</dd>
        </div>
        {chargeLines.map((line, index) => (
          <div key={`${line.label}-${line.unitAmount}-${index}`}>
            <dt>
              {line.label}
              {line.quantity > 1 ? ` x${line.quantity}` : ''}
            </dt>
            <dd>+{formatPrice(line.amount)}</dd>
          </div>
        ))}
        <div>
          <dt>Subtotal del bowl</dt>
          <dd>{formatPrice(total)}</dd>
        </div>
        <div>
          <dt>Bebidas:</dt>
          <dd>{formatPrice(drinksTotal)}</dd>
        </div>
      </dl>
      <p className="bowl-studio-recipe-total">
        Total a agregar <strong>{formatPrice(total + drinksTotal)}</strong>
      </p>
      <p className="bowl-studio-recipe-note">
        Tu bowl y las bebidas se agregan juntos al confirmar.
      </p>
    </div>
  );
  if (sizesLoading || ingredientsLoading)
    return <p className="p-8">Cargando ingredientes…</p>;
  if (sizesError || ingredientsError)
    return (
      <p role="alert" className="p-8">
        No pudimos cargar el menú. Recarga la página para intentar nuevamente.
      </p>
    );
  return (
    <div className="bowl-studio" data-summary={step === SUMMARY_STEP}>
      <div className="bowl-studio-progress h-1 bg-muted">
        <div
          className="h-full bg-brand"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>
      <div className="bowl-studio-navigation">
        <div className="bowl-studio-mobile-navigation">
          <span>
            Paso {step + 1} de {steps.length}
          </span>
          <label className="bowl-studio-step-select">
            <span className="sr-only">Ir a un paso</span>
            <select
              value={step}
              disabled={verifying}
              onChange={(event) => move(Number(event.target.value))}
            >
              {steps.map((label, index) => (
                <option key={label} value={index} disabled={!bowl && index > 0}>
                  {label}
                  {bowl && stepNeedsReview(index) ? ' · Revisar' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </label>
        </div>
        <nav
          className="bowl-studio-desktop-navigation"
          aria-label="Pasos para armar tu bowl"
        >
          {steps.map((label, index) => (
            <button
              key={label}
              aria-current={step === index ? 'step' : undefined}
              data-visited={visited.includes(index)}
              data-review={Boolean(bowl && stepNeedsReview(index))}
              aria-label={`${label}${bowl && stepNeedsReview(index) ? ' · Necesita revisión' : ''}`}
              disabled={verifying || (!bowl && index > 0)}
              className="bowl-studio-tab rounded-full"
              onClick={() => move(index)}
            >
              <span className="bowl-studio-step-number">{index + 1}</span>
              {label}
            </button>
          ))}
        </nav>
      </div>
      <div className="bowl-studio-layout">
        <fieldset
          disabled={verifying}
          ref={content}
          className="bowl-studio-content"
          tabIndex={-1}
        >
          <legend className="sr-only">{steps[step]}</legend>
          {notice && (
            <p
              role="status"
              className="mb-4 rounded-xl border bg-muted p-3 text-sm"
            >
              {notice}
            </p>
          )}
          {bowl && step > 0 && (
            <div className="mb-5 flex items-center justify-between">
              <span className="font-semibold">{bowl.size.name}</span>
              <Button variant="ghost" onClick={() => move(0)}>
                Cambiar tamaño
              </Button>
            </div>
          )}
          {step === 0 && (
            <>
              <h3>Elige tu tamaño</h3>
              <p className="mb-5 text-muted-foreground">
                Una base y una proteína como mínimo. Puedes elegir menos
                porciones sin cambiar el precio.
              </p>
              {(!sizes.length ||
                !ingredients.some((i) => i.type === 'base') ||
                !ingredients.some(
                  (i) => i.type === 'protein' && !i.price && !isGenericExtra(i),
                )) && (
                <p role="alert" className="mb-4">
                  No hay tamaños, bases o proteínas incluidas disponibles para
                  armar un bowl en este momento.
                </p>
              )}
              {issues
                .filter((issue) => issue.section === 'size')
                .map((issue) => (
                  <p role="alert" key={issue.message}>
                    {issue.message}
                  </p>
                ))}
              <div className="bowl-studio-size-grid">
                {sizes.map((size) => (
                  <button
                    key={size.size}
                    aria-pressed={bowl?.size.size === size.size}
                    disabled={
                      size.maxBases < 1 ||
                      size.maxProteins < 1 ||
                      !ingredients.some((i) => i.type === 'base') ||
                      !ingredients.some(
                        (i) =>
                          i.type === 'protein' &&
                          !i.price &&
                          !isGenericExtra(i),
                      )
                    }
                    className="bowl-studio-size rounded-2xl border bg-muted/30 p-5 text-left"
                    onClick={() => {
                      setBowl((prev) =>
                        prev ? { ...prev, size } : blank(size),
                      );
                      submitting.current = false;
                      setNotice(
                        bowl
                          ? 'Conservamos tu receta. Ajusta las porciones que excedan los cupos del nuevo tamaño.'
                          : '',
                      );
                      move(1);
                    }}
                  >
                    <div className="bowl-studio-size-art mb-3">
                      <BrandIllustration kind="bowl" />
                    </div>
                    <p className="text-xl font-semibold">{size.name}</p>
                    <p className="bowl-studio-size-price">
                      {formatPrice(size.price)}
                    </p>
                    <ul className="bowl-studio-inclusions">
                      {sections.map((s) => (
                        <li key={s.key}>
                          <span>{s.label}</span>
                          <strong>{size[s.max]}</strong>
                        </li>
                      ))}
                    </ul>
                    <span className="bowl-studio-size-action">
                      Elegir tamaño <ChevronRight size={18} />
                    </span>
                  </button>
                ))}
              </div>
              {saved.length > 0 && (
                <div className="mt-6">
                  <h4 className="mb-3 font-semibold">Tus bowls favoritos</h4>
                  {saved.map((f) => (
                    <div key={f.id} className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        className="h-auto min-h-11 max-w-full whitespace-normal break-words text-left [overflow-wrap:anywhere]"
                        onClick={() => load(f.config)}
                      >
                        {f.name}
                      </Button>
                      <Button variant="ghost" onClick={() => removeBowl(f.id)}>
                        Eliminar favorito
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {section && bowl && (
            <>
              <h3>Elige {section.label.toLowerCase()}</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                {section.min
                  ? 'Elige al menos una opción.'
                  : 'Opcional: puedes omitir este paso.'}{' '}
                Hasta {bowl.size[section.max]}{' '}
                {bowl.size[section.max] === 1
                  ? 'porción incluida'
                  : 'porciones incluidas'}
                .
              </p>
              <p className="bowl-studio-slot-count">
                {(bowl[section.key] || []).length} de {bowl.size[section.max]}{' '}
                {bowl.size[section.max] === 1
                  ? 'porción incluida'
                  : 'porciones incluidas'}
              </p>
              <p className="mb-4 text-sm">
                Selección actual:{' '}
                {formatGroupedIngredients(bowl[section.key] || [])}
              </p>
              {sectionIssues.map((i) => (
                <p
                  role="alert"
                  key={i.message}
                  className="mb-3 text-sm text-destructive"
                >
                  {i.message}
                </p>
              ))}
              {(bowl[section.key] || []).map(
                (i, index) =>
                  (!ingredients.some(
                    (current) =>
                      current.id === i.id && current.type === section.type,
                  ) ||
                    isGenericExtra(i)) && (
                    <div
                      key={`${i.id}-${index}`}
                      className="mb-3 rounded-xl border p-3"
                    >
                      <p>{i.name} · No disponible</p>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setBowl((prev) => ({
                            ...prev!,
                            [section.key]: (prev![section.key] || []).filter(
                              (_, at) => at !== index,
                            ),
                          }))
                        }
                      >
                        Quitar esta porción
                      </Button>
                    </div>
                  ),
              )}
              {options.length ? (
                cards(options, 'suggestion', true)
              ) : (
                <p role="alert">No hay opciones disponibles en esta sección.</p>
              )}
              <p className="mt-4 text-sm text-muted-foreground">
                Puedes agregar porciones adicionales en Extras. Su precio
                aparece antes de seleccionarlas.
              </p>
            </>
          )}
          {section && bowl && recommendations}
          {step === EXTRAS_STEP && bowl && (
            <>
              <h3>¿Algo más para tu bowl?</h3>
              <p className="mb-5 text-muted-foreground">
                Suma ingredientes adicionales. Las bebidas tienen su propio paso
                a continuación.
              </p>
              {issues
                .filter((issue) => issue.section === 'extras')
                .map((issue) => (
                  <p
                    role="alert"
                    className="mb-3 text-sm text-destructive"
                    key={issue.message}
                  >
                    {issue.message}
                  </p>
                ))}
              {recommendations}
              <div className="bowl-studio-extra-groups">
                {sections
                  .filter((s) => s.type !== 'base')
                  .map((s) => {
                    const options = ingredients.filter(
                      (i) => i.type === s.type,
                    );
                    const chosen =
                      (bowl[s.key] || []).length +
                      (bowl.extras || [])
                        .filter((e) => e.ingredient.type === s.type)
                        .reduce((sum, e) => sum + e.quantity, 0);
                    return options.length ? (
                      <details
                        className="bowl-studio-extra-group"
                        key={s.key}
                        open
                      >
                        <summary>
                          <span>{s.label}</span>
                          <span className="bowl-studio-group-count">
                            {chosen
                              ? `${chosen} ${chosen === 1 ? 'porción' : 'porciones'}`
                              : 'Ver opciones'}
                          </span>
                          <ChevronDown size={16} aria-hidden="true" />
                        </summary>
                        {cards(options, 'upsell')}
                      </details>
                    ) : null;
                  })}
              </div>
            </>
          )}
          {step === DRINKS_STEP && bowl && (
            <>
              <h3>¿Una bebida para acompañar?</h3>
              <p className="mb-4 text-muted-foreground">
                Este paso es opcional. Puedes continuar sin añadir bebidas.
              </p>
              <Button
                variant="outline"
                className="mb-5"
                onClick={() => {
                  setSelectedDrinks([]);
                  move(SUMMARY_STEP);
                }}
              >
                Continuar sin bebidas <ChevronRight size={16} />
              </Button>
              {drinksLoading ? (
                <p>Cargando bebidas…</p>
              ) : drinksError ? (
                <p role="alert">
                  No pudimos cargar las bebidas. Puedes continuar sin ellas.
                </p>
              ) : !drinks.length ? (
                <p>
                  No hay bebidas disponibles por ahora. Puedes continuar con tu
                  bowl.
                </p>
              ) : (
                <div className="bowl-studio-options bowl-studio-drinks">
                  {drinks.map((product) => {
                    const quantity =
                      selectedDrinks.find((d) => d.product.id === product.id)
                        ?.quantity || 0;
                    return (
                      <div
                        key={product.id}
                        className="bowl-studio-ingredient"
                        data-selected={quantity > 0}
                      >
                        <div className="bowl-studio-option-copy">
                          <p className="font-semibold">{product.name}</p>
                          <p>{formatPrice(product.price)}</p>
                        </div>
                        <div className="bowl-studio-quantity">
                          <Button
                            size="icon"
                            variant="outline"
                            disabled={!quantity}
                            aria-label={`Quitar ${product.name}`}
                            onClick={() => changeDrink(product, -1)}
                          >
                            <Minus size={16} />
                          </Button>
                          <span>{quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            aria-label={`Agregar ${product.name}`}
                            onClick={() => changeDrink(product, 1)}
                          >
                            <Plus size={16} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
          {bowl && step > 0 && bowl.reviewIssues?.length ? (
            <div className="mt-5 space-y-2">
              {(bowl.reviewIssues || []).map((message) => (
                <div key={message}>
                  <p role="alert">{message}</p>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setBowl((prev) => ({
                        ...prev!,
                        reviewIssues: prev!.reviewIssues!.filter(
                          (x) => x !== message,
                        ),
                        ...Object.fromEntries(
                          sections.map((s) => [
                            s.key,
                            (prev![s.key] || []).filter(
                              (i) =>
                                !(
                                  /^extra-/.test(i.id) &&
                                  message.includes(i.name)
                                ),
                            ),
                          ]),
                        ),
                      }))
                    }
                  >
                    Descartar extra antiguo no identificado
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
          {step === SUMMARY_STEP && bowl && (
            <>
              <h3>Resumen de tu bowl</h3>
              {issues.map((i) => (
                <p
                  key={i.message}
                  role="alert"
                  className="my-2 text-destructive"
                >
                  {i.message}
                </p>
              ))}
              {recommendations}
              {recipe}
              <label className="mt-4 block">
                Notas para tu bowl
                <Textarea
                  value={bowl.notes || ''}
                  onChange={(e) =>
                    setBowl((prev) => ({ ...prev!, notes: e.target.value }))
                  }
                />
              </label>
              {saveName === null ? (
                <Button
                  variant="outline"
                  className="mt-4 gap-2"
                  onClick={() => setSaveName('Mi bowl')}
                >
                  <Heart size={16} />
                  Guardar como favorito
                </Button>
              ) : (
                <div className="bowl-studio-save-form">
                  <Input
                    aria-label="Nombre del favorito"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                  />
                  <Button
                    disabled={issues.length > 0}
                    onClick={() => {
                      if (issues.length) return;
                      saveBowl(saveName, bowl);
                      setSaveName(null);
                      toast.success('Receta guardada en tus favoritos');
                    }}
                  >
                    Guardar
                  </Button>
                  <Button variant="ghost" onClick={() => setSaveName(null)}>
                    Cancelar
                  </Button>
                </div>
              )}
            </>
          )}
        </fieldset>
        {bowl && step !== SUMMARY_STEP && (
          <aside
            className="bowl-studio-recipe"
            aria-label="Resumen de tu receta"
          >
            <button
              type="button"
              className="bowl-studio-recipe-toggle"
              disabled={verifying}
              aria-expanded={recipeOpen}
              aria-controls="bowl-recipe-panel"
              onClick={() => setRecipeOpen((open) => !open)}
            >
              <ClipboardList size={18} />
              <span>{recipeOpen ? 'Ocultar receta' : 'Ver receta'}</span>
              <ChevronDown size={16} />
            </button>
            <div
              id="bowl-recipe-panel"
              className="bowl-studio-recipe-panel"
              data-open={recipeOpen}
            >
              {recipe}
            </div>
          </aside>
        )}
        {bowl && (
          <div className="bowl-studio-footer">
            {bowl && (
              <div className="bowl-studio-footer-price" role="status">
                <span>Total</span>
                <strong>{formatPrice(total + drinksTotal)}</strong>
              </div>
            )}
            <div className="bowl-studio-footer-actions">
              <Button
                variant="ghost"
                disabled={verifying || step === 0}
                onClick={() => move(step - 1)}
              >
                <ChevronLeft size={16} />
                Anterior
              </Button>
              {step === SUMMARY_STEP ? (
                <Button
                  disabled={verifying}
                  className="btn-ohana"
                  onClick={submit}
                >
                  {editId ? 'Actualizar bowl' : 'Agregar al carrito'}
                </Button>
              ) : (
                <Button
                  className="btn-ohana"
                  disabled={
                    verifying || !bowl || (section && sectionIssues.length > 0)
                  }
                  onClick={() => move(step + 1)}
                >
                  {step === DRINKS_STEP
                    ? selectedDrinks.length
                      ? 'Continuar al resumen'
                      : 'Saltar bebidas'
                    : step === EXTRAS_STEP
                      ? 'Continuar a bebidas'
                      : section?.min === 0 && !bowl?.[section.key]?.length
                        ? 'Omitir'
                        : 'Siguiente'}
                  <ChevronRight size={16} />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      <Dialog
        open={Boolean(selector)}
        onOpenChange={(open) => {
          if (!open) setSelector(null);
        }}
      >
        <DialogContent
          className="bowl-extra-dialog"
          onCloseAutoFocus={(event) => {
            const trigger = selectorTrigger.current;
            selectorTrigger.current = null;
            if (trigger?.isConnected) {
              event.preventDefault();
              trigger.focus({ preventScroll: true });
            }
          }}
        >
          <DialogTitle>
            Elige tu{' '}
            {selector?.type === 'protein'
              ? 'proteína'
              : selector?.type === 'acompanante'
                ? 'acompañante'
                : 'complemento'}{' '}
            adicional
          </DialogTitle>
          <DialogDescription>
            Selecciona el ingrediente que quieres sumar. Cada porción adicional
            cuesta{' '}
            {selector
              ? formatPrice(extraPrice(selector, 'generic', selector))
              : ''}
            .
          </DialogDescription>
          <div className="bowl-extra-dialog-options">
            {selector &&
              ingredients
                .filter(
                  (i) =>
                    i.type === selector.type && !i.price && !isGenericExtra(i),
                )
                .map((i) => (
                  <Button
                    key={i.id}
                    disabled={verifying}
                    variant="outline"
                    onClick={() => {
                      addExtra(i, 'generic', selector);
                      setSelector(null);
                    }}
                  >
                    {i.name}
                    <Plus size={16} />
                  </Button>
                ))}
          </div>
          {selector &&
            !ingredients.some(
              (i) => i.type === selector.type && !i.price && !isGenericExtra(i),
            ) && (
              <p role="status">
                No hay ingredientes disponibles para este adicional por ahora.
              </p>
            )}
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="bowl-extra-dialog-close"
              aria-label="Cerrar selector de extras"
            >
              <X size={18} />
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="ghost" className="min-h-11">
              Cancelar
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
