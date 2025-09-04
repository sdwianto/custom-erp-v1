import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ThemeColorPicker } from '@/components/ThemeColorPicker';
import { 
  Settings, 
  Users,
  Shield,
  Database,
  Cloud,
  Bell,
  Globe,
  Palette,
  Key,
  Lock,
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  Download,
  Upload,
  RefreshCw,
  Save
} from 'lucide-react';

const SettingsPage: React.FC = () => {
  // Mock data for demonstration
  const systemStats = {
    totalUsers: 45,
    activeUsers: 42,
    systemUptime: '99.8%',
    lastBackup: '2024-03-10 02:00',
    nextBackup: '2024-03-11 02:00',
    databaseSize: '2.4 GB',
    storageUsed: '68%'
  };

  const users = [
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@nextgen.com',
      role: 'Administrator',
      status: 'active',
      lastLogin: '2024-03-10 14:30',
      permissions: ['all']
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@nextgen.com',
      role: 'Manager',
      status: 'active',
      lastLogin: '2024-03-10 13:45',
      permissions: ['inventory', 'finance', 'reports']
    },
    {
      id: 3,
      name: 'Mike Wilson',
      email: 'mike.wilson@nextgen.com',
      role: 'Operator',
      status: 'active',
      lastLogin: '2024-03-10 12:15',
      permissions: ['inventory', 'rental']
    },
    {
      id: 4,
      name: 'Lisa Brown',
      email: 'lisa.brown@nextgen.com',
      role: 'Finance',
      status: 'inactive',
      lastLogin: '2024-03-08 16:20',
      permissions: ['finance', 'reports']
    }
  ];

  const systemSettings = [
    {
      category: 'General',
      settings: [
        { name: 'Company Name', value: 'NextGen Technology Limited', type: 'text' },
        { name: 'System Timezone', value: 'Pacific/Port_Moresby', type: 'select' },
        { name: 'Date Format', value: 'DD/MM/YYYY', type: 'select' },
        { name: 'Currency', value: 'USD', type: 'select' }
      ]
    },
    {
      category: 'Security',
      settings: [
        { name: 'Password Policy', value: 'Strong (8+ chars, symbols)', type: 'text' },
        { name: 'Session Timeout', value: '30 minutes', type: 'select' },
        { name: 'Two-Factor Auth', value: 'Enabled', type: 'toggle' },
        { name: 'Login Attempts', value: '5 attempts', type: 'number' }
      ]
    },
    {
      category: 'Backup & Sync',
      settings: [
        { name: 'Auto Backup', value: 'Daily at 2:00 AM', type: 'text' },
        { name: 'Backup Retention', value: '30 days', type: 'select' },
        { name: 'Offline Sync', value: 'Enabled', type: 'toggle' },
        { name: 'Sync Interval', value: '15 minutes', type: 'select' }
      ]
    }
  ];

  const roles = [
    {
      id: 1,
      name: 'Administrator',
      description: 'Full system access and control',
      users: 2,
      permissions: ['all']
    },
    {
      id: 2,
      name: 'Manager',
      description: 'Management level access to most modules',
      users: 8,
      permissions: ['inventory', 'finance', 'hrms', 'crm', 'reports']
    },
    {
      id: 3,
      name: 'Operator',
      description: 'Basic operational access',
      users: 25,
      permissions: ['inventory', 'rental', 'basic_reports']
    },
    {
      id: 4,
      name: 'Finance',
      description: 'Financial module access only',
      users: 5,
      permissions: ['finance', 'reports']
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Administrator':
        return 'text-red-600';
      case 'Manager':
        return 'text-blue-600';
      case 'Operator':
        return 'text-green-600';
      case 'Finance':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  return (

    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage system configuration, users, and security settings</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Config
            </Button>
            <Button className="w-full sm:w-auto flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                <CheckCircle className="inline h-3 w-3 text-green-500" /> {systemStats.activeUsers} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.systemUptime}</div>
              <p className="text-xs text-muted-foreground">
                <CheckCircle className="inline h-3 w-3 text-green-500" /> Excellent performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.lastBackup}</div>
              <p className="text-xs text-muted-foreground">
                <Clock className="inline h-3 w-3 text-yellow-500" /> Next: {systemStats.nextBackup}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <Cloud className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.storageUsed}</div>
              <p className="text-xs text-muted-foreground">
                <Database className="inline h-3 w-3 text-blue-500" /> {systemStats.databaseSize} database
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-2 md:gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search users..." 
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Roles
              </Button>
              <Button className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Add User
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">User</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Last Login</th>
                    <th className="text-left p-3 font-medium">Permissions</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`font-medium ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="p-3 text-sm text-gray-500">{user.lastLogin}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {user.permissions.map((permission, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">Edit</Button>
                          <Button size="sm" variant="outline">Reset Password</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Theme Customization */}
        <ThemeColorPicker />

        {/* System Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {systemSettings.map((category) => (
                  <div key={category.category} className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">{category.category}</h3>
                    <div className="space-y-4">
                      {category.settings.map((setting, index) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{setting.name}</div>
                            <div className="text-sm text-gray-500">Current: {setting.value}</div>
                          </div>
                          <Button size="sm" variant="outline" className="w-full sm:w-auto">Edit</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Role Management */}
          <Card>
            <CardHeader>
              <CardTitle>Role Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Shield className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{role.name}</div>
                        <div className="text-sm text-gray-500">{role.description}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {role.users} users • {role.permissions.length} permissions
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Edit</Button>
                      <Button size="sm" variant="outline">Permissions</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle>System Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Backup & Recovery</h3>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="mr-2 h-4 w-4" />
                    Create Backup
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="mr-2 h-4 w-4" />
                    Restore Backup
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Clock className="mr-2 h-4 w-4" />
                    Backup Schedule
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">System Health</h3>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="mr-2 h-4 w-4" />
                    System Status
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="mr-2 h-4 w-4" />
                    Database Health
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Cloud className="mr-2 h-4 w-4" />
                    Storage Analysis
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Security</h3>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Lock className="mr-2 h-4 w-4" />
                    Security Audit
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Key className="mr-2 h-4 w-4" />
                    Access Logs
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Security Alerts
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Add New User
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Shield className="mr-2 h-4 w-4" />
                Manage Roles
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Key className="mr-2 h-4 w-4" />
                Permission Matrix
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Globe className="mr-2 h-4 w-4" />
                System Preferences
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Palette className="mr-2 h-4 w-4" />
                Theme Settings
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Bell className="mr-2 h-4 w-4" />
                Notification Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Upload className="mr-2 h-4 w-4" />
                Import Data
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <RefreshCw className="mr-2 h-4 w-4" />
                Data Migration
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>  );
};

export default SettingsPage; 