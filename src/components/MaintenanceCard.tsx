import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wrench, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Plus,
  DollarSign,
} from 'lucide-react';

interface MaintenanceStats {
  totalEquipment: number;
  scheduledMaintenance: number;
  overdueMaintenance: number;
  inProgress: number;
  completedThisMonth: number;
  totalCost: number;
}

interface MaintenanceCardProps {
  stats: MaintenanceStats;
  onViewMaintenance: () => void;
  onScheduleMaintenance: () => void;
  onViewOverdue: () => void;
  onViewCompleted: () => void;
  onViewCostAnalysis: () => void;
}

export const MaintenanceCard: React.FC<MaintenanceCardProps> = ({
  stats,
  onViewMaintenance: _onViewMaintenance,
  onScheduleMaintenance,
  onViewOverdue,
  onViewCompleted,
  onViewCostAnalysis
}) => {
  const getPriorityColor = (count: number) => {
    if (count === 0) return 'text-green-600';
    if (count <= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Maintenance Overview
          {stats.overdueMaintenance > 0 && (
            <Badge className="ml-2 bg-red-500 text-white">
              {stats.overdueMaintenance} Overdue
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="text-sm font-medium">Total Equipment</p>
              <p className="text-2xl font-bold">{stats.totalEquipment}</p>
            </div>
            <Wrench className="h-8 w-8 text-blue-500" />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="text-sm font-medium">Scheduled</p>
              <p className="text-2xl font-bold">{stats.scheduledMaintenance}</p>
              <p className={`text-xs ${getPriorityColor(stats.overdueMaintenance)}`}>
                {stats.overdueMaintenance} overdue
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="text-sm font-medium">In Progress</p>
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-xs text-muted-foreground">Active work</p>
            </div>
            <Wrench className="h-8 w-8 text-orange-500" />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="text-sm font-medium">Monthly Cost</p>
              <p className="text-2xl font-bold">${stats.totalCost.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{stats.completedThisMonth} completed</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        {/* Quick Maintenance Actions */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onScheduleMaintenance}>
              <Plus className="h-4 w-4 mr-1" />
              Schedule Maintenance
            </Button>
            <Button 
              size="sm" 
              variant={stats.overdueMaintenance > 0 ? "destructive" : "outline"}
              onClick={onViewOverdue}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              View Overdue ({stats.overdueMaintenance})
            </Button>
            <Button size="sm" variant="outline" onClick={onViewCompleted}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Completed This Month
            </Button>
            <Button size="sm" variant="outline" onClick={onViewCostAnalysis}>
              <DollarSign className="h-4 w-4 mr-1" />
              Cost Analysis
            </Button>
          </div>
        </div>

        {/* Maintenance Alerts */}
        {stats.overdueMaintenance > 0 && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Maintenance Alerts
                </p>
                <p className="text-xs text-red-600 dark:text-red-300">
                  {stats.overdueMaintenance} equipment items have overdue maintenance
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="destructive" 
              className="mt-2"
              onClick={onViewOverdue}
            >
              View Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MaintenanceCard;
