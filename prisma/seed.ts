import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'default-tenant' },
    update: {},
    create: {
      id: 'default-tenant',
      name: 'CA Mine ERP',
      isActive: true
    }
  });

  // Create roles (without description field)
  const adminRole = await prisma.role.upsert({
    where: { id: 'admin-role' },
    update: {},
    create: {
      id: 'admin-role',
      name: 'Administrator',
      tenantId: tenant.id
    }
  });

  const managerRole = await prisma.role.upsert({
    where: { id: 'manager-role' },
    update: {},
    create: {
      id: 'manager-role',
      name: 'Manager',
      tenantId: tenant.id
    }
  });

  const operatorRole = await prisma.role.upsert({
    where: { id: 'operator-role' },
    update: {},
    create: {
      id: 'operator-role',
      name: 'Operator',
      tenantId: tenant.id
    }
  });

  // Create users (without firstName field)
  const adminUser = await prisma.user.upsert({
    where: { id: 'admin-user' },
    update: {},
    create: {
      id: 'admin-user',
      email: 'admin@nextgen.com',
      name: 'System Administrator',
      tenantId: tenant.id
    }
  });

  // Create items (using correct table name 'item' not 'product')
  const excavator = await prisma.item.upsert({
    where: { id: 'excavator-item' },
    update: {},
    create: {
      id: 'excavator-item',
      number: 'EXC-001',
      description: 'Excavator Komatsu PC200',
      type: 'Equipment',
      stdCost: 0,
      lastCost: 0,
      avgCost: 0,
      tenantId: tenant.id
    }
  });

  const bulldozer = await prisma.item.upsert({
    where: { id: 'bulldozer-item' },
    update: {},
    create: {
      id: 'bulldozer-item',
      number: 'BUL-001',
      description: 'Bulldozer Caterpillar D6',
      type: 'Equipment',
      stdCost: 0,
      lastCost: 0,
      avgCost: 0,
      tenantId: tenant.id
    }
  });

  const hydraulicPump = await prisma.item.upsert({
    where: { id: 'pump-item' },
    update: {},
    create: {
      id: 'pump-item',
      number: 'PMP-001',
      description: 'Hydraulic Pump Assembly',
      type: 'Spare Part',
      stdCost: 0,
      lastCost: 0,
      avgCost: 0,
      tenantId: tenant.id
    }
  });

  const safetyHelmet = await prisma.item.upsert({
    where: { id: 'helmet-item' },
    update: {},
    create: {
      id: 'helmet-item',
      number: 'SAF-001',
      description: 'Safety Helmet',
      type: 'Safety Equipment',
      stdCost: 0,
      lastCost: 0,
      avgCost: 0,
      tenantId: tenant.id
    }
  });

  const dieselFuel = await prisma.item.upsert({
    where: { id: 'fuel-item' },
    update: {},
    create: {
      id: 'fuel-item',
      number: 'FUEL-001',
      description: 'Diesel Fuel',
      type: 'Fuel',
      stdCost: 0,
      lastCost: 0,
      avgCost: 0,
      tenantId: tenant.id
    }
  });

  // Create address books (using correct field names from schema)
  const supplier1 = await prisma.addressBook.upsert({
    where: { id: 'supplier-1' },
    update: {},
    create: {
      id: 'supplier-1',
      alphaName: 'PT Komatsu Indonesia',
      isVendor: true,
      isCustomer: false,
      isEmployee: false,
      tenantId: tenant.id
    }
  });

  const supplier2 = await prisma.addressBook.upsert({
    where: { id: 'supplier-2' },
    update: {},
    create: {
      id: 'supplier-2',
      alphaName: 'PT Caterpillar Indonesia',
      isVendor: true,
      isCustomer: false,
      isEmployee: false,
      tenantId: tenant.id
    }
  });

  // Create equipment (using correct field names from schema)
  const excavatorEquipment = await prisma.equipment.upsert({
    where: { id: 'excavator-equipment' },
    update: {},
    create: {
      id: 'excavator-equipment',
      code: 'EXC-001',
      type: 'Excavator',
      acquisitionCost: 0,
      currentValue: 0,
      tenantId: tenant.id
    }
  });

  const bulldozerEquipment = await prisma.equipment.upsert({
    where: { id: 'bulldozer-equipment' },
    update: {},
    create: {
      id: 'bulldozer-equipment',
      code: 'BUL-001',
      type: 'Bulldozer',
      acquisitionCost: 0,
      currentValue: 0,
      tenantId: tenant.id
    }
  });

  // Create chart accounts (using correct field names from schema)
  const cashAccount = await prisma.chartAccount.upsert({
    where: { id: 'cash-account' },
    update: {},
    create: {
      id: 'cash-account',
      company: 'CA-MINE',
      businessUnit: 'MAIN',
      object: '1000',
      subsidiary: 'CA-MINE',
      description: 'Cash',
      currency: 'PGK',
      tenantId: tenant.id
    }
  });

  const accountsReceivable = await prisma.chartAccount.upsert({
    where: { id: 'ar-account' },
    update: {},
    create: {
      id: 'ar-account',
      company: 'CA-MINE',
      businessUnit: 'MAIN',
      object: '1100',
      subsidiary: 'CA-MINE',
      description: 'Accounts Receivable',
      currency: 'PGK',
      tenantId: tenant.id
    }
  });

  const inventoryAccount = await prisma.chartAccount.upsert({
    where: { id: 'inventory-account' },
    update: {},
    create: {
      id: 'inventory-account',
      company: 'CA-MINE',
      businessUnit: 'MAIN',
      object: '1200',
      subsidiary: 'CA-MINE',
      description: 'Inventory',
      currency: 'PGK',
      tenantId: tenant.id
    }
  });

  const equipmentAccount = await prisma.chartAccount.upsert({
    where: { id: 'equipment-account' },
    update: {},
    create: {
      id: 'equipment-account',
      company: 'CA-MINE',
      businessUnit: 'MAIN',
      object: '1300',
      subsidiary: 'CA-MINE',
      description: 'Equipment',
      currency: 'PGK',
      tenantId: tenant.id
    }
  });

  const accountsPayable = await prisma.chartAccount.upsert({
    where: { id: 'ap-account' },
    update: {},
    create: {
      id: 'ap-account',
      company: 'CA-MINE',
      businessUnit: 'MAIN',
      object: '2000',
      subsidiary: 'CA-MINE',
      description: 'Accounts Payable',
      currency: 'PGK',
      tenantId: tenant.id
    }
  });

  const revenueAccount = await prisma.chartAccount.upsert({
    where: { id: 'revenue-account' },
    update: {},
    create: {
      id: 'revenue-account',
      company: 'CA-MINE',
      businessUnit: 'MAIN',
      object: '4000',
      subsidiary: 'CA-MINE',
      description: 'Revenue',
      currency: 'PGK',
      tenantId: tenant.id
    }
  });

  const costOfGoodsSold = await prisma.chartAccount.upsert({
    where: { id: 'cogs-account' },
    update: {},
    create: {
      id: 'cogs-account',
      company: 'CA-MINE',
      businessUnit: 'MAIN',
      object: '4100',
      subsidiary: 'CA-MINE',
      description: 'Cost of Goods Sold',
      currency: 'PGK',
      tenantId: tenant.id
    }
  });

  const operatingExpense = await prisma.chartAccount.upsert({
    where: { id: 'opex-account' },
    update: {},
    create: {
      id: 'opex-account',
      company: 'CA-MINE',
      businessUnit: 'MAIN',
      object: '5000',
      subsidiary: 'CA-MINE',
      description: 'Operating Expenses',
      currency: 'PGK',
      tenantId: tenant.id
    }
  });

  const depreciationAccount = await prisma.chartAccount.upsert({
    where: { id: 'depreciation-account' },
    update: {},
    create: {
      id: 'depreciation-account',
      company: 'CA-MINE',
      businessUnit: 'MAIN',
      object: '5100',
      subsidiary: 'CA-MINE',
      description: 'Depreciation',
      currency: 'PGK',
      tenantId: tenant.id
    }
  });

  // Create address books for customers (using correct field names from schema)
  const customer1 = await prisma.addressBook.upsert({
    where: { id: 'customer-1' },
    update: {},
    create: {
      id: 'customer-1',
      alphaName: 'Mining Corporation Ltd',
      isCustomer: true,
      isVendor: false,
      isEmployee: false,
      tenantId: tenant.id
    }
  });

  const customer2 = await prisma.addressBook.upsert({
    where: { id: 'customer-2' },
    update: {},
    create: {
      id: 'customer-2',
      alphaName: 'Construction Limited',
      isCustomer: true,
      isVendor: false,
      isEmployee: false,
      tenantId: tenant.id
    }
  });

  // Create employees (using correct field names from schema)
  const employee1 = await prisma.employee.upsert({
    where: { id: 'employee-1' },
    update: {},
    create: {
      id: 'employee-1',
      abId: customer1.id, // Reference to AddressBook
      tenantId: tenant.id
    }
  });

  console.log('✅ Database seeding completed successfully!');
  console.log(`Created tenant: ${tenant.name}`);
  console.log(`Created roles: ${adminRole.name}, ${managerRole.name}, ${operatorRole.name}`);
  console.log(`Created users: ${adminUser.email}`);
  console.log(`Created items: ${excavator.number}, ${bulldozer.number}`);
  console.log(`Created equipment: ${excavatorEquipment.code}, ${bulldozerEquipment.code}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  }); 