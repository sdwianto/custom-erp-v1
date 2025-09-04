import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../events/EventBus';
import { redis } from '../cache/redis';

// Context interface
export interface CreateContextOptions {
  session: Record<string, unknown> | null;
  prisma: PrismaClient;
  tenantId: string;
  userId?: string | null;
}

// Create context
export const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    prisma: opts.prisma,
    tenantId: opts.tenantId,
    userId: opts.userId,
    eventBus,
    redis,
  };
};

// Create context for Next.js
export const createTRPCContext = async (_opts: CreateNextContextOptions) => {
  // TODO: Implement session extraction
  const session = null;
  
  // Create Prisma client
  const prisma = new PrismaClient();
  
  return createInnerTRPCContext({
    session,
    prisma,
    tenantId: 'default',
    userId: null,
  });
};

// Initialize tRPC
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: {
    serialize: (object: unknown) => {
      // Custom serialization if needed
      return object;
    },
    deserialize: (object: unknown) => {
      // Custom deserialization if needed
      return object;
    },
  },
});

// Base router and procedure
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Middleware for authentication
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.userId,
    },
  });
});

// Middleware for tenant validation
const enforceTenantAccess = t.middleware(({ ctx, next }) => {
  if (!ctx.tenantId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant ID is required' });
  }
  return next({
    ctx: {
      ...ctx,
      tenantId: ctx.tenantId,
    },
  });
});

// Middleware for permission checking
const enforcePermission = (permission: string) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    // Check if user has permission through UserRole junction table
    const userRole = await ctx.prisma.userRole.findFirst({
      where: { 
        userId: ctx.userId,
        tenantId: ctx.tenantId,
        isDeleted: false
      },
      include: { 
        role: true
      },
    });

    if (!userRole?.role) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'User has no role assigned' });
    }

    // For now, we'll use a simple permission check based on role name
    // In a real implementation, you'd check against the Permission model
    const roleName = userRole.role.name.toLowerCase();
    const hasPermission = roleName === 'administrator' || 
                         (roleName === 'manager' && permission !== 'admin') ||
                         (roleName === 'operator' && ['read', 'basic'].includes(permission));
    if (!hasPermission) {
      throw new TRPCError({ 
        code: 'FORBIDDEN', 
        message: `Insufficient permissions. Required: ${permission}` 
      });
    }

    return next({
      ctx: {
        ...ctx,
        userRole,
      },
    });
  });

// Protected procedures
export const protectedProcedure = t.procedure
  .use(enforceUserIsAuthed)
  .use(enforceTenantAccess);

export const adminProcedure = t.procedure
  .use(enforceUserIsAuthed)
  .use(enforceTenantAccess)
  .use(enforcePermission('admin'));

export const managerProcedure = t.procedure
  .use(enforceUserIsAuthed)
  .use(enforceTenantAccess)
  .use(enforcePermission('manager'));

// Utility procedures
export const createProcedure = (permission?: string) => {
  if (!permission) {
    return protectedProcedure;
  }
  
  return t.procedure
    .use(enforceUserIsAuthed)
    .use(enforceTenantAccess)
    .use(enforcePermission(permission));
};

// Export types
export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
export type TRPCMeta = {
  rateLimit?: {
    max: number;
    windowMs: number;
  };
  cache?: {
    ttl: number;
    key?: string;
  };
};
