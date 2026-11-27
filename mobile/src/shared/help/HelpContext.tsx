import { createContext, useContext } from 'react';
import type { ReportContext } from '../errors/errorReport';

/**
 * Opens "Trợ giúp & báo lỗi" from anywhere. Pass a context after a failure; leave it out for general help, which then
 * reports as feedback from the current screen. Without a provider (isolated tests) there is no help entry.
 */
export type HelpApi = { open: (context?: ReportContext) => void };

export const HelpContext = createContext<HelpApi | null>(null);
export const useHelp = () => useContext(HelpContext);
