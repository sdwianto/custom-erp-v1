import { type PrismaClient, type User, type Role } from '@prisma/client';
import { BaseService } from './BaseService';
import { z } from 'zod';

// Validation schemas
const CreateUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().optional(),
  roleId: z.string().uuid(),
  tenantId: z.string().default('default'),
});

const UpdateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  roleId: z.string().uuid().optional(),
});

export class UserService extends BaseService {
  constructor(prisma: PrismaClient, tenantId: string, userId: string) {
    super(prisma, tenantId, userId);
  }

  /**
   * Create a new user with validation and audit
   */
  async createUser(data: z.infer<typeof CreateUserSchema>): Promise<User> {
    const result = await this.ensureIdempotency(
      `create_user_${data.email}`,
      async () => {
        // Validate input
        const validatedData = CreateUserSchema.parse(data);
        
        // Check if user already exists
        const existingUser = await this.prisma.user.findFirst({
          where: {
            email: validatedData.email,
            tenantId: this.tenantId,
            isDeleted: false,
          },
        });

        if (existingUser) {
          throw new Error('User with this email already exists');
        }

        // Verify role exists
        const role = await this.prisma.role.findUnique({
          where: { id: validatedData.roleId },
        });

        if (!role) {
          throw new Error('Invalid role ID');
        }

        // Create user
        const user = await this.prisma.user.create({
          data: {
            ...validatedData,
            tenantId: this.tenantId,
          },
          include: {
            role: true,
          },
        });

        // Audit log
        await this.auditLog({
          action: 'CREATE',
          entityType: 'User',
          entityId: user.id,
          changes: { new: user },
        });

        // Publish event
        await this.publishEvent('USER_CREATED', 'User', user.id, {
          email: user.email,
          role: user.role.name,
        });

        return user;
      }
    );

    if (result.isDuplicate && result.result) {
      return result.result;
    }
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (!result.result) {
      throw new Error('Failed to create user');
    }
    
    return result.result;
  }

  /**
   * Update user with validation and audit
   */
  async updateUser(
    userId: string,
    data: z.infer<typeof UpdateUserSchema>
  ): Promise<User> {
    const result = await this.ensureIdempotency(
      `update_user_${userId}`,
      async () => {
        // Validate input
        const validatedData = UpdateUserSchema.parse(data);
        
        // Get existing user
        const existingUser = await this.prisma.user.findFirst({
          where: {
            id: userId,
            tenantId: this.tenantId,
            isDeleted: false,
          },
        });

        if (!existingUser) {
          throw new Error('User not found');
        }

        // Check permissions
        if (!(await this.hasPermission('users:update'))) {
          throw new Error('Insufficient permissions');
        }

        // Update user
        const updatedUser = await this.prisma.user.update({
          where: { id: userId },
          data: {
            ...validatedData,
            updatedAt: new Date(),
            version: { increment: 1 },
          },
          include: {
            role: true,
          },
        });

        // Audit log
        await this.auditLog({
          action: 'UPDATE',
          entityType: 'User',
          entityId: userId,
          changes: { old: existingUser, new: updatedUser },
        });

        // Publish event
        await this.publishEvent('USER_UPDATED', 'User', userId, {
          email: updatedUser.email,
          role: updatedUser.role.name,
        });

        return updatedUser;
      }
    );

    if (result.isDuplicate && result.result) {
      return result.result;
    }
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (!result.result) {
      throw new Error('Failed to update user');
    }
    
    return result.result;
  }

  /**
   * Get user by ID with role information
   */
  async getUserById(userId: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: this.tenantId,
        isDeleted: false,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      return null;
    }

    // Check permissions
    if (!(await this.hasPermission('users:read'))) {
      throw new Error('Insufficient permissions');
    }

    return user;
  }

  /**
   * Get users with pagination and filtering
   */
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    roleId?: string;
    isActive?: boolean;
  }): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, search, roleId, isActive } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId: this.tenantId,
      isDeleted: false,
    };

    if (search) {
      Object.assign(where, {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (roleId) {
      Object.assign(where, {
        roleId,
      });
    }

    if (isActive !== undefined) {
      Object.assign(where, {
        isActive,
      });
    }

    // Get users and count
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          role: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Soft delete user
   */
  async deleteUser(userId: string): Promise<void> {
    await this.ensureIdempotency(
      `delete_user_${userId}`,
      async () => {
        // Get existing user
        const existingUser = await this.prisma.user.findFirst({
          where: {
            id: userId,
            tenantId: this.tenantId,
            isDeleted: false,
          },
        });

        if (!existingUser) {
          throw new Error('User not found');
        }

        // Check permissions
        if (!(await this.hasPermission('users:delete'))) {
          throw new Error('Insufficient permissions');
        }

        // Soft delete
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            isDeleted: true,
            updatedAt: new Date(),

            version: { increment: 1 },
          },
        });

        // Audit log
        await this.auditLog({
          action: 'DELETE',
          entityType: 'User',
          entityId: userId,
          changes: { old: existingUser },
        });

        // Publish event
        await this.publishEvent('USER_DELETED', 'User', userId, {
          email: existingUser.email,
        });
      }
    );
  }

  /**
   * Get user roles for dropdown/selection
   */
  async getRoles(): Promise<Role[]> {
    return this.prisma.role.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
