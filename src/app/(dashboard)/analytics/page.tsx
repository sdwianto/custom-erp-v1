import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  PieChart,
  LineChart,
  Activity,
  DollarSign,
  Package,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Eye,
  Target,
  Zap
} from 'lucide-react';

const AnalyticsPage: React.FC = () => {
  // Mock data for analytics
  const analyticsData = {
    overview: {
      totalRevenue: 1250000,
      totalOrders: 456,
      avgOrderValue: 2741,
      conversionRate: 3.2
    },
    trends: {
      revenueGrowth: 27.6,
      orderGrowth: 8.6,
      customerGrowth: 5.9,
      profitGrowth: 14.3
    },
    topMetrics: [
      { name: 'Revenue per Customer', value: 1000, change: 12.5, trend: 'up' },
      { name: 'Order Completion Rate', value: 94.2, change: 2.1, trend: 'up' },
      { name: 'Customer Lifetime Value', value: 8500, change: 8.7, trend: 'up' },
      { name: 'Inventory Turnover', value: 6.8, change: -1.2, trend: 'down' }
    ],
    performanceData: [
      { month: 'Jan', revenue: 850000, orders: 310, customers: 980 },
      { month: 'Feb', revenue: 920000, orders: 335, customers: 1020 },
      { month: 'Mar', revenue: 980000, orders: 365, customers: 1080 },
      { month: 'Apr', revenue: 1100000, orders: 395, customers: 1150 },
      { month: 'May', revenue: 1180000, orders: 425, customers: 1200 },
      { month: 'Jun', revenue: 1250000, orders: 456, customers: 1250 }
    ],
    customerAnalytics: {
      segments: [
        { name: 'Mining Companies', count: 562, revenue: 562000, percentage: 45 },
        { name: 'Construction', count: 375, revenue: 375000, percentage: 30 },
        { name: 'Infrastructure', count: 188, revenue: 188000, percentage: 15 },
        { name: 'Others', count: 125, revenue: 125000, percentage: 10 }
      ],
      behavior: [
        { metric: 'Average Session Duration', value: '8.5 minutes', change: 12.3 },
        { metric: 'Pages per Session', value: '4.2', change: 5.7 },
        { metric: 'Bounce Rate', value: '32.1%', change: -8.4 },
        { metric: 'Return Customer Rate', value: '68.5%', change: 15.2 }
      ]
    },
    productAnalytics: {
      topProducts: [
        { name: 'Excavator Spare Parts', sales: 125000, units: 45, margin: 28.5 },
        { name: 'Bulldozer Components', sales: 98000, units: 32, margin: 25.2 },
        { name: 'Crane Equipment', sales: 87000, units: 28, margin: 22.8 },
        { name: 'Hydraulic Systems', sales: 76000, units: 25, margin: 30.1 },
        { name: 'Electrical Parts', sales: 65000, units: 22, margin: 18.9 }
      ],
      categories: [
        { name: 'Heavy Equipment', revenue: 450000, percentage: 36 },
        { name: 'Spare Parts', revenue: 380000, percentage: 30.4 },
        { name: 'Tools & Accessories', revenue: 250000, percentage: 20 },
        { name: 'Safety Equipment', revenue: 170000, percentage: 13.6 }
      ]
    }
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? 
      <TrendingUp className="h-4 w-4 text-green-500" /> : 
      <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getTrendColor = (trend: string) => {
    return trend === 'up' ? 'text-green-600' : 'text-red-600';
  };

  return (

    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Data Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400">Comprehensive data analysis and performance metrics</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analyticsData.overview.totalRevenue.toLocaleString()}</div>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>+{analyticsData.trends.revenueGrowth}%</span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.overview.totalOrders.toLocaleString()}</div>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>+{analyticsData.trends.orderGrowth}%</span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analyticsData.overview.avgOrderValue.toLocaleString()}</div>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>+12.5%</span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.overview.conversionRate}%</div>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>+0.8%</span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {analyticsData.topMetrics.map((metric, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                </div>
                <div className={`flex items-center text-sm ${getTrendColor(metric.trend)}`}>
                  {getTrendIcon(metric.trend)}
                  <span className="ml-1">{metric.change > 0 ? '+' : ''}{metric.change}%</span>
                  <span className="text-muted-foreground ml-1">vs last month</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Performance Trends (6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.performanceData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.month}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        Revenue: ${item.revenue.toLocaleString()}
                      </span>
                      <span className="text-sm text-blue-600">
                        Orders: {item.orders}
                      </span>
                      <span className="text-sm text-green-600">
                        Customers: {item.customers}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Customer Segments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Customer Segments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.customerAnalytics.segments.map((segment, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${
                        index === 0 ? 'bg-blue-500' : 
                        index === 1 ? 'bg-green-500' : 
                        index === 2 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-medium">{segment.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{segment.percentage}%</div>
                      <div className="text-xs text-muted-foreground">
                        ${segment.revenue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Behavior */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Customer Behavior Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {analyticsData.customerAnalytics.behavior.map((behavior, index) => (
                <div key={index} className="text-center p-3 border rounded-md">
                  <div className="text-2xl font-bold text-blue-600">{behavior.value}</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{behavior.metric}</div>
                  <div className="text-sm text-green-600">
                    +{behavior.change}% vs last month
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Product Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Performing Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.productAnalytics.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.units} units sold
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">${product.sales.toLocaleString()}</div>
                      <div className="text-sm text-green-600">
                        {product.margin}% margin
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Product Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Revenue by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.productAnalytics.categories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${
                        index === 0 ? 'bg-blue-500' : 
                        index === 1 ? 'bg-green-500' : 
                        index === 2 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{category.percentage}%</div>
                      <div className="text-xs text-muted-foreground">
                        ${category.revenue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Key Insights & Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Revenue Growth</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Strong revenue growth of 27.6% driven by increased mining equipment sales and higher average order values.
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Customer Retention</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  High return customer rate of 68.5% indicates strong customer satisfaction and loyalty programs effectiveness.
                </p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Inventory Optimization</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Inventory turnover rate of 6.8 shows good efficiency, but there is room for improvement in stock management.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>  );
};

export default AnalyticsPage; 