import { useState } from 'react';
import { Link } from 'react-router-dom';
export default function RecentOrders() {
  const [links] = useState<string[]>(()=>{
    try {
      const saved:unknown=JSON.parse(localStorage.getItem('ohana-tracking-links:v1')||'[]');
      if(!Array.isArray(saved))return[];
      return Array.from(new Set(saved.flatMap(value=>{
        if(typeof value!=='string')return[];
        try {const url=new URL(value,window.location.origin);return url.origin===window.location.origin && /^\/pedido\/[a-f0-9]{64}$/.test(url.pathname)?[url.pathname]:[];}catch{return[];}
      }))).slice(0,10);
    }catch{return[];}
  });
  if(!links.length)return null;
  return <section className="rounded-xl border bg-card p-4 space-y-2 text-left"><h3 className="font-semibold">Tus enlaces de seguimiento</h3><p className="text-xs text-muted-foreground">Guardados en este dispositivo. Vencen a los 30 días.</p>{links.map((link,index)=><Link className="block text-sm underline underline-offset-4" key={link} to={link}>Consultar pedido guardado {index+1}</Link>)}</section>;
}
