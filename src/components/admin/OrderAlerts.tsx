import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { orderDb } from '@/lib/orderDb';
import { Button } from '@/components/ui/button';
import { OrderAlertContext } from '@/hooks/use-order-alerts';
export default function OrderAlerts({children, header}: {children:ReactNode; header?:ReactNode}) {
  const client=useQueryClient();
  const [realtime,setRealtime]=useState(false);
  const [online,setOnline]=useState(navigator.onLine);
  const [activated,setActivated]=useState(false);
  const [muted,setMuted]=useState(true);
  const [audioError,setAudioError]=useState('');
  const audio=useRef<AudioContext>();
  const query=useQuery({queryKey:['order-attention'],queryFn:async()=>{
    const operational=await orderDb.from('orders').select('id,actionable_at',{count:'exact'})
      .eq('status','pending').is('acknowledged_at',null).not('actionable_at','is',null)
      .order('actionable_at').limit(1);
    const financial=await orderDb.from('orders').select('id,financial_attention_at',{count:'exact'})
      .not('financial_attention_at','is',null).is('financial_acknowledged_at',null).is('financial_resolved_at',null)
      .order('financial_attention_at').limit(1);
    if(operational.error) throw operational.error;
    if(financial.error) throw financial.error;
    const dates=[operational.data?.[0]?.actionable_at,financial.data?.[0]?.financial_attention_at].filter(Boolean).sort();
    return {count:(operational.count||0)+(financial.count||0),financialCount:financial.count||0,oldest:dates[0] as string|undefined};
  },refetchInterval:15000,refetchIntervalInBackground:true,staleTime:0,retry:1});
  const refresh=useCallback(()=>{client.invalidateQueries({queryKey:['order-attention']});client.invalidateQueries({queryKey:['staff-orders']});client.invalidateQueries({queryKey:['order-detail']});},[client]);
  useEffect(()=>{
    const channel=supabase.channel('admin-order-listener')
      .on('postgres_changes',{event:'*',schema:'public',table:'orders'},refresh)
      .subscribe(status=>{setRealtime(status==='SUBSCRIBED');if(status==='SUBSCRIBED')refresh();});
    const reconnect=()=>{setOnline(navigator.onLine);refresh();};
    window.addEventListener('online',reconnect);window.addEventListener('offline',reconnect);
    return()=>{supabase.removeChannel(channel);window.removeEventListener('online',reconnect);window.removeEventListener('offline',reconnect);};
  },[refresh]);
  useEffect(()=>()=>{audio.current?.close();},[]);
  const sound=useCallback(async()=>{
    if(!audio.current) audio.current=new AudioContext();
    await audio.current.resume();
    if(audio.current.state!=='running')throw new Error('sound_blocked');
    const oscillator=audio.current.createOscillator();const gain=audio.current.createGain();
    oscillator.connect(gain);gain.connect(audio.current.destination);oscillator.frequency.value=880;
    gain.gain.setValueAtTime(0.12,audio.current.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,audio.current.currentTime+0.6);
    oscillator.start();oscillator.stop(audio.current.currentTime+0.6);
  },[]);
  const count=query.data?.count||0;
  const connected=online && !query.isError && !!query.data;
  useEffect(()=>{
    if(!activated||muted||!count||!connected)return;
    const ring=async()=>{
      if(!navigator.locks){setAudioError('Este navegador no permite coordinar alertas entre pestañas. Usa un navegador actualizado.');return;}
      try {
        await navigator.locks.request('ohana-order-sound',{ifAvailable:true},async lock=>{
          if(!lock)return;
          const last=Number(localStorage.getItem('ohana-order-sound-last')||0);
          if(Date.now()-last<14500)return;
          await sound();localStorage.setItem('ohana-order-sound-last',String(Date.now()));
        });
      }catch{setAudioError('El navegador bloqueó el sonido. Activa las alertas nuevamente.');setActivated(false);}
    };
    ring();const timer=window.setInterval(ring,15000);return()=>window.clearInterval(timer);
  },[activated,muted,count,connected,sound]);
  const activate=async()=>{try{await sound();setActivated(true);setMuted(false);setAudioError('');}catch{setAudioError('No pudimos activar el sonido. Revisa el permiso del navegador.');}};
  return <OrderAlertContext.Provider value={{count,connected,refresh}}>
    {header}
    <section className={`admin-alerts border-b px-4 py-3 ${muted||!connected?'bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100':'bg-background'}`} aria-label="Alertas de pedidos">
      <div className="container flex flex-wrap items-center gap-3">
        <strong role="status">{count} pedido{count===1?'':'s'} por reconocer</strong>
        {!!query.data?.financialCount&&<strong className="text-sm">{query.data.financialCount} incidencia{query.data.financialCount===1?'':'s'} financiera{query.data.financialCount===1?'':'s'} por reconocer</strong>}
        <span className="text-sm">{!connected?'Sin conexión: no podemos verificar pedidos':realtime?'En vivo · respaldo cada 15 s':'Tiempo real desconectado · consulta cada 15 s'}</span>
        {(!activated||muted)&&<strong className="text-sm">Sonido silenciado</strong>}
        <Button size="sm" onClick={activate}>Activar alertas</Button>
        <Button size="sm" variant="outline" onClick={()=>sound().catch(()=>setAudioError('El sonido está bloqueado.'))}>Probar sonido</Button>
        <Button size="sm" variant="outline" disabled={!activated} onClick={()=>setMuted(value=>!value)}>{muted?'Activar sonido':'Silenciar'}</Button>
        <p className="w-full text-xs">Mantén esta pantalla abierta y el dispositivo despierto. Reconocer detiene la alerta; aceptar autoriza la preparación.</p>
        {query.data?.oldest && Date.now()-new Date(query.data.oldest).getTime()>120000 && <p className="w-full font-bold" role="alert">Hay pedidos sin reconocer desde hace más de 2 minutos.</p>}
        {audioError&&<p role="alert">{audioError}</p>}
      </div>
    </section>
    {children}
  </OrderAlertContext.Provider>;
}
