import {afterEach,beforeEach,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import RecentOrders from '@/components/checkout/RecentOrders';
beforeEach(()=>localStorage.clear());afterEach(cleanup);
it('recovers private tracking links locally without phone lookups or unsafe external links',()=>{
 const path=`/pedido/${'a'.repeat(64)}`;
 localStorage.setItem('ohana-tracking-links:v1',JSON.stringify([path,path,`https://attacker.example${path}`,'javascript:alert(1)','/admin']));
 render(<MemoryRouter><RecentOrders /></MemoryRouter>);
 const links=screen.getAllByRole('link');expect(links).toHaveLength(1);expect(links[0]).toHaveAttribute('href',path);
});
it('handles invalid local history without exposing or fetching order data',()=>{
 localStorage.setItem('ohana-tracking-links:v1','broken');const {container}=render(<MemoryRouter><RecentOrders /></MemoryRouter>);expect(container).toBeEmptyDOMElement();
});
