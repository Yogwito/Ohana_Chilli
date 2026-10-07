import { useEffect, useRef } from 'react';
interface Turnstile { render: (element: HTMLElement, options: Record<string,unknown>) => string; remove: (id: string) => void; }
declare global { interface Window { turnstile?: Turnstile; } }
let scriptPromise: Promise<void> | undefined;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) scriptPromise = new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true; script.onload = () => resolve(); script.onerror = () => { scriptPromise = undefined; reject(new Error('unavailable')); };
    document.head.append(script);
  });
  return scriptPromise;
}
export default function BotProtection({ onToken, resetKey }: { onToken: (token: string) => void; resetKey: number }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false; let widget: string | undefined;
    onToken('');
    const key = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (key) loadTurnstile().then(() => {
      if (disposed || !element.current) return;
      widget = window.turnstile?.render(element.current,{ sitekey:key,action:'order',callback:onToken,'expired-callback':()=>onToken(''),'error-callback':()=>onToken('') });
    }).catch(() => onToken(''));
    return () => { disposed=true; if (widget) window.turnstile?.remove(widget); };
  },[onToken,resetKey]);
  return <div><div ref={element} />{!import.meta.env.VITE_TURNSTILE_SITE_KEY && <p className="text-sm text-destructive">La verificación de pedidos todavía no está configurada.</p>}</div>;
}
