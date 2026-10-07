import { createContext,useContext } from 'react';
interface AlertState { count:number; connected:boolean; refresh:()=>void; }
export const OrderAlertContext=createContext<AlertState>({count:0,connected:false,refresh:()=>{}});
export const useOrderAlerts=()=>useContext(OrderAlertContext);
