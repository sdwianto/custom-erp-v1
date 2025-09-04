import { createTRPCRouter, publicProcedure } from './context';

// Root router
export const appRouter = createTRPCRouter({
  // Health check
  health: createTRPCRouter({
    check: publicProcedure.query(() => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    })),
  }),
});

// Export type definition of API
export type AppRouter = typeof appRouter;
