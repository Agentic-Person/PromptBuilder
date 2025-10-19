import { createTRPCRouter } from './trpc';
import { promptChainsRouter } from './routers/promptChains';
import { analyticsRouter } from './routers/analytics';
import { organizationRouter } from './routers/organization';
import { systemRouter } from './routers/system';
import { credentialsRouter } from './routers/credentials';

export const appRouter = createTRPCRouter({
  promptChains: promptChainsRouter,
  analytics: analyticsRouter,
  organization: organizationRouter,
  system: systemRouter,
  credentials: credentialsRouter,
});

export type AppRouter = typeof appRouter;