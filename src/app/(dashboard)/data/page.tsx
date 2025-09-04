import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Archive,
  FileText,
  HardDrive,
  Cloud,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Edit,
  Lock
} from 'lucide-react';

const DataManagementPage: React.FC = () => {
  // Mock data for data management
  const dataStats = {
    totalRecords: 125000,
    activeRecords: 118000,
    archivedRecords: 7000,
    backupSize: '2.5 GB',
    lastBackup: '2024-01-15 02:00',
    syncStatus: 'Up to date'
  };

  const dataCategories = [
    {
      name: 'Customer Data',
      records: 25000,
      size: '500 MB',
      lastUpdated: '2024-01-15 10:30',
      status: 'Active',
      type: 'Primary'
    },
    {
      name: 'Inventory Data',
      records: 45000,
      size: '800 MB',
      lastUpdated: '2024-01-15 09:15',
      status: 'Active',
      type: 'Primary'
    },
    {
      name: 'Financial Data',
      records: 35000,
      size: '600 MB',
      lastUpdated: '2024-01-15 08:45',
      status: 'Active',
      type: 'Primary'
    },
    {
      name: 'Employee Data',
      records: 15000,
      size: '300 MB',
      lastUpdated: '2024-01-15 07:30',
      status: 'Active',
      type: 'Primary'
    },
    {
      name: 'Equipment Data',
      records: 5000,
      size: '200 MB',
      lastUpdated: '2024-01-14 16:20',
      status: 'Active',
      type: 'Secondary'
    }
  ];

  const backupHistory = [
    {
      id: 1,
      type: 'Full Backup',
      size: '2.5 GB',
      date: '2024-01-15 02:00',
      status: 'Completed',
      duration: '45 minutes'
    },
    {
      id: 2,
      type: 'Incremental Backup',
      size: '150 MB',
      date: '2024-01-14 02:00',
      status: 'Completed',
      duration: '5 minutes'
    },
    {
      id: 3,
      type: 'Full Backup',
      size: '2.4 GB',
      date: '2024-01-13 02:00',
      status: 'Completed',
      duration: '42 minutes'
    },
    {
      id: 4,
      type: 'Incremental Backup',
      size: '180 MB',
      date: '2024-01-12 02:00',
      status: 'Failed',
      duration: 'N/A'
    }
  ];

  const syncLogs = [
    {
      id: 1,
      operation: 'Data Sync',
      status: 'Success',
      timestamp: '2024-01-15 10:30',
      details: 'Synced 1,250 records from remote locations',
      duration: '2 minutes'
    },
    {
      id: 2,
      operation: 'Backup Sync',
      status: 'Success',
      timestamp: '2024-01-15 02:00',
      details: 'Backup completed and synced to cloud storage',
      duration: '45 minutes'
    },
    {
      id: 3,
      operation: 'Conflict Resolution',
      status: 'Warning',
      timestamp: '2024-01-14 15:45',
      details: 'Resolved 3 data conflicts automatically',
      duration: '30 seconds'
    },
    {
      id: 4,
      operation: 'Data Validation',
      status: 'Success',
      timestamp: '2024-01-14 12:00',
      details: 'Validated 125,000 records for integrity',
      duration: '15 minutes'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Success':
      case 'Active':
        return 'bg-green-500';
      case 'Failed':
        return 'bg-red-500';
      case 'Warning':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Success':
      case 'Active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (

    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Data Management</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage, backup, and maintain system data</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataStats.totalRecords.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Across all categories</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Records</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataStats.activeRecords.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Currently in use</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Backup Size</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataStats.backupSize}</div>
              <p className="text-xs text-muted-foreground">Last backup: {dataStats.lastBackup}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
              <Cloud className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{dataStats.syncStatus}</div>
              <p className="text-xs text-muted-foreground">All systems synchronized</p>
            </CardContent>
          </Card>
        </div>

        {/* Data Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Data Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Category</th>
                    <th className="text-left py-3 px-4 font-medium">Records</th>
                    <th className="text-left py-3 px-4 font-medium">Size</th>
                    <th className="text-left py-3 px-4 font-medium">Last Updated</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Type</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                {dataCategories.map((category, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 align-top">
                      <td className="py-3 px-4">
                        <div className="font-medium">{category.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        {category.records.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {category.size}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {category.lastUpdated}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(category.status)}`}></div>
                          {category.status}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">
                          {category.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Archive className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Backup and Sync Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Backup History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Backup History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {backupHistory.map((backup) => (
                  <div key={backup.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(backup.status)}`}></div>
                      <div>
                        <div className="font-medium">{backup.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {backup.size} • {backup.duration}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{backup.date}</div>
                      <Badge className={getStatusBadgeColor(backup.status)}>
                        {backup.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sync Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Sync Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncLogs.map((log) => (
                  <div key={log.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(log.status)}`}></div>
                      <div>
                        <div className="font-medium">{log.operation}</div>
                        <div className="text-sm text-muted-foreground">
                          {log.details}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{log.timestamp}</div>
                      <Badge className={getStatusBadgeColor(log.status)}>
                        {log.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Data Security & Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <h4 className="font-medium text-green-800 dark:text-green-200">Data Encryption</h4>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  All sensitive data is encrypted using AES-256 encryption at rest and in transit.
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-5 w-5 text-blue-500" />
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Access Control</h4>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Role-based access control ensures users only access authorized data.
                </p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Audit Trail</h4>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Complete audit trail of all data access and modifications for compliance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Download className="h-6 w-6" />
                <span>Export Data</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Upload className="h-6 w-6" />
                <span>Import Data</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Archive className="h-6 w-6" />
                <span>Create Backup</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <RefreshCw className="h-6 w-6" />
                <span>Sync Data</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>  );
};

export default DataManagementPage; 