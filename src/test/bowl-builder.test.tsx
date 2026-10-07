import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BowlBuilder from '@/components/ohana/BowlBuilder';
import type { BowlSizeRule, Ingredient, Product } from '@/types';

const mocks = vi.hoisted(() => ({
  addCustomBowl: vi.fn(),
  addBowlOrder: vi.fn(),
  addProduct: vi.fn(),
  drinks: [] as Pick<Product, 'id' | 'name' | 'price' | 'imageUrl'>[],
  otherSizes: [] as BowlSizeRule[],
  bowlRule: {
    size: 'small',
    name: 'Pequeño',
    price: 23900,
    maxBases: 1,
    maxProteins: 2,
    maxAcompanantes: 1,
    maxSauces: 2,
    maxComplementos: 1,
  } as BowlSizeRule,
  ingredientMap: {
    base: [{ id: 'base-arroz', name: 'Arroz', type: 'base' }],
    protein: [{ id: 'protein-pollo', name: 'Pollo', type: 'protein' }],
    acompanante: [{ id: 'acomp-maiz', name: 'Maíz', type: 'acompanante' }],
    sauce: [{ id: 'sauce-pina', name: 'Piña', type: 'sauce' }],
    topping: [
      { id: 'top-queso', name: 'Queso Frito', type: 'topping', price: 6000 },
    ],
  } as Record<Ingredient['type'], Ingredient[]>,
}));

vi.mock('@/hooks/use-catalog', () => ({
  useBowlRules: () => ({
    data: [mocks.bowlRule, ...mocks.otherSizes],
    isLoading: false,
  }),
  useIngredients: (type?: Ingredient['type']) => ({
    data: type
      ? mocks.ingredientMap[type]
      : Object.values(mocks.ingredientMap).flat(),
    isLoading: false,
  }),
  useProducts: () => ({ data: mocks.drinks, isLoading: false }),
}));

vi.mock('@/context/CartContext', () => ({
  useCart: () => ({
    addBowlOrder: mocks.addBowlOrder,
    addCustomBowl: mocks.addCustomBowl,
    addProduct: mocks.addProduct,
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('BowlBuilder', () => {
  beforeEach(() => {
    mocks.addCustomBowl.mockReset();
    mocks.addBowlOrder.mockReset();
    localStorage.clear();
    mocks.addProduct.mockReset();
    mocks.drinks = [];
    mocks.otherSizes = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('does not scroll the page to the builder on initial render', () => {
    render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );
    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('returns to size selection and preserves ingredients when the same size is chosen', () => {
    render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar Arroz/i }));

    fireEvent.click(screen.getByRole('button', { name: /Cambiar tamaño/i }));
    expect(screen.getByRole('button', { name: /Pequeño/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));

    expect(screen.getByRole('button', { name: /Quitar Arroz/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Siguiente$/i })).toBeEnabled();
  });

  it('allows repeated selections, skipping optional steps, and preserves the final bowl payload', async () => {
    render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));

    fireEvent.click(screen.getByRole('button', { name: /Agregar Arroz/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Siguiente$/i }));

    fireEvent.click(screen.getByRole('button', { name: /Agregar Pollo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar Pollo/i }));
    expect(screen.getAllByText(/Pollo x2/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /^Siguiente$/i }));

    const addAcompananteButton = screen.getByRole('button', {
      name: /Agregar Ma[ií]z/i,
    });
    fireEvent.click(addAcompananteButton);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Agregar Ma[ií]z/i }),
      ).toBeDisabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Agregar Ma[ií]z/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Siguiente$/i }));

    const skipSaucesButton = screen.getByRole('button', { name: /^Omitir$/i });
    expect(skipSaucesButton).toBeEnabled();
    fireEvent.click(skipSaucesButton);

    const skipToppingsButton = screen.getByRole('button', {
      name: /^Omitir$/i,
    });
    expect(skipToppingsButton).toBeEnabled();
    fireEvent.click(skipToppingsButton);

    const skipExtrasButton = screen.getByRole('button', {
      name: /Continuar a bebidas/i,
    });
    expect(skipExtrasButton).toBeEnabled();
    fireEvent.click(skipExtrasButton);
    fireEvent.click(screen.getByRole('button', { name: 'Saltar bebidas' }));

    expect(screen.getByText(/Pollo x2/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\$.*23\.900/).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole('button', { name: /Agregar al carrito/i }),
    );

    await waitFor(() => expect(mocks.addBowlOrder).toHaveBeenCalledTimes(1));

    const savedBowl = mocks.addBowlOrder.mock.calls[0][0];

    expect(savedBowl.proteins).toHaveLength(2);
    expect(savedBowl.proteins[0].id).toBe('protein-pollo');
    expect(savedBowl.proteins[1].id).toBe('protein-pollo');
    expect(savedBowl.acompanantes).toHaveLength(1);
    expect(savedBowl.acompanantes[0].id).toBe('acomp-maiz');
    expect(savedBowl.sauces).toEqual([]);
    expect(savedBowl.complementos).toEqual([]);
  });
  it('keeps drinks pending, allows removal, and submits them only with the bowl', async () => {
    mocks.drinks = [{ id: 'drink', name: 'Bretaña', price: 5000 }];
    render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar Arroz/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Siguiente$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar Pollo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar Pollo/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Siguiente$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar Maíz/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Siguiente$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Omitir$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Omitir$/i }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Continuar a bebidas' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Bretaña' }));
    expect(mocks.addProduct).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Bretaña' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Bretaña' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 6 },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Agregar Queso Frito' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Queso Frito' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Continuar a bebidas' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Continuar al resumen/i }),
    );
    expect(screen.getByText(/Total a agregar/)).toHaveTextContent('28.900');
    fireEvent.click(
      screen.getByRole('button', { name: /Agregar al carrito/i }),
    );
    await waitFor(() => expect(mocks.addBowlOrder).toHaveBeenCalledTimes(1));
    expect(mocks.addBowlOrder.mock.calls[0][1]).toEqual([
      { product: mocks.drinks[0], quantity: 1 },
    ]);
    expect(mocks.addBowlOrder.mock.calls[0][0].complementos).toEqual([]);
  });

  it('validates required ingredients again when confirming from the summary', async () => {
    render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 8 },
    });
    fireEvent.click(screen.getByRole('button', { name: /Agregar al carrito/ }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Agregar Arroz' }),
      ).toBeInTheDocument(),
    );
    expect(mocks.addBowlOrder).not.toHaveBeenCalled();
  });
  it('adds a concrete premium directly and removes exactly one extra portion', () => {
    render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 6 },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Agregar Queso Frito' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Agregar Queso Frito' }),
    );
    expect(
      screen.getByText(/Queso Frito x2/, { selector: 'p' }),
    ).toHaveTextContent('12.000');
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Queso Frito' }));
    expect(screen.getByText(/Queso Frito x1/)).toHaveTextContent('6.000');
  });
  it('loads current favorite prices and clears unrelated pending beverages', () => {
    mocks.drinks = [{ id: 'drink', name: 'Bretaña', price: 5000 }];
    localStorage.setItem(
      'ohana-saved-bowls',
      JSON.stringify([
        {
          id: 'favorite',
          name: 'Receta',
          createdAt: '2026-10-05',
          config: {
            size: { ...mocks.bowlRule, price: 10000 },
            bases: mocks.ingredientMap.base,
            proteins: mocks.ingredientMap.protein,
            acompanantes: [],
            sauces: [],
            complementos: [],
            extras: [],
          },
        },
      ]),
    );
    render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 7 },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Bretaña' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar tamaño' }));
    fireEvent.click(screen.getByRole('button', { name: 'Receta' }));
    expect(screen.getByText(/Total a agregar/)).toHaveTextContent('23.900');
    expect(screen.getByText('Bebidas:').parentElement).toHaveTextContent('0');
    expect(screen.getByText(/El precio se actualizó/)).toBeInTheDocument();
  });

  it('preserves recipe, notes and beverages on a size change and requires correcting excess portions', () => {
    mocks.drinks = [{ id: 'drink', name: 'Bretaña', price: 5000 }];
    mocks.otherSizes = [
      {
        ...mocks.bowlRule,
        size: 'medium',
        name: 'Mediano',
        price: 27900,
        maxProteins: 1,
      },
    ];
    render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Arroz' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 2 },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Pollo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Pollo' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 7 },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Bretaña' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 8 },
    });
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Notas para tu bowl' }),
      { target: { value: 'Sin picante' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar tamaño' }));
    fireEvent.click(screen.getByRole('button', { name: /Mediano/i }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 2 },
    });
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(screen.getByText(/Selección actual: Pollo x2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Pollo' }));
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 8 },
    });
    expect(
      screen.getByRole('textbox', { name: 'Notas para tu bowl' }),
    ).toHaveValue('Sin picante');
    expect(screen.getByText(/Total a agregar/)).toHaveTextContent('32.900');
  });

  it('shows no food or beverage photos inside the builder', () => {
    mocks.drinks = [
      {
        id: 'drink',
        name: 'Bretaña',
        price: 5000,
        imageUrl: '/images/brands/bretana.png',
      },
    ];
    const { container } = render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 5 },
    });
    expect(container.querySelectorAll('img')).toHaveLength(0);
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 6 },
    });
    expect(
      screen.getByRole('button', { name: 'Agregar Queso Frito' }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 7 },
    });
    expect(
      screen.getByRole('button', { name: 'Agregar Bretaña' }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('edits a category from the recipe and keeps notes, drinks and selections', () => {
    mocks.drinks = [{ id: 'drink', name: 'Bretaña', price: 5000 }];
    render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Arroz' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 2 },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Pollo' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 7 },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Bretaña' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 8 },
    });
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Notas para tu bowl' }),
      { target: { value: 'Sin picante' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Editar proteínas' }));
    expect(screen.getByRole('button', { name: 'Quitar Pollo' })).toBeEnabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 8 },
    });
    expect(
      screen.getByRole('textbox', { name: 'Notas para tu bowl' }),
    ).toHaveValue('Sin picante');
    expect(screen.getByText(/Total a agregar/)).toHaveTextContent('28.900');
  });

  it('opens the mobile recipe and retains extras when their group is collapsed', () => {
    const { container } = render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 6 },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Agregar Queso Frito' }),
    );
    const group = container.querySelectorAll('details')[3];
    group.removeAttribute('open');
    expect(group.querySelector('summary')).toHaveTextContent('1 porción');
    fireEvent.click(screen.getByRole('button', { name: 'Ver receta' }));
    expect(
      screen.getByRole('button', { name: 'Ocultar receta' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Queso Frito x1/)).toHaveTextContent('6.000');
    expect(screen.getByText(/Total a agregar/)).toHaveTextContent('29.900');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Quitar una porción adicional de Queso Frito',
      }),
    );
    expect(screen.getByText(/Total a agregar/)).toHaveTextContent('23.900');
  });

  it('marks missing required categories for review without treating a visit as completion', () => {
    const { container } = render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
    const bases = container.querySelector(
      '.bowl-studio-tab[aria-current="step"]',
    );
    expect(bases).toHaveAttribute('data-review', 'true');
    expect(bases).toHaveAttribute('data-visited', 'true');
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Arroz' }));
    expect(bases).toHaveAttribute('data-review', 'false');
    expect(screen.getByText('1 de 1 porción incluida')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();
  });
  it('does not label an included base as a surcharge when its slot is filled', () => {
    const { container } = render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Arroz' }));
    const rice = container.querySelector(
      '.bowl-studio-ingredient[data-selected="true"]',
    );
    expect(rice).toHaveTextContent('Incluido');
    expect(rice).not.toHaveTextContent('Recargo de base');
    expect(
      screen.getByRole('button', { name: 'Agregar Arroz' }),
    ).toBeDisabled();
  });

  it('keeps the generic protein selector and submits its concrete ingredient and tariff', async () => {
    const previous = mocks.ingredientMap.protein;
    mocks.ingredientMap.protein = [
      ...previous,
      {
        id: 'protein-proteina-adicional',
        name: 'Proteína adicional',
        type: 'protein',
      },
    ];
    try {
      render(
        <MemoryRouter>
          <BowlBuilder />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Agregar Arroz' }));
      fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
        target: { value: 2 },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Agregar Pollo' }));
      fireEvent.click(
        screen.getByRole('button', { name: 'Agregar Proteína adicional' }),
      );
      expect(
        screen.getByRole('dialog', { name: 'Elige tu proteína adicional' }),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Pollo' }));
      fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
        target: { value: 8 },
      });
      expect(screen.getByText(/Total a agregar/)).toHaveTextContent('28.900');
      fireEvent.click(
        screen.getByRole('button', { name: 'Agregar al carrito' }),
      );
      await waitFor(() => expect(mocks.addBowlOrder).toHaveBeenCalledTimes(1));
      expect(mocks.addBowlOrder.mock.calls[0][0].extras).toEqual([
        expect.objectContaining({
          ingredient: previous[0],
          source: 'generic',
          tariffId: 'protein-proteina-adicional',
          unitPrice: 5000,
          quantity: 1,
        }),
      ]);
    } finally {
      mocks.ingredientMap.protein = previous;
    }
  });
  it('shows paid extras during the recipe and updates the total without consuming included slots', () => {
    render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
    expect(
      screen.getByRole('region', { name: 'Extras recomendados para tu bowl' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sumar extra de Queso Frito' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Restar extra de Queso Frito' }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Sumar extra de Queso Frito' }),
    );
    expect(screen.getByText(/Total a agregar/)).toHaveTextContent('29.900');
    fireEvent.click(
      screen.getByRole('button', { name: 'Restar extra de Queso Frito' }),
    );
    expect(screen.getByText(/Total a agregar/)).toHaveTextContent('23.900');
    expect(mocks.addBowlOrder).not.toHaveBeenCalled();
  });

  it('shows optional recommendations again before confirmation and submits exactly the chosen extras and drink', async () => {
    mocks.drinks = [{ id: 'drink', name: 'Bretaña', price: 5000 }];
    render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Arroz' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 2 },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Pollo' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 8 },
    });
    expect(screen.getByText(/Total a agregar/)).toHaveTextContent('23.900');
    fireEvent.click(
      screen.getByRole('button', { name: 'Sumar extra de Pollo' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Sumar extra de Queso Frito' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Sumar bebida Bretaña' }),
    );
    expect(screen.getByText(/Total a agregar/)).toHaveTextContent('39.900');
    expect(mocks.addProduct).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar al carrito' }));
    await waitFor(() => expect(mocks.addBowlOrder).toHaveBeenCalledTimes(1));
    const [config, drinks] = mocks.addBowlOrder.mock.calls[0];
    expect(config.proteins).toHaveLength(1);
    expect(config.complementos).toEqual([]);
    expect(config.extras).toEqual([
      expect.objectContaining({
        ingredient: mocks.ingredientMap.protein[0],
        quantity: 1,
        unitPrice: 5000,
      }),
      expect.objectContaining({
        ingredient: mocks.ingredientMap.topping[0],
        quantity: 1,
        unitPrice: 6000,
      }),
    ]);
    expect(drinks).toEqual([{ product: mocks.drinks[0], quantity: 1 }]);
  });
  it('recommends a paid beverage instead of a free catalog item and selects nothing automatically', () => {
    mocks.drinks = [
      { id: 'free', name: 'Agua de cortesía', price: 0 },
      { id: 'paid', name: 'Hatsu', price: 6000 },
    ];
    render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
    expect(
      screen.getByRole('button', { name: 'Sumar bebida Hatsu' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Sumar bebida Agua de cortesía' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Total a agregar/)).toHaveTextContent('23.900');
    expect(mocks.addBowlOrder).not.toHaveBeenCalled();
  });

  it('opens the generic selector at its trigger, supports cancel, and updates the tariff card quantity', async () => {
    const previous = mocks.ingredientMap.protein;
    mocks.ingredientMap.protein = [
      ...previous,
      {
        id: 'protein-proteina-adicional',
        name: 'Proteína adicional',
        type: 'protein',
      },
    ];
    try {
      render(
        <MemoryRouter>
          <BowlBuilder />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
      fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
        target: { value: 2 },
      });
      fireEvent.click(
        screen.getByRole('button', { name: 'Agregar Proteína adicional' }),
      );
      expect(
        screen.getByRole('dialog', { name: 'Elige tu proteína adicional' }),
      ).toHaveTextContent('5.000');
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await waitFor(() => expect(screen.getByRole('button', { name: 'Agregar Proteína adicional' })).toHaveFocus());
      expect(
        screen.getByRole('button', { name: 'Quitar Proteína adicional' }),
      ).toBeDisabled();
      fireEvent.click(
        screen.getByRole('button', { name: 'Agregar Proteína adicional' }),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Pollo' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await waitFor(() => expect(screen.getByRole('button', { name: 'Agregar Proteína adicional' })).toHaveFocus());
      expect(
        screen.getByRole('button', { name: 'Quitar Proteína adicional' }),
      ).toBeEnabled();
      expect(screen.getByText(/Total a agregar/)).toHaveTextContent('28.900');
      fireEvent.click(
        screen.getByRole('button', { name: 'Quitar Proteína adicional' }),
      );
      expect(
        screen.getByRole('button', { name: 'Quitar Proteína adicional' }),
      ).toBeDisabled();
      expect(screen.getByText(/Total a agregar/)).toHaveTextContent('23.900');
    } finally {
      mocks.ingredientMap.protein = previous;
    }
  });

  it('visits drinks after extras and can skip an empty beverage selection', () => {
    render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 6 },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Continuar a bebidas' }),
    );
    expect(
      screen.getByRole('heading', { name: '¿Una bebida para acompañar?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Paso 8 de 9')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Saltar bebidas' }));
    expect(
      screen.getByRole('heading', { name: 'Resumen de tu bowl' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Paso 9 de 9')).toBeInTheDocument();
  });

  it('explicitly continuing without drinks clears only pending beverages, retaining ingredients and paid extras', () => {
    mocks.drinks = [{ id: 'drink', name: 'Bretaña', price: 5000 }];
    render(
      <MemoryRouter>
        <BowlBuilder />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Arroz' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Sumar extra de Queso Frito' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Sumar bebida Bretaña' }),
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Ir a un paso' }), {
      target: { value: 7 },
    });
    expect(
      screen.getByRole('button', { name: 'Continuar al resumen' }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Continuar sin bebidas' }),
    );
    expect(
      screen.getByRole('heading', { name: 'Resumen de tu bowl' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Total a agregar/)).toHaveTextContent('29.900');
    expect(screen.getByText('Bebidas:').parentElement).toHaveTextContent('0');
    expect(screen.getByText(/Queso Frito x1/)).toBeInTheDocument();
    expect(
      screen.getByText('Arroz', { selector: '.bowl-studio-recipe-row > p' }),
    ).toBeInTheDocument();
  });
});
