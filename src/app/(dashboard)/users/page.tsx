import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users, 
  Shield, 
  UserPlus, 
  Search, 
  Filter,
  MoreHorizontal,
  Edit,
  Eye,
  Lock,
  Calendar,
  MapPin,
  Building,
  User,
  UserCheck
} from 'lucide-react';

const UsersPage: React.FC = () => {
  // Mock data for users
  const users = [
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@nextgen.com',
      role: 'Admin',
      department: 'IT',
      status: 'Active',
      lastLogin: '2024-01-15 09:30',
      avatar: 'JS',
      phone: '+675 123 456 789',
      location: 'Port Moresby',
      permissions: ['Full Access', 'User Management', 'System Settings']
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@nextgen.com',
      role: 'Manager',
      department: 'Finance',
      status: 'Active',
      lastLogin: '2024-01-15 08:45',
      avatar: 'SJ',
      phone: '+675 123 456 790',
      location: 'Lae',
      permissions: ['Finance Access', 'Reports', 'User Management']
    },
    {
      id: 3,
      name: 'Michael Brown',
      email: 'michael.brown@nextgen.com',
      role: 'Operator',
      department: 'Operations',
      status: 'Active',
      lastLogin: '2024-01-15 07:20',
      avatar: 'MB',
      phone: '+675 123 456 791',
      location: 'Mount Hagen',
      permissions: ['Inventory Access', 'Basic Reports']
    },
    {
      id: 4,
      name: 'Emily Davis',
      email: 'emily.davis@nextgen.com',
      role: 'Analyst',
      department: 'Analytics',
      status: 'Inactive',
      lastLogin: '2024-01-10 16:15',
      avatar: 'ED',
      phone: '+675 123 456 792',
      location: 'Goroka',
      permissions: ['Analytics Access', 'Reports']
    },
    {
      id: 5,
      name: 'David Wilson',
      email: 'david.wilson@nextgen.com',
      role: 'Supervisor',
      department: 'HR',
      status: 'Active',
      lastLogin: '2024-01-15 10:00',
      avatar: 'DW',
      phone: '+675 123 456 793',
      location: 'Madang',
      permissions: ['HR Access', 'Employee Management', 'Reports']
    }
  ];

  const roles = [
    { name: 'Admin', users: 2, permissions: 'Full System Access', color: 'bg-red-500' },
    { name: 'Manager', users: 3, permissions: 'Department Management', color: 'bg-blue-500' },
    { name: 'Supervisor', users: 2, permissions: 'Team Management', color: 'bg-green-500' },
    { name: 'Operator', users: 8, permissions: 'Basic Operations', color: 'bg-yellow-500' },
    { name: 'Analyst', users: 4, permissions: 'Data Analysis', color: 'bg-purple-500' }
  ];

  const getStatusColor = (status: string) => {
    return status === 'Active' ? 'bg-green-500' : 'bg-red-500';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Supervisor': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Operator': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Analyst': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Users & Roles</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage system users, roles, and permissions</p>
          </div>
          <Button className="w-full sm:w-auto">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">+2 from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">21</div>
              <p className="text-xs text-muted-foreground">87.5% of total users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Roles</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">Different role types</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online Now</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users..." className="pl-10" />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>System Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">User</th>
                    <th className="text-left py-3 px-4 font-medium">Role</th>
                    <th className="text-left py-3 px-4 font-medium">Department</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Last Login</th>
                    <th className="text-left py-3 px-4 font-medium">Location</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 align-top">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-200">
                              {user.avatar}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          {user.department}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(user.status)}`}></div>
                          {user.status}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {user.lastLogin}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {user.location}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" className="w-full sm:w-auto"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="w-full sm:w-auto"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="w-full sm:w-auto"><MoreHorizontal className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Roles Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Role Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                User Roles Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roles.map((role, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${role.color}`}></div>
                      <div>
                        <div className="font-medium">{role.name}</div>
                        <div className="text-sm text-muted-foreground">{role.permissions}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{role.users} users</div>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent User Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <UserCheck className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">John Smith logged in</div>
                    <div className="text-sm text-muted-foreground">2 minutes ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Edit className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="font-medium">Sarah Johnson updated profile</div>
                    <div className="text-sm text-muted-foreground">15 minutes ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Lock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <div className="font-medium">Michael Brown password reset</div>
                    <div className="text-sm text-muted-foreground">1 hour ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <UserPlus className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="font-medium">New user account created</div>
                    <div className="text-sm text-muted-foreground">2 hours ago</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permissions Matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Permissions Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Permission</th>
                    <th className="text-center py-3 px-4 font-medium">Admin</th>
                    <th className="text-center py-3 px-4 font-medium">Manager</th>
                    <th className="text-center py-3 px-4 font-medium">Supervisor</th>
                    <th className="text-center py-3 px-4 font-medium">Operator</th>
                    <th className="text-center py-3 px-4 font-medium">Analyst</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">User Management</td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-gray-300 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-gray-300 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-gray-300 rounded-full mx-auto"></div>
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">System Settings</td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-gray-300 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-gray-300 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-gray-300 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-gray-300 rounded-full mx-auto"></div>
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">Financial Access</td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-yellow-500 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-gray-300 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-yellow-500 rounded-full mx-auto"></div>
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">Inventory Access</td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-yellow-500 rounded-full mx-auto"></div>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Reports Access</td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-yellow-500 rounded-full mx-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mx-auto"></div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>Full Access</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span>Limited Access</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                <span>No Access</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>  );
};

export default UsersPage; 