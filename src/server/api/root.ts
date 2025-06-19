import { createTRPCRouter } from './trpc';
import { promptChainsRouter } from './routers/promptChains';
import { analyticsRouter } from './routers/analytics';
import { organizationRouter } from './routers/organization';
import { systemRouter } from './routers/system';

export const appRouter = createTRPCRouter({
  promptChains: promptChainsRouter,
  analytics: analyticsRouter,
  organization: organizationRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;