-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "name" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddressBook" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "alphaName" TEXT NOT NULL,
    "isCustomer" BOOLEAN NOT NULL DEFAULT false,
    "isVendor" BOOLEAN NOT NULL DEFAULT false,
    "isEmployee" BOOLEAN NOT NULL DEFAULT false,
    "altKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "AddressBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stdCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lastCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "avgCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemBranch" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "reorderPoint" INTEGER NOT NULL DEFAULT 0,
    "reorderQty" INTEGER NOT NULL DEFAULT 0,
    "safetyStock" INTEGER NOT NULL DEFAULT 0,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
    "lotSize" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "ItemBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemLocation" (
    "id" TEXT NOT NULL,
    "itemBranchId" TEXT NOT NULL,
    "bin" TEXT NOT NULL,
    "lotNumber" TEXT,
    "qtyOnHand" INTEGER NOT NULL DEFAULT 0,
    "qtyCommitted" INTEGER NOT NULL DEFAULT 0,
    "qtyOnOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "ItemLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTx" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "txType" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "refType" TEXT,
    "refId" TEXT,
    "userId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTx_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "acquisitionCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currentValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "currentSiteId" TEXT,
    "type" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "hoursUsed" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "loadUnits" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Breakdown" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Breakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "estimatedCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "actualCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequisition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "costCenter" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "PurchaseRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PGK',
    "exchangeRate" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "deliveryDate" TIMESTAMP(3),
    "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GRN" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GRN_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "APInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poId" TEXT,
    "supplierId" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'PGK',
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "APInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ARInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rentalRefId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "ARInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "businessUnit" TEXT NOT NULL,
    "object" TEXT NOT NULL,
    "subsidiary" TEXT NOT NULL,
    "project" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'PGK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChartAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GLEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PGK',
    "exchangeRate" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "batchNo" TEXT NOT NULL,
    "batchType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GLEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hireDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "abId" TEXT NOT NULL,
    "orgUnitId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leave" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timesheet" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "hoursWorked" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "Timesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_user_tenant_active" ON "User"("tenantId", "isDeleted");

-- CreateIndex
CREATE INDEX "idx_user_tenant_email" ON "User"("tenantId", "email");

-- CreateIndex
CREATE INDEX "idx_role_tenant_name" ON "Role"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "idx_permission_tenant_code" ON "Permission"("tenantId", "code");

-- CreateIndex
CREATE INDEX "idx_userrole_tenant_user" ON "UserRole"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "idx_auditevent_actor" ON "AuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "idx_auditevent_tenant_created" ON "AuditEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_auditevent_tenant_entity" ON "AuditEvent"("tenantId", "entity", "entityId");

-- CreateIndex
CREATE INDEX "idx_addressbook_tenant_alpha" ON "AddressBook"("tenantId", "alphaName");

-- CreateIndex
CREATE INDEX "idx_addressbook_tenant_types" ON "AddressBook"("tenantId", "isCustomer", "isVendor", "isEmployee");

-- CreateIndex
CREATE UNIQUE INDEX "Item_number_key" ON "Item"("number");

-- CreateIndex
CREATE INDEX "idx_item_tenant_active" ON "Item"("tenantId", "isDeleted");

-- CreateIndex
CREATE INDEX "idx_item_tenant_type" ON "Item"("tenantId", "type");

-- CreateIndex
CREATE INDEX "idx_itembranch_tenant_item" ON "ItemBranch"("tenantId", "itemId");

-- CreateIndex
CREATE INDEX "idx_itemlocation_tenant_branch" ON "ItemLocation"("tenantId", "itemBranchId");

-- CreateIndex
CREATE INDEX "idx_inventorytx_tenant_item_time" ON "InventoryTx"("tenantId", "itemId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_inventorytx_tenant_site" ON "InventoryTx"("tenantId", "siteId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_inventorytx_tenant_type" ON "InventoryTx"("tenantId", "txType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_code_key" ON "Equipment"("code");

-- CreateIndex
CREATE INDEX "idx_equipment_tenant_active" ON "Equipment"("tenantId", "isDeleted");

-- CreateIndex
CREATE INDEX "idx_equipment_tenant_code" ON "Equipment"("tenantId", "code");

-- CreateIndex
CREATE INDEX "idx_equipment_tenant_site" ON "Equipment"("tenantId", "currentSiteId");

-- CreateIndex
CREATE INDEX "idx_equipment_tenant_type" ON "Equipment"("tenantId", "type");

-- CreateIndex
CREATE INDEX "idx_usagelog_tenant_equipment_time" ON "UsageLog"("tenantId", "equipmentId", "shiftDate");

-- CreateIndex
CREATE INDEX "idx_usagelog_tenant_shift" ON "UsageLog"("tenantId", "shiftDate");

-- CreateIndex
CREATE INDEX "idx_breakdown_tenant_equipment_time" ON "Breakdown"("tenantId", "equipmentId", "startAt");

-- CreateIndex
CREATE INDEX "idx_workorder_tenant_scheduled" ON "WorkOrder"("tenantId", "scheduledDate");

-- CreateIndex
CREATE INDEX "idx_workorder_tenant_status" ON "WorkOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "idx_workorder_tenant_type" ON "WorkOrder"("tenantId", "type");

-- CreateIndex
CREATE INDEX "idx_purchaseorder_tenant_status" ON "PurchaseOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "idx_purchaseorder_tenant_supplier" ON "PurchaseOrder"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "idx_grn_tenant_po" ON "GRN"("tenantId", "poId");

-- CreateIndex
CREATE INDEX "idx_apinvoice_tenant_status" ON "APInvoice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "idx_apinvoice_tenant_supplier" ON "APInvoice"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "idx_arinvoice_tenant_customer" ON "ARInvoice"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "idx_arinvoice_tenant_status" ON "ARInvoice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "idx_chartaccount_tenant_dimensions" ON "ChartAccount"("tenantId", "company", "businessUnit", "object");

-- CreateIndex
CREATE INDEX "idx_glentry_tenant_account_time" ON "GLEntry"("tenantId", "accountId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_glentry_tenant_batch" ON "GLEntry"("tenantId", "batchNo", "batchType");

-- CreateIndex
CREATE INDEX "idx_glentry_tenant_posting" ON "GLEntry"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_employee_tenant_hire" ON "Employee"("tenantId", "hireDate");

-- CreateIndex
CREATE INDEX "idx_leave_tenant_employee" ON "Leave"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "idx_timesheet_tenant_employee" ON "Timesheet"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "idx_ticket_tenant_customer" ON "Ticket"("tenantId", "customerId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddressBook" ADD CONSTRAINT "AddressBook_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemBranch" ADD CONSTRAINT "ItemBranch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLocation" ADD CONSTRAINT "ItemLocation_itemBranchId_fkey" FOREIGN KEY ("itemBranchId") REFERENCES "ItemBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Breakdown" ADD CONSTRAINT "Breakdown_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Breakdown" ADD CONSTRAINT "Breakdown_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisition" ADD CONSTRAINT "PurchaseRequisition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRN" ADD CONSTRAINT "GRN_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APInvoice" ADD CONSTRAINT "APInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ARInvoice" ADD CONSTRAINT "ARInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartAccount" ADD CONSTRAINT "ChartAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLEntry" ADD CONSTRAINT "GLEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ChartAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLEntry" ADD CONSTRAINT "GLEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_abId_fkey" FOREIGN KEY ("abId") REFERENCES "AddressBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
