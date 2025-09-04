import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ERP database seeding...');

  // ========================================
  // CORE SYSTEM SEEDING
  // ========================================

  // Create Roles
  console.log('Creating roles...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'Administrator' },
    update: {},
    create: {
      name: 'Administrator',
      description: 'Full system access',
      permissions: [
        'user:read', 'user:write', 'user:delete',
        'role:read', 'role:write', 'role:delete',
        'product:read', 'product:write', 'product:delete',
        'inventory:read', 'inventory:write', 'inventory:delete',
        'equipment:read', 'equipment:write', 'equipment:delete',
        'finance:read', 'finance:write', 'finance:delete',
        'hr:read', 'hr:write', 'hr:delete',
        'crm:read', 'crm:write', 'crm:delete',
        'report:read', 'report:write',
        'audit:read'
      ]
    }
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: {
      name: 'Manager',
      description: 'Department manager access',
      permissions: [
        'user:read',
        'product:read', 'product:write',
        'inventory:read', 'inventory:write',
        'equipment:read', 'equipment:write',
        'finance:read', 'finance:write',
        'hr:read', 'hr:write',
        'crm:read', 'crm:write',
        'report:read'
      ]
    }
  });

  const operatorRole = await prisma.role.upsert({
    where: { name: 'Operator' },
    update: {},
    create: {
      name: 'Operator',
      description: 'Basic operational access',
      permissions: [
        'product:read',
        'inventory:read', 'inventory:write',
        'equipment:read'
      ]
    }
  });

  // Create Admin User
  console.log('Creating admin user...');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@nextgen.com' },
    update: {},
    create: {
      email: 'admin@nextgen.com',
      firstName: 'System',
      lastName: 'Administrator',
      phone: '+67512345678',
      roleId: adminRole.id
    }
  });

  // ========================================
  // INVENTORY & PROCUREMENT SEEDING
  // ========================================

  // Create Products
  console.log('Creating products...');
  const excavator = await prisma.product.upsert({
    where: { sku: 'EXC-001' },
    update: {},
    create: {
      name: 'Excavator Komatsu PC200',
      code: 'EXC-001',
      sku: 'EXC-001',
      description: '20-ton hydraulic excavator for construction and mining',
      price: 500000000, // 500 million IDR
      costPrice: 450000000,
      minStockLevel: 1,
      maxStockLevel: 5,
      currentStock: 2,
      unitOfMeasure: 'UNIT'
    }
  });

  const bulldozer = await prisma.product.upsert({
    where: { sku: 'BULL-001' },
    update: {},
    create: {
      name: 'Bulldozer Caterpillar D6',
      code: 'BULL-001',
      sku: 'BULL-001',
      description: 'Track-type tractor for earthmoving operations',
      price: 750000000, // 750 million IDR
      costPrice: 675000000,
      minStockLevel: 1,
      maxStockLevel: 3,
      currentStock: 1,
      unitOfMeasure: 'UNIT'
    }
  });

  const hydraulicPump = await prisma.product.upsert({
    where: { sku: 'HP-001' },
    update: {},
    create: {
      name: 'Hydraulic Pump Assembly',
      code: 'HP-001',
      sku: 'HP-001',
      description: 'Replacement hydraulic pump for excavators',
      price: 15000000, // 15 million IDR
      costPrice: 12000000,
      minStockLevel: 5,
      maxStockLevel: 20,
      currentStock: 12,
      unitOfMeasure: 'PCS'
    }
  });

  const safetyHelmet = await prisma.product.upsert({
    where: { sku: 'SH-001' },
    update: {},
    create: {
      name: 'Safety Helmet',
      code: 'SH-001',
      sku: 'SH-001',
      description: 'Industrial safety helmet with chin strap',
      price: 150000, // 150k IDR
      costPrice: 100000,
      minStockLevel: 50,
      maxStockLevel: 200,
      currentStock: 150,
      unitOfMeasure: 'PCS'
    }
  });

  const dieselFuel = await prisma.product.upsert({
    where: { sku: 'FUEL-001' },
    update: {},
    create: {
      name: 'Diesel Fuel',
      code: 'FUEL-001',
      sku: 'FUEL-001',
      description: 'High-quality diesel fuel for heavy equipment',
      price: 15000, // 15k IDR per liter
      costPrice: 12000,
      minStockLevel: 1000,
      maxStockLevel: 5000,
      currentStock: 3000,
      unitOfMeasure: 'LITER'
    }
  });

  // Create AddressBook entries first
  console.log('Creating address book entries...');
  const komatsuAddress = await prisma.addressBook.create({
    data: {
      alphaName: 'Komatsu Indonesia',
      isVendor: true,
      addressLine1: 'Jl. Raya Bekasi Km. 25',
      city: 'Bekasi',
      state: 'Jawa Barat',
      postalCode: '17530',
      country: 'Indonesia',
      phone: '+62-21-8990-1234',
      email: 'info@komatsu.co.id',
      taxNumber: '01.234.567.8-123.000'
    }
  });

  const caterpillarAddress = await prisma.addressBook.create({
    data: {
      alphaName: 'Caterpillar Indonesia',
      isVendor: true,
      addressLine1: 'Jl. Sudirman Kav. 52-53',
      city: 'Jakarta',
      state: 'DKI Jakarta',
      postalCode: '12190',
      country: 'Indonesia',
      phone: '+62-21-515-1234',
      email: 'info@cat.com',
      taxNumber: '01.234.567.8-456.000'
    }
  });

  const miningCorpAddress = await prisma.addressBook.create({
    data: {
      alphaName: 'Mining Corporation Ltd',
      isCustomer: true,
      addressLine1: 'Jl. Gatot Subroto Kav. 18',
      city: 'Jakarta',
      state: 'DKI Jakarta',
      postalCode: '12950',
      country: 'Indonesia',
      phone: '+62-21-520-1234',
      email: 'info@miningcorp.co.id',
      taxNumber: '01.234.567.8-789.000'
    }
  });

  const constructionLtdAddress = await prisma.addressBook.create({
    data: {
      alphaName: 'Construction Ltd',
      isCustomer: true,
      addressLine1: 'Jl. Thamrin No. 10',
      city: 'Jakarta',
      state: 'DKI Jakarta',
      postalCode: '10350',
      country: 'Indonesia',
      phone: '+62-21-310-1234',
      email: 'info@construction.co.id',
      taxNumber: '01.234.567.8-012.000'
    }
  });

  const hrManagerAddress = await prisma.addressBook.create({
    data: {
      alphaName: 'Jane Doe',
      isEmployee: true,
      addressLine1: 'Jl. Sudirman No. 123',
      city: 'Jakarta',
      state: 'DKI Jakarta',
      postalCode: '12190',
      country: 'Indonesia',
      phone: '+62-21-515-5678',
      email: 'jane.doe@nextgen.com'
    }
  });

  // Create Suppliers
  console.log('Creating suppliers...');
  const komatsuSupplier = await prisma.supplier.upsert({
    where: { supplierCode: 'KOMATSU' },
    update: {},
    create: {
      supplierCode: 'KOMATSU',
      addressBookId: komatsuAddress.id,
      paymentTerms: 'Net 30',
      creditLimit: 1000000000,
      currentBalance: 0,
      onTimeDeliveryRate: 0.95,
      qualityRating: 4.8
    }
  });

  const caterpillarSupplier = await prisma.supplier.upsert({
    where: { supplierCode: 'CAT' },
    update: {},
    create: {
      supplierCode: 'CAT',
      addressBookId: caterpillarAddress.id,
      paymentTerms: 'Net 45',
      creditLimit: 2000000000,
      currentBalance: 0,
      onTimeDeliveryRate: 0.98,
      qualityRating: 4.9
    }
  });

  // ========================================
  // EQUIPMENT & MAINTENANCE SEEDING
  // ========================================

  // Create Equipment
  console.log('Creating equipment...');
  const excavatorEquipment = await prisma.equipment.upsert({
    where: { code: 'EQ-EXC-001' },
    update: {},
    create: {
      name: 'Excavator Komatsu PC200',
      code: 'EQ-EXC-001',
      model: 'PC200-8',
      serialNumber: 'KOM2024001',
      manufacturer: 'Komatsu',
      acquisitionCost: 450000000,
      currentValue: 450000000,
      status: 'AVAILABLE',
      location: 'Main Yard',
      lastMaintenanceDate: new Date('2024-01-15'),
      nextMaintenanceDate: new Date('2024-04-15'),
      totalOperatingHours: 0
    }
  });

  const bulldozerEquipment = await prisma.equipment.upsert({
    where: { code: 'EQ-BULL-001' },
    update: {},
    create: {
      name: 'Bulldozer Caterpillar D6',
      code: 'EQ-BULL-001',
      model: 'D6T',
      serialNumber: 'CAT2024001',
      manufacturer: 'Caterpillar',
      acquisitionCost: 675000000,
      currentValue: 675000000,
      status: 'AVAILABLE',
      location: 'Main Yard',
      lastMaintenanceDate: new Date('2024-02-01'),
      nextMaintenanceDate: new Date('2024-05-01'),
      totalOperatingHours: 0
    }
  });

  // ========================================
  // FINANCE & ACCOUNTING SEEDING
  // ========================================

  // Create Chart of Accounts
  console.log('Creating chart of accounts...');
  const cashAccount = await prisma.chartAccount.upsert({
    where: { accountNumber: '1000' },
    update: {},
    create: {
      accountNumber: '1000',
      name: 'Cash',
      type: 'ASSET',
      balance: 1000000000 // 1 billion IDR
    }
  });

  const accountsReceivable = await prisma.chartAccount.upsert({
    where: { accountNumber: '1100' },
    update: {},
    create: {
      accountNumber: '1100',
      name: 'Accounts Receivable',
      type: 'ASSET',
      balance: 0
    }
  });

  const inventoryAccount = await prisma.chartAccount.upsert({
    where: { accountNumber: '1200' },
    update: {},
    create: {
      accountNumber: '1200',
      name: 'Inventory',
      type: 'ASSET',
      balance: 0
    }
  });

  const equipmentAccount = await prisma.chartAccount.upsert({
    where: { accountNumber: '1300' },
    update: {},
    create: {
      accountNumber: '1300',
      name: 'Equipment',
      type: 'ASSET',
      balance: 1125000000 // 1.125 billion IDR
    }
  });

  const accountsPayable = await prisma.chartAccount.upsert({
    where: { accountNumber: '2000' },
    update: {},
    create: {
      accountNumber: '2000',
      name: 'Accounts Payable',
      type: 'LIABILITY',
      balance: 0
    }
  });

  const revenueAccount = await prisma.chartAccount.upsert({
    where: { accountNumber: '4000' },
    update: {},
    create: {
      accountNumber: '4000',
      name: 'Sales Revenue',
      type: 'REVENUE',
      balance: 0
    }
  });

  const rentalRevenueAccount = await prisma.chartAccount.upsert({
    where: { accountNumber: '4100' },
    update: {},
    create: {
      accountNumber: '4100',
      name: 'Rental Revenue',
      type: 'REVENUE',
      balance: 0
    }
  });

  const costOfGoodsSold = await prisma.chartAccount.upsert({
    where: { accountNumber: '5000' },
    update: {},
    create: {
      accountNumber: '5000',
      name: 'Cost of Goods Sold',
      type: 'EXPENSE',
      balance: 0
    }
  });

  const maintenanceExpense = await prisma.chartAccount.upsert({
    where: { accountNumber: '5100' },
    update: {},
    create: {
      accountNumber: '5100',
      name: 'Maintenance Expense',
      type: 'EXPENSE',
      balance: 0
    }
  });

  // ========================================
  // CRM SEEDING
  // ========================================

  // Create Customers
  console.log('Creating customers...');
  const miningCorp = await prisma.customer.upsert({
    where: { customerNumber: 'CUST-001' },
    update: {},
    create: {
      customerNumber: 'CUST-001',
      addressBookId: miningCorpAddress.id,
      customerType: 'COMPANY',
      industry: 'Mining',
      creditLimit: 1000000000, // 1 billion IDR
      currentBalance: 0,
      status: 'ACTIVE'
    }
  });

  const constructionLtd = await prisma.customer.upsert({
    where: { customerNumber: 'CUST-002' },
    update: {},
    create: {
      customerNumber: 'CUST-002',
      addressBookId: constructionLtdAddress.id,
      customerType: 'COMPANY',
      industry: 'Construction',
      creditLimit: 500000000, // 500 million IDR
      currentBalance: 0,
      status: 'ACTIVE'
    }
  });

  // ========================================
  // HRMS SEEDING
  // ========================================

  // Create Employees
  console.log('Creating employees...');
  const hrManager = await prisma.employee.upsert({
    where: { employeeNumber: 'EMP-001' },
    update: {},
    create: {
      employeeNumber: 'EMP-001',
      addressBookId: hrManagerAddress.id,
      userId: adminUser.id,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@nextgen.com',
      phone: '+67512345678',
      position: 'HR Manager',
      hireDate: new Date('2024-01-01'),
      employmentStatus: 'ACTIVE',
      baseSalary: 25000000, // 25 million IDR per month
      allowances: 5000000 // 5 million IDR per month
    }
  });

  console.log('✅ ERP database seeding completed successfully!');
  console.log('📊 Summary of created data:');
  console.log(`   - Roles: 3`);
  console.log(`   - Users: 1`);
  console.log(`   - AddressBook: 5`);
  console.log(`   - Products: 5`);
  console.log(`   - Suppliers: 2`);
  console.log(`   - Equipment: 2`);
  console.log(`   - Chart Accounts: 9`);
  console.log(`   - Customers: 2`);
  console.log(`   - Employees: 1`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 