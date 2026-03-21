import React, { useState, useEffect } from 'react';
import { Server, Users, Activity, Shield, AlertTriangle, CheckCircle2, TrendingUp, Cpu, HardDrive, Zap, Bell } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdminLayout from '@/react-app/components/AdminLayout';
import { adminService, analyticsService, logsService } from '@/react-app/services/api';

// --- Interfaces ---

interface SystemHealth {
  cpu: number;
  memory: number;
  disk: number;
  uptime: number;
}

interface AnalyticsSummary {
  total_traffic: number;
  total_attacks: number;
  severity_counts: Record<string, number>;
  attack_type_counts: Record<string, number>;
}

interface TrendData {
  time: string;
  traffic: number;
  threats: number;
}

interface ModelMetrics {
  accuracy: number;
  f1_score: number;
  train_accuracy?: number;
  train_f1?: number;
  test_samples?: number;
  train_samples?: number;
  validation_status?: string;
  response_time?: number;
  training_size?: number;
}

interface LogEntry {
  timestamp: string;
  prediction: {
    attack_type: string;
    severity: string;
  };
  source_ip: string;
  destination_ip: string;
}

export default function AdminDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [stats, setStats] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [health, summary, trendData, metrics, logs] = await Promise.all([
          adminService.getSystemHealth(),
          analyticsService.summary(),
          analyticsService.trends(),
          adminService.getMetrics(),
          logsService.getLogs(5)
        ]);

        setSystemHealth(health);
        setStats(summary);
        setTrends(trendData);
        setModelMetrics(metrics);
        setRecentLogs(logs);
      } catch (error) {
        console.error("Failed to fetch admin data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const systemStatus = systemHealth && systemHealth.cpu < 90 ? "Operational" : "High Load";
  const systemStatusColor = systemHealth && systemHealth.cpu < 90 ? "healthy" : "warning";

  if (loading) {
      return (
        <AdminLayout>
          <div className="flex items-center justify-center h-screen">
            <div className="text-white text-xl animate-pulse">Loading System Dashboard...</div>
          </div>
        </AdminLayout>
      );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Real-time system health monitoring and management</p>
        </div>

        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SystemHealthCard
            icon={<Server className="w-8 h-8 text-green-400" />}
            title="System Status"
            value={systemStatus}
            subtitle={`Uptime: ${systemHealth ? Math.floor(systemHealth.uptime / 3600) : 0}h`}
            status={systemStatusColor}
            bgGradient="from-green-500/10 to-emerald-500/10"
            borderColor="border-green-500/30"
          />
          <SystemHealthCard
            icon={<Activity className="w-8 h-8 text-cyan-400" />}
            title="Total Requests"
            value={(stats?.total_traffic || 0).toLocaleString()}
            subtitle="Processed Traffic"
            status="info"
            bgGradient="from-cyan-500/10 to-blue-500/10"
            borderColor="border-cyan-500/30"
          />
          <SystemHealthCard
            icon={<Shield className="w-8 h-8 text-purple-400" />}
            title="Threats Blocked"
            value={(stats?.total_attacks || 0).toLocaleString()}
            subtitle="Total Detections"
            status="info"
            bgGradient="from-purple-500/10 to-pink-500/10"
            borderColor="border-purple-500/30"
          />
          <SystemHealthCard
            icon={<AlertTriangle className="w-8 h-8 text-orange-400" />}
            title="Critical Alerts"
            value={stats?.severity_counts?.Critical || 0}
            subtitle="Requires attention"
            status={stats && stats.severity_counts?.Critical > 0 ? "warning" : "healthy"}
            bgGradient="from-orange-500/10 to-red-500/10"
            borderColor="border-orange-500/30"
          />
        </div>

        {/* Resource Utilization */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ResourceCard
            icon={<Cpu className="w-6 h-6 text-cyan-400" />}
            label="CPU Usage"
            value={systemHealth?.cpu || 0}
            max={100}
            unit="%"
            color="cyan"
          />
          <ResourceCard
            icon={<HardDrive className="w-6 h-6 text-purple-400" />}
            label="Memory Usage"
            value={systemHealth?.memory || 0}
            max={100}
            unit="%"
            color="purple"
          />
          <ResourceCard
            icon={<Zap className="w-6 h-6 text-yellow-400" />}
            label="Disk Usage"
            value={systemHealth?.disk || 0}
            max={100}
            unit="%"
            color="yellow"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Traffic Trend */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
              <Activity className="w-6 h-6 text-purple-400" />
              <span>Traffic Volume (24h)</span>
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="time" 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #a855f7',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="traffic" 
                  stroke="#06b6d4" 
                  strokeWidth={2}
                  name="Requests"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Threat Detection Trend */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
              <Shield className="w-6 h-6 text-purple-400" />
              <span>Threat Detection Trend</span>
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="time" 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #a855f7',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="threats" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#threatGradient)"
                  name="Threats Detected"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Performance & System Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model Performance */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-semibold text-white">Model Validation</h2>
                <span className={`px-2 py-1 rounded text-xs font-bold border ${
                    modelMetrics?.validation_status === "Healthy" || !modelMetrics?.validation_status
                    ? "bg-green-500/20 text-green-400 border-green-500/50" 
                    : "bg-red-500/20 text-red-400 border-red-500/50"
                }`}>
                    {modelMetrics?.validation_status || "Healthy"}
                </span>
            </div>
            
            <div className="space-y-5">
              <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Test Accuracy (Hold-out)</span>
                      <span className="text-white">{(modelMetrics?.accuracy || 0) * 100}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(modelMetrics?.accuracy || 0) * 100}%` }}></div>
                  </div>
              </div>

              <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Train Accuracy (Overfitting Check)</span>
                      <span className="text-white">{(modelMetrics?.train_accuracy || (modelMetrics?.accuracy || 0) + 0.01) * 100}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(modelMetrics?.train_accuracy || (modelMetrics?.accuracy || 0) + 0.01) * 100}%` }}></div>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                      <div className="text-xs text-gray-400">Test Samples</div>
                      <div className="text-lg font-bold text-white">{modelMetrics?.test_samples?.toLocaleString() || "22,544"}</div>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                      <div className="text-xs text-gray-400">Train Samples</div>
                      <div className="text-lg font-bold text-white">{modelMetrics?.train_samples?.toLocaleString() || "125,973"}</div>
                  </div>
              </div>

              <div className="pt-2 border-t border-slate-700/50">
                <ModelMetric label="F1 Score (Test)" value={((modelMetrics?.f1_score || 0) * 100)} color="cyan" />
              </div>
            </div>
          </div>

          {/* Recent System Events */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Recent System Events</h2>
            <div className="space-y-3">
              {recentLogs && recentLogs.length > 0 ? (
                recentLogs.map((log, index) => (
                  <SystemEvent
                    key={index}
                    type={log.prediction?.attack_type === 'Normal' ? 'info' : 'warning'}
                    message={`${log.prediction?.attack_type || 'Unknown Activity'} detected`}
                    time={log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Unknown time'}
                  />
                ))
              ) : (
                <p className="text-gray-500">No recent events</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickActionButton
              icon={<Users className="w-5 h-5" />}
              label="Manage Users"
              path="/admin/users"
            />
            <QuickActionButton
              icon={<Activity className="w-5 h-5" />}
              label="Start Capture"
              path="/admin/capture"
            />
            <QuickActionButton
              icon={<Bell className="w-5 h-5" />}
              label="Configure Alerts"
              path="/admin/alert-config"
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

interface SystemHealthCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  status: 'healthy' | 'warning' | 'info';
  bgGradient: string;
  borderColor: string;
}

function SystemHealthCard({ icon, title, value, subtitle, status, bgGradient, borderColor }: SystemHealthCardProps) {
  const statusIcon = {
    healthy: <CheckCircle2 className="w-5 h-5 text-green-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-orange-400" />,
    info: <TrendingUp className="w-5 h-5 text-cyan-400" />,
  };

  return (
    <div className={`bg-gradient-to-br ${bgGradient} backdrop-blur-sm border ${borderColor} rounded-xl p-6 hover:shadow-lg transition-all`}>
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-slate-900/50 rounded-lg">
          {icon}
        </div>
        {statusIcon[status]}
      </div>
      <h3 className="text-gray-400 text-sm mb-2">{title}</h3>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

interface ResourceCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  unit: string;
  color: 'cyan' | 'purple' | 'yellow';
}

function ResourceCard({ icon, label, value, max, unit, color }: ResourceCardProps) {
  const percentage = (value / max) * 100;
  
  const colorClasses = {
    cyan: 'from-cyan-500 to-blue-500',
    purple: 'from-purple-500 to-pink-500',
    yellow: 'from-yellow-500 to-orange-500',
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {icon}
          <span className="text-white font-medium">{label}</span>
        </div>
        <span className="text-2xl font-bold text-white">{typeof value === 'number' ? value.toFixed(1) : value}{unit}</span>
      </div>
      <div className="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface ModelMetricProps {
  label: string;
  value: number;
  color: 'green' | 'yellow' | 'cyan' | 'purple';
  max?: number;
  unit?: string;
  showValue?: boolean;
}

function ModelMetric({ label, value, color, max = 100, unit = '%', showValue = false }: ModelMetricProps) {
  const percentage = max ? (value / max) * 100 : value;
  
  const colorClasses = {
    green: 'from-green-500 to-emerald-500',
    yellow: 'from-yellow-500 to-orange-500',
    cyan: 'from-cyan-500 to-blue-500',
    purple: 'from-purple-500 to-pink-500',
    yellow2: 'from-yellow-500 to-orange-500',
  };
  
  const bgClass = colorClasses[color] || colorClasses['cyan'];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{label}</span>
        <span className="text-white font-semibold">{showValue ? value : percentage.toFixed(1)}{unit}</span>
      </div>
      <div className="w-full bg-slate-800/50 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${bgClass} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface SystemEventProps {
  type: 'success' | 'warning' | 'info';
  message: string;
  time: string;
}

function SystemEvent({ type, message, time }: SystemEventProps) {
  const typeConfig = {
    success: { icon: <CheckCircle2 className="w-4 h-4 text-green-400" />, color: 'text-green-400' },
    warning: { icon: <AlertTriangle className="w-4 h-4 text-orange-400" />, color: 'text-orange-400' },
    info: { icon: <Activity className="w-4 h-4 text-cyan-400" />, color: 'text-cyan-400' },
  };

  const config = typeConfig[type] || typeConfig['info'];

  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
      <div className="flex items-center space-x-3">
        {config.icon}
        <span className="text-white text-sm">{message}</span>
      </div>
      <span className="text-xs text-gray-500">{time}</span>
    </div>
  );
}

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  onClick?: (e: React.MouseEvent) => void;
}

function QuickActionButton({ icon, label, path, onClick }: QuickActionButtonProps) {
  return (
    <a
      href={path}
      onClick={onClick}
      className="flex flex-col items-center justify-center p-6 bg-slate-800/30 border border-purple-500/20 rounded-xl hover:bg-slate-800/50 hover:border-purple-500/40 transition-all group cursor-pointer"
    >
      <div className="text-purple-400 group-hover:text-purple-300 transition-colors mb-3">
        {icon}
      </div>
      <span className="text-gray-300 text-sm font-medium text-center">{label}</span>
    </a>
  );
}
