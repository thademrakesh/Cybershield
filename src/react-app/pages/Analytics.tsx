import { TrendingUp, Shield, Users, Activity, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import AdminLayout from '@/react-app/components/AdminLayout';
import { useEffect, useState } from 'react';
import { analyticsService } from '@/react-app/services/api';

const SEVERITY_COLORS: Record<string, string> = {
  'Critical': '#dc2626',
  'High': '#f97316',
  'Medium': '#eab308',
  'Low': '#22c55e',
  'Normal': '#3b82f6'
};

const THREAT_COLORS: Record<string, string> = {
  'dos': '#f59e0b',
  'probe': '#eab308',
  'r2l': '#a855f7',
  'u2r': '#06b6d4',
  'malware': '#ef4444',
  'phishing': '#eab308',
  'intrusion': '#06b6d4',
  'ransomware': '#a855f7'
};

const DEFAULT_COLORS = ['#ef4444', '#f59e0b', '#eab308', '#06b6d4', '#a855f7'];

interface TrendData {
  time: string;
  traffic: number;
  threats: number;
}

interface DetectionRateData {
  week: string;
  rate: number;
  blocked: number;
  total: number;
}

interface GeoData {
  source_ip: string;
  threats: number;
  percentage: number;
}

interface UserActivityData {
  hour: string;
  active: number;
}

export default function Analytics() {
  const [summary, setSummary] = useState<{ 
    total_traffic: number; 
    total_attacks: number; 
    severity_counts: Record<string, number>;
    attack_type_counts: Record<string, number>;
  } | null>(null);
  
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [detectionRate, setDetectionRate] = useState<DetectionRateData[]>([]);
  const [geoData, setGeoData] = useState<GeoData[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivityData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, t, , dr, gd, ua] = await Promise.all([
          analyticsService.summary(),
          analyticsService.trends(),
          analyticsService.threatTrends(),
          analyticsService.detectionRate(),
          analyticsService.geoDistribution(),
          analyticsService.userActivity()
        ]);

        setSummary(s);
        setTrends(t);
        setDetectionRate(dr);
        setGeoData(gd);
        setUserActivity(ua);
      } catch (err) {
        console.error(err);
        setError('Failed to load analytics data');
      }
    };
    fetchData();
  }, []);

  // Transform Summary Data for Charts
  const threatTypeData = summary ? Object.entries(summary.attack_type_counts).map(([name, value], index) => ({
    name,
    value,
    color: THREAT_COLORS[name.toLowerCase()] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
  })) : [];

  const severityData = summary ? Object.entries(summary.severity_counts).map(([name, value]) => ({
    name,
    value,
    color: SEVERITY_COLORS[name] || '#94a3b8'
  })) : [];

  // If no threat trends data (empty DB), use empty array or placeholder? 
  // Recharts handles empty arrays fine usually.

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
          <p className="text-gray-400">Comprehensive threat intelligence and system analytics (Real-time Data)</p>
        </div>
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            icon={<Shield className="w-6 h-6 text-red-400" />}
            label="Total Threats Detected"
            value={summary ? String(summary.total_attacks) : '—'}
            change={summary && summary.total_traffic > 0 ? `${((summary.total_attacks / summary.total_traffic) * 100).toFixed(1)}%` : '0%'}
            changeType="increase"
            bgGradient="from-red-500/10 to-orange-500/10"
            borderColor="border-red-500/30"
          />
          <MetricCard
            icon={<CheckCircle className="w-6 h-6 text-green-400" />}
            label="Total Traffic"
            value={summary ? String(summary.total_traffic) : '—'}
            change="Live"
            changeType="neutral"
            bgGradient="from-green-500/10 to-emerald-500/10"
            borderColor="border-green-500/30"
          />
          <MetricCard
            icon={<Users className="w-6 h-6 text-cyan-400" />}
            label="Active Users (24h)"
            value={userActivity.length > 0 ? String(userActivity.reduce((acc, curr) => acc + curr.active, 0)) : '0'}
            change="24h"
            changeType="increase"
            bgGradient="from-cyan-500/10 to-blue-500/10"
            borderColor="border-cyan-500/30"
          />
          <MetricCard
            icon={<TrendingUp className="w-6 h-6 text-purple-400" />}
            label="Detection Rate"
            value={detectionRate.length > 0 ? `${detectionRate[detectionRate.length - 1].rate}%` : '—'}
            change="Last Week"
            changeType="increase"
            bgGradient="from-purple-500/10 to-pink-500/10"
            borderColor="border-purple-500/30"
          />
        </div>

        {/* Threat Trends Over Time */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
            <Activity className="w-6 h-6 text-purple-400" />
            <span>Threat Trends Over Time (Last 24h)</span>
          </h2>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="threatsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #a855f7',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="traffic" stroke="#3b82f6" fillOpacity={1} fill="url(#trafficGradient)" name="Total Traffic" />
              <Area type="monotone" dataKey="threats" stroke="#ef4444" fillOpacity={1} fill="url(#threatsGradient)" name="Threats" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Threat Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Type */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Threats by Type</h2>
            {threatTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={threatTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {threatTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #a855f7',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">No threats detected yet</div>
            )}
          </div>

          {/* By Severity */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Threats by Severity</h2>
            {severityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #a855f7',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">No threats detected yet</div>
            )}
          </div>
        </div>

        {/* Detection Rate Trend */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Detection Rate Trend (Weekly)</h2>
          {detectionRate.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={detectionRate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="week" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #a855f7',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} name="Detection Rate %" dot={{ fill: '#10b981', r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">No data available</div>
          )}
        </div>

        {/* Top Threat Sources */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
            <Activity className="w-6 h-6 text-purple-400" />
            <span>Top Threat Sources (IP)</span>
          </h2>
          <div className="space-y-4">
            {geoData.length > 0 ? geoData.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{item.source_ip}</span>
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-400 text-sm">{item.threats} threats</span>
                    <span className="text-purple-400 font-semibold">{item.percentage}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            )) : (
              <div className="flex items-center justify-center h-[100px] text-gray-500">No threat source data available</div>
            )}
          </div>
        </div>

        {/* User Activity Pattern */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
            <Clock className="w-6 h-6 text-purple-400" />
            <span>User Activity Pattern (24h)</span>
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #a855f7',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Bar dataKey="active" fill="url(#barGradient)" name="Active Users" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AdminLayout>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  bgGradient: string;
  borderColor: string;
}

function MetricCard({ icon, label, value, change, changeType, bgGradient, borderColor }: MetricCardProps) {
  const changeIcon = changeType === 'increase' ? <TrendingUp className="w-4 h-4" /> : changeType === 'decrease' ? <AlertTriangle className="w-4 h-4" /> : null;
  const changeColor = changeType === 'increase' ? 'text-green-400' : changeType === 'decrease' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className={`bg-gradient-to-br ${bgGradient} backdrop-blur-sm border ${borderColor} rounded-xl p-6 hover:shadow-lg transition-all`}>
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-slate-900/50 rounded-lg">
          {icon}
        </div>
        {changeIcon && (
          <div className={`flex items-center space-x-1 ${changeColor} text-sm font-semibold`}>
            {changeIcon}
            <span>{change}</span>
          </div>
        )}
      </div>
      <h3 className="text-gray-400 text-sm mb-2">{label}</h3>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
