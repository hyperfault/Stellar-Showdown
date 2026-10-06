import { createContext, useContext, type ReactNode } from 'react';
import type { StellarService } from './types';

const Ctx = createContext<StellarService | null>(null);

/** Wrap the app with the real service: <ServiceProvider service={showdownService}>. */
export const ServiceProvider = ({ service, children }: { service: StellarService; children: ReactNode }) =>
  <Ctx.Provider value={service}>{children}</Ctx.Provider>;

export const useService = (): StellarService => {
  const svc = useContext(Ctx);
  if (!svc) throw new Error('useService must be used inside <ServiceProvider>');
  return svc;
};
