import React, { useState, useEffect } from 'react';
import { Shield, Activity, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DashboardLayout from '@/react-app/components/DashboardLayout';
import SessionSelector from '@/react-app/components/SessionSelector';
import { analyticsService, logsService } from '@/react-app/services/api';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

interface DashboardStats {
  total_traffic: number;
  total_attacks: number;
  severity_counts: Record<string, number>;
  attack_type_counts: Record<string, number>;
}

interface LogEntry {
  id: string;
  attack_type: string;
  severity: string;
  timestamp: string;
  user_id?: string;
  details?: {
    sourceIp?: string;
    destIp?: string;
  };
}

export default function UserDashboard() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<LogEntry[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const summaryData = await analyticsService.summary(selectedSessionId || undefined);
        setStats(summaryData);
        
        const logsData = await logsService.getLogs(5, selectedSessionId || undefined);
        setRecentActivity(logsData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      }
    };
    
    fetchData();
  }, [selectedSessionId]);

  const attackTypeData = stats && stats.attack_type_counts 
    ? Object.entries(stats.attack_type_counts).map(([name, value]) => ({ name, value })) 
    : [];

  const severityData = stats && stats.severity_counts
    ? Object.entries(stats.severity_counts).map(([severity, count]) => ({ 
        severity, 
        count, 
        color: severity === 'Critical' ? '#dc2626' : severity === 'High' ? '#f59e0b' : severity === 'Medium' ? '#eab308' : '#22c55e' 
      }))
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
            <p className="text-gray-400">Real-time threat intelligence and network analysis</p>
          </div>
          <SessionSelector 
            selectedSessionId={selectedSessionId}
            onSelect={setSelectedSessionId} 
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            icon={<Activity className="w-8 h-8 text-cyan-400" />}
            title="Total Traffic Analyzed"
            value={stats?.total_traffic?.toLocaleString() || "0"}
            change="Real-time"
            trend="up"
            bgGradient="from-cyan-500/10 to-blue-500/10"
            borderColor="border-cyan-500/30"
          />
          <StatsCard
            icon={<AlertTriangle className="w-8 h-8 text-red-400" />}
            title="Attacks Detected"
            value={stats?.total_attacks?.toLocaleString() || "0"}
            change={`${stats?.total_traffic ? ((stats.total_attacks / stats.total_traffic) * 100).toFixed(1) : 0}% rate`}
            trend="down"
            bgGradient="from-red-500/10 to-orange-500/10"
            borderColor="border-red-500/30"
          />
          <StatsCard
            icon={<Shield className="w-8 h-8 text-purple-400" />}
            title="Highest Severity"
            value={severityData.find(s => s.severity === 'Critical')?.count ? 'Critical' : severityData.find(s => s.severity === 'High')?.count ? 'High' : 'Normal'}
            change="Level"
            trend="critical"
            bgGradient="from-purple-500/10 to-pink-500/10"
            borderColor="border-purple-500/30"
          />
          <StatsCard
            icon={<CheckCircle2 className="w-8 h-8 text-green-400" />}
            title="System Status"
            value="Operational"
            change="Active"
            trend="stable"
            bgGradient="from-green-500/10 to-emerald-500/10"
            borderColor="border-green-500/30"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attack Category Distribution */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Attack Category Distribution</h2>
            {attackTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={attackTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {attackTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #06b6d4',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">No attack data available</div>
            )}
          </div>

          {/* Severity Summary */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Severity Summary</h2>
            {severityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={severityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="severity" 
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
                      border: '1px solid #06b6d4',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#94a3b8' }}
                  />
                  <Bar dataKey="count" name="Attack Count">
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">No severity data available</div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Recent Threat Activity</h2>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((log) => (
                <ActivityItem
                  key={log.id}
                  type={log.attack_type}
                  severity={log.severity?.toLowerCase() || 'low'}
                  timestamp={new Date(log.timestamp).toLocaleString()}
                  source={log.details?.sourceIp || 'Unknown'}
                />
              ))
            ) : (
              <div className="text-gray-500 text-center py-4">No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

interface StatsCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'critical' | 'stable';
  bgGradient: string;
  borderColor: string;
}

function StatsCard({ icon, title, value, change, trend, bgGradient, borderColor }: StatsCardProps) {
  return (
    <div className={`bg-gradient-to-br ${bgGradient} backdrop-blur-sm border ${borderColor} rounded-xl p-6 hover:shadow-lg transition-all`}>
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-slate-900/50 rounded-lg">
          {icon}
        </div>
        {trend === 'up' && <TrendingUp className="w-5 h-5 text-green-400" />}
        {trend === 'down' && <TrendingDown className="w-5 h-5 text-green-400" />}
        {trend === 'critical' && <AlertTriangle className="w-5 h-5 text-red-400" />}
        {trend === 'stable' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
      </div>
      <h3 className="text-gray-400 text-sm mb-2">{title}</h3>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-gray-500">{change}</p>
    </div>
  );
}

interface ActivityItemProps {
  type: string;
  severity: string;
  timestamp: string;
  source: string;
}

function ActivityItem({ type, severity, timestamp, source }: ActivityItemProps) {
  const severityColors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
    normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  const colorClass = severityColors[severity.toLowerCase()] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';

  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-all">
      <div className="flex items-center space-x-4">
        <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
          {severity.toUpperCase()}
        </div>
        <div>
          <p className="text-white font-medium">{type}</p>
          <p className="text-sm text-gray-400">Source: {source}</p>
        </div>
      </div>
      <div className="text-sm text-gray-500">{timestamp}</div>
    </div>
  );
}
