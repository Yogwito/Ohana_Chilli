import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DeferredSection from '@/components/ui/DeferredSection';

describe('DeferredSection', () => {
  let intersectionCallback: IntersectionObserverCallback;

  beforeEach(() => {
    class IntersectionObserverMock {
      constructor(callback: IntersectionObserverCallback) {
        intersectionCallback = callback;
      }

      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = '300px 0px';
      thresholds = [0];
    }

    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
  });

  it('keeps a stable fallback until the section approaches the viewport', () => {
    render(
      <DeferredSection fallback={<div data-testid="reserved-space">Cargando</div>}>
        <div>Contenido pesado</div>
      </DeferredSection>,
    );

    expect(screen.getByTestId('reserved-space')).toBeInTheDocument();
    expect(screen.queryByText('Contenido pesado')).not.toBeInTheDocument();

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(screen.getByText('Contenido pesado')).toBeInTheDocument();
  });
});
