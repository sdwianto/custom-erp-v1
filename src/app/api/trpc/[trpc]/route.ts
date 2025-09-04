import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/core/trpc/root';
import { createTRPCContext } from '@/core/trpc/context';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req, res: {} as Response, info: {} as unknown } as unknown as CreateNextContextOptions),
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
