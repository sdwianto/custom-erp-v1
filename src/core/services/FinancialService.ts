import { type PrismaClient, type ChartAccount, AccountType, type GLEntry } from '@prisma/client';
import { BaseService } from './BaseService';
import { z } from 'zod';

// Validation schemas
const CreateChartAccountSchema = z.object({
  accountNumber: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  type: z.nativeEnum(AccountType),
  parentAccountId: z.string().uuid().optional(),
  company: z.string().default('default'),
  businessUnit: z.string().default('default'),
  object: z.string().default('default'),
  subsidiary: z.string().default('default'),
  project: z.string().optional(),
  currency: z.string().default('IDR'),
});

const UpdateChartAccountSchema = CreateChartAccountSchema.partial();

const GLEntrySchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number(),
  currency: z.string().default('IDR'),
  exchangeRate: z.number().positive().default(1),
  batchNo: z.string(),
  batchType: z.string(),
  journalEntry: z.string().optional(),
  description: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
});

const JournalEntrySchema = z.object({
  entries: z.array(z.object({
    accountId: z.string().uuid(),
    amount: z.number(),
    description: z.string().optional(),
  })),
  batchNo: z.string(),
  batchType: z.string(),
  journalEntry: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  currency: z.string().default('IDR'),
  exchangeRate: z.number().positive().default(1),
});

export class FinancialService extends BaseService {
  constructor(prisma: PrismaClient, tenantId: string, userId: string) {
    super(prisma, tenantId, userId);
  }

  /**
   * Create a new Chart of Account
   */
  async createChartAccount(data: z.infer<typeof CreateChartAccountSchema>): Promise<ChartAccount> {
    const result = await this.ensureIdempotency(
      `create_account_${data.accountNumber}`,
      async () => {
        // Validate input
        const validatedData = CreateChartAccountSchema.parse(data);
        
        // Check if account number already exists
        const existingAccount = await this.prisma.chartAccount.findFirst({
          where: {
            accountNumber: validatedData.accountNumber,
            tenantId: this.tenantId,
          },
        });

        if (existingAccount) {
          throw new Error('Account with this number already exists');
        }

        // Validate parent account if provided
        if (validatedData.parentAccountId) {
          const parentAccount = await this.prisma.chartAccount.findFirst({
            where: {
              id: validatedData.parentAccountId,
              tenantId: this.tenantId,
            },
          });

          if (!parentAccount) {
            throw new Error('Parent account not found');
          }

          // Validate account type hierarchy
          if (parentAccount.type !== validatedData.type) {
            throw new Error('Account type must match parent account type');
          }
        }

        // Create account
        const account = await this.prisma.chartAccount.create({
          data: {
            ...validatedData,
            tenantId: this.tenantId,
            balance: 0,
            isActive: true,
          },
        });

        // Audit log
        await this.auditLog({
          action: 'CREATE',
          entityType: 'ChartAccount',
          entityId: account.id,
          changes: { new: account },
        });

        // Publish event
        await this.publishEvent('CHART_ACCOUNT_CREATED', 'ChartAccount', account.id, {
          accountNumber: account.accountNumber,
          name: account.name,
          type: account.type,
        });

        return account;
      }
    );

    if (result.isDuplicate && result.result) {
      return result.result;
    }
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (!result.result) {
      throw new Error('Failed to create chart account');
    }
    
    return result.result;
  }

  /**
   * Update Chart of Account
   */
  async updateChartAccount(
    accountId: string,
    data: z.infer<typeof UpdateChartAccountSchema>
  ): Promise<ChartAccount> {
    const result = await this.ensureIdempotency(
      `update_account_${accountId}`,
      async () => {
        // Validate input
        const validatedData = UpdateChartAccountSchema.parse(data);
        
        // Get existing account
        const existingAccount = await this.prisma.chartAccount.findFirst({
          where: {
            id: accountId,
            tenantId: this.tenantId,
          },
        });

        if (!existingAccount) {
          throw new Error('Account not found');
        }

        // Check permissions
        if (!(await this.hasPermission('finance:update'))) {
          throw new Error('Insufficient permissions');
        }

        // Check if account has GL entries
        const glEntryCount = await this.prisma.gLEntry.count({
          where: { accountId },
        });

        if (glEntryCount > 0) {
          throw new Error('Cannot update account with existing GL entries');
        }

        // Update account
        const updatedAccount = await this.prisma.chartAccount.update({
          where: { id: accountId },
          data: {
            ...validatedData,
            updatedAt: new Date(),
            version: { increment: 1 },
          },
        });

        // Audit log
        await this.auditLog({
          action: 'UPDATE',
          entityType: 'ChartAccount',
          entityId: accountId,
          changes: { old: existingAccount, new: updatedAccount },
        });

        // Publish event
        await this.publishEvent('CHART_ACCOUNT_UPDATED', 'ChartAccount', accountId, {
          accountNumber: updatedAccount.accountNumber,
          name: updatedAccount.name,
        });

        return updatedAccount;
      }
    );

    if (result.isDuplicate && result.result) {
      return result.result;
    }
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (!result.result) {
      throw new Error('Failed to update chart account');
    }
    
    return result.result;
  }

  /**
   * Create a single GL Entry
   */
  async createGLEntry(data: z.infer<typeof GLEntrySchema>): Promise<GLEntry> {
    const result = await this.ensureIdempotency(
      `gl_entry_${data.accountId}_${Date.now()}`,
      async () => {
        // Validate input
        const validatedData = GLEntrySchema.parse(data);
        
        // Get account
        const account = await this.prisma.chartAccount.findFirst({
          where: {
            id: validatedData.accountId,
            tenantId: this.tenantId,
            isActive: true,
          },
        });

        if (!account) {
          throw new Error('Account not found or inactive');
        }

        // Check permissions
        if (!(await this.hasPermission('finance:gl_entry'))) {
          throw new Error('Insufficient permissions');
        }

        // Create GL entry
        const glEntry = await this.prisma.gLEntry.create({
          data: {
            ...validatedData,
            tenantId: this.tenantId,
            userId: this.userId,
          },
        });

        // Update account balance
        await this.prisma.chartAccount.update({
          where: { id: validatedData.accountId },
          data: {
            balance: {
              increment: validatedData.amount,
            },
            updatedAt: new Date(),
            version: { increment: 1 },
          },
        });

        // Audit log
        await this.auditLog({
          action: 'GL_ENTRY_CREATED',
          entityType: 'GLEntry',
          entityId: glEntry.id,
          changes: { new: {
            ...glEntry,
            accountNumber: account.accountNumber,
            accountName: account.name,
          }},
        });

        // Publish event
        await this.publishEvent('GL_ENTRY_CREATED', 'GLEntry', glEntry.id, {
          accountNumber: account.accountNumber,
          amount: glEntry.amount,
          batchNo: glEntry.batchNo,
        });

        return glEntry;
      }
    );

    if (result.isDuplicate && result.result) {
      return result.result;
    }
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (!result.result) {
      throw new Error('Failed to create GL entry');
    }
    
    return result.result;
  }

  /**
   * Create a balanced Journal Entry (debits = credits)
   */
  async createJournalEntry(data: z.infer<typeof JournalEntrySchema>): Promise<GLEntry[]> {
    const result = await this.ensureIdempotency(
      `journal_entry_${data.batchNo}`,
      async () => {
        // Validate input
        const validatedData = JournalEntrySchema.parse(data);
        
        // Check permissions
        if (!(await this.hasPermission('finance:journal_entry'))) {
          throw new Error('Insufficient permissions');
        }

        // Validate balanced entries
        const totalDebits = validatedData.entries
          .filter(entry => entry.amount > 0)
          .reduce((sum, entry) => sum + entry.amount, 0);
        
        const totalCredits = validatedData.entries
          .filter(entry => entry.amount < 0)
          .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

        if (Math.abs(totalDebits - totalCredits) > 0.01) {
          throw new Error('Journal entry must be balanced (debits = credits)');
        }

        // Validate all accounts exist and are active
        const accountIds = validatedData.entries.map(entry => entry.accountId);
        const accounts = await this.prisma.chartAccount.findMany({
          where: {
            id: { in: accountIds },
            tenantId: this.tenantId,
            isActive: true,
          },
        });

        if (accounts.length !== accountIds.length) {
          throw new Error('One or more accounts not found or inactive');
        }

        // Create GL entries
        const glEntries: GLEntry[] = [];
        
        for (const entry of validatedData.entries) {
          const glEntry = await this.prisma.gLEntry.create({
            data: {
              accountId: entry.accountId,
              amount: entry.amount,
              currency: validatedData.currency,
              exchangeRate: validatedData.exchangeRate,
              batchNo: validatedData.batchNo,
              batchType: validatedData.batchType,
              journalEntry: validatedData.journalEntry,
              description: entry.description,
              referenceType: validatedData.referenceType,
              referenceId: validatedData.referenceId,
              tenantId: this.tenantId,
              userId: this.userId,
            },
          });

          // Update account balance
          await this.prisma.chartAccount.update({
            where: { id: entry.accountId },
            data: {
              balance: {
                increment: entry.amount,
              },
              updatedAt: new Date(),
              version: { increment: 1 },
            },
          });

          glEntries.push(glEntry);
        }

        // Audit log
        await this.auditLog({
          action: 'JOURNAL_ENTRY_CREATED',
          entityType: 'GLEntry',
          entityId: glEntries[0]?.id ?? 'unknown',
          changes: { new: {
            batchNo: validatedData.batchNo,
            batchType: validatedData.batchType,
            entryCount: glEntries.length,
            totalAmount: totalDebits,
          }},
        });

        // Publish event
        await this.publishEvent('JOURNAL_ENTRY_CREATED', 'GLEntry', glEntries[0]?.id ?? 'unknown', {
          batchNo: validatedData.batchNo,
          batchType: validatedData.batchType,
          entryCount: glEntries.length,
          totalAmount: totalDebits,
        });

        return glEntries;
      }
    );

    if (result.isDuplicate && result.result) {
      return result.result;
    }
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (!result.result) {
      throw new Error('Failed to create journal entry');
    }
    
    return result.result;
  }

  /**
   * Get Chart of Account by ID
   */
  async getChartAccountById(accountId: string): Promise<ChartAccount | null> {
    const account = await this.prisma.chartAccount.findFirst({
      where: {
        id: accountId,
        tenantId: this.tenantId,
      },
      include: {
        parentAccount: true,
        childAccounts: true,
      },
    });

    if (!account) {
      return null;
    }

    // Check permissions
    if (!(await this.hasPermission('finance:read'))) {
      throw new Error('Insufficient permissions');
    }

    return account;
  }

  /**
   * Get Chart of Accounts with hierarchy and filtering
   */
  async getChartAccounts(params: {
    page?: number;
    limit?: number;
    search?: string;
    type?: AccountType;
    company?: string;
    businessUnit?: string;
    object?: string;
    subsidiary?: string;
    isActive?: boolean;
  }): Promise<{
    accounts: ChartAccount[];
    total: number;
    page: number;
    totalPages: number;
    typeSummary: Record<AccountType, number>;
  }> {
    const { page = 1, limit = 20, search, type, company, businessUnit, object, subsidiary, isActive } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId: this.tenantId,
    };

    if (search) {
      where.OR = [
        { accountNumber: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (company) {
      where.company = company;
    }

    if (businessUnit) {
      where.businessUnit = businessUnit;
    }

    if (object) {
      where.object = object;
    }

    if (subsidiary) {
      where.subsidiary = subsidiary;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Get accounts and count
    const [accounts, total] = await Promise.all([
      this.prisma.chartAccount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { accountNumber: 'asc' },
        include: {
          parentAccount: {
            select: {
              id: true,
              accountNumber: true,
              name: true,
            },
          },
          childAccounts: {
            select: {
              id: true,
              accountNumber: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.chartAccount.count({ where }),
    ]);

    // Get type summary
    const typeSummary = await this.prisma.chartAccount.groupBy({
      by: ['type'],
      where: {
        tenantId: this.tenantId,
        isActive: true,
      },
      _count: {
        type: true,
      },
    });

    const typeCounts: Record<AccountType, number> = {
      ASSET: 0,
      LIABILITY: 0,
      EQUITY: 0,
      REVENUE: 0,
      EXPENSE: 0,
    };

    typeSummary.forEach((item) => {
      typeCounts[item.type] = item._count.type;
    });

    return {
      accounts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      typeSummary: typeCounts,
    };
  }

  /**
   * Get GL Entries for an account
   */
  async getGLEntries(
    accountId: string,
    params: {
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      batchNo?: string;
    }
  ): Promise<{
    entries: GLEntry[];
    total: number;
    page: number;
    totalPages: number;
    totalAmount: number;
  }> {
    const { page = 1, limit = 20, startDate, endDate, batchNo } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      accountId,
      tenantId: this.tenantId,
    };

    if (startDate || endDate) {
      const createdAtFilter: Record<string, Date> = {};
      if (startDate) createdAtFilter.gte = startDate;
      if (endDate) createdAtFilter.lte = endDate;
      where.createdAt = createdAtFilter;
    }

    if (batchNo) {
      where.batchNo = batchNo;
    }

    // Get entries and count
    const [entries, total, totalAmount] = await Promise.all([
      this.prisma.gLEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          account: {
            select: {
              accountNumber: true,
              name: true,
              type: true,
            },
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.gLEntry.count({ where }),
      this.prisma.gLEntry.aggregate({
        where,
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      totalAmount: totalAmount._sum.amount ?? 0,
    };
  }

  /**
   * Get Trial Balance
   */
  async getTrialBalance(params: {
    company?: string;
    businessUnit?: string;
    subsidiary?: string;
  }): Promise<{
    accounts: Array<{
      accountNumber: string;
      name: string;
      type: AccountType;
      balance: number;
      debitBalance: number;
      creditBalance: number;
    }>;
    totalDebits: number;
    totalCredits: number;
    difference: number;
  }> {
    const { company, businessUnit, subsidiary } = params;

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId: this.tenantId,
      isActive: true,
    };

    if (company) where.company = company;
    if (businessUnit) where.businessUnit = businessUnit;
    if (subsidiary) where.subsidiary = subsidiary;

    // Get all active accounts
    const accounts = await this.prisma.chartAccount.findMany({
      where,
      orderBy: { accountNumber: 'asc' },
    });

    // Calculate balances
    const trialBalance = accounts.map(account => {
      const debitBalance = account.type === 'ASSET' || account.type === 'EXPENSE' ? account.balance : 0;
      const creditBalance = account.type === 'LIABILITY' || account.type === 'EQUITY' || account.type === 'REVENUE' ? account.balance : 0;

      return {
        accountNumber: account.accountNumber,
        name: account.name,
        type: account.type,
        balance: account.balance,
        debitBalance,
        creditBalance,
      };
    });

    const totalDebits = trialBalance.reduce((sum, account) => sum + account.debitBalance, 0);
    const totalCredits = trialBalance.reduce((sum, account) => sum + account.creditBalance, 0);
    const difference = totalDebits - totalCredits;

    return {
      accounts: trialBalance,
      totalDebits,
      totalCredits,
      difference,
    };
  }

  /**
   * Note: Chart of Account deletion not supported by current schema
   * This method is disabled until schema supports soft delete
   */
  async deleteChartAccount(_accountId: string): Promise<void> {
    throw new Error('Chart account deletion not supported by current schema');
  }
}
