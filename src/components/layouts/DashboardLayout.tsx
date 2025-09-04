'use client';

import { 
  BarChart3, 
  Package, 
  Users, 
  Building2, 
  DollarSign, 
  Settings,
  Truck,
  Activity,
  TrendingUp,
  PieChart,
  Shield,
  Database,
  Cloud
} from "lucide-react";
import React, { type ReactNode } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "../ThemeToggle";


// Dashboard header component
interface DashboardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const DashboardHeader = ({
  children,
  className = "",
}: DashboardHeaderProps) => {
  return <header className={`mb-6 space-y-2 ${className}`}>{children}</header>;
};

// Dashboard title component
interface DashboardTitleProps {
  children: ReactNode;
  className?: string;
}

export const DashboardTitle = ({
  children,
  className = "",
}: DashboardTitleProps) => {
  return (
    <h1 className={`text-2xl font-bold tracking-tight ${className}`}>
      {children}
    </h1>
  );
};

// Dashboard description component
interface DashboardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export const DashboardDescription = ({
  children,
  className = "",
}: DashboardDescriptionProps) => {
  return <p className={`text-muted-foreground ${className}`}>{children}</p>;
};

// Main dashboard layout component
interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname.startsWith(path);
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-3">
              <Image 
                src="/erp-logo.svg" 
                alt="ERP Logo" 
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <div>
                <h2 className="text-xl font-bold">Custom ERP</h2>
                <p className="text-xs text-muted-foreground">Enterprise Resource Planning</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-4">
            
            {/* Main Dashboard */}
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Dashboard"
                  isActive={isActive("/dashboard")}
                >
                  <Link href="/dashboard">
                    <Activity className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <SidebarSeparator className="my-2" />

            {/* Operations */}
            <SidebarMenu>


              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Inventory Management"
                  isActive={isActive("/inventory")}
                >
                  <Link href="/inventory">
                    <Package className="mr-2 h-4 w-4" />
                    Inventory
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Rental & Maintenance"
                  isActive={isActive("/rental")}
                >
                  <Link href="/rental">
                    <Truck className="mr-2 h-4 w-4" />
                    Rental & Maintenance
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <SidebarSeparator className="my-2" />

            {/* Business Management */}
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Finance & Accounting"
                  isActive={isActive("/finance")}
                >
                  <Link href="/finance">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Finance
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Human Resources"
                  isActive={isActive("/hrms")}
                >
                  <Link href="/hrms">
                    <Users className="mr-2 h-4 w-4" />
                    HRMS
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Customer Management"
                  isActive={isActive("/crm")}
                >
                  <Link href="/crm">
                    <Building2 className="mr-2 h-4 w-4" />
                    CRM
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <SidebarSeparator className="my-2" />

            {/* Analytics & Reports */}
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Reports & Analytics"
                  isActive={isActive("/reports")}
                >
                  <Link href="/reports">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Reports
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Business Intelligence"
                  isActive={isActive("/bi")}
                >
                  <Link href="/bi">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Business Intelligence
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Data Analytics"
                  isActive={isActive("/analytics")}
                >
                  <Link href="/analytics">
                    <PieChart className="mr-2 h-4 w-4" />
                    Analytics
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <SidebarSeparator className="my-2" />

            {/* System */}
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="User Management"
                  isActive={isActive("/users")}
                >
                  <Link href="/users">
                    <Shield className="mr-2 h-4 w-4" />
                    Users & Roles
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="System Settings"
                  isActive={isActive("/settings")}
                >
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Data Management"
                  isActive={isActive("/data")}
                >
                  <Link href="/data">
                    <Database className="mr-2 h-4 w-4" />
                    Data Management
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Offline Sync"
                  isActive={isActive("/sync")}
                >
                  <Link href="/sync">
                    <Cloud className="mr-2 h-4 w-4" />
                    Offline Sync
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4">
            <p className="text-muted-foreground text-xs">Custom ERP v1</p>
            <p className="text-muted-foreground text-xs">Papua New Guinea</p>
            <div className="flex items-center gap-2 mt-2">
              <ThemeToggle />
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="relative flex-1 overflow-auto p-6">
          <div className="md:hidden mb-4">
            <SidebarTrigger />
          </div>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};
