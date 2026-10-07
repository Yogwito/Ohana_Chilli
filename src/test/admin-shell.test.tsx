import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AdminShell, { type AdminSection } from '@/components/admin/AdminShell';

const mounted = vi.fn();
vi.mock('@/components/admin/OrderAlerts', () => ({ default: function MockOrderAlerts({ header, children }) {
  // Track whether switching sections remounts the listener.
  useState(() => mounted());
  return <>{header}<section aria-label="Alertas de pedidos">Alertas activas</section>{children}</>;
} }));
function Panel() {
  const [section, setSection] = useState<AdminSection>('orders');
  return <AdminShell section={section} onSectionChange={setSection} onSignOut={() => {}}><p>Contenido: {section}</p></AdminShell>;
}
describe('AdminShell', () => {
  it('changes sections with visible names and keeps alerts mounted', () => {
    mounted.mockClear();
    render(<MemoryRouter><Panel /></MemoryRouter>);
    const nav = screen.getByRole('navigation', { name: 'Administración' });
    expect(within(nav).getByRole('button', { name: 'Pedidos' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(within(nav).getByRole('button', { name: 'Ingredientes' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ingredientes');
    expect(screen.getByText('Contenido: ingredients')).toBeInTheDocument();
    expect(mounted).toHaveBeenCalledTimes(1);
  });
  it('closes the mobile menu after choosing a section', () => {
    render(<MemoryRouter><Panel /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir navegación' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Promociones' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Contenido: promotions')).toBeInTheDocument();
  });
});
