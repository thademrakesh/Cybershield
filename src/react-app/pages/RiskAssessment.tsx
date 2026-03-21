import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Target, 
  Download, 
  TrendingUp,
  Server
} from 'lucide-react';
import AdminLayout from '@/react-app/components/AdminLayout';
import { riskService } from '@/react-app/services/api';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface RiskSummary {
  risk_score: number;
  risk_level: string;
  active_threats: number;
  affected_systems: number;
  risky_sources: number;
}

interface VulnerableHost {
  ip: string;
  total_attacks: number;
  critical_attacks: number;
  risk_score: number;
  status: string;
}

interface RiskySource {
  ip: string;
  attacks_count: number;
  risk_level: string;
  last_seen: string;
}

interface RiskTrend {
  date: string;
  risk_score: number;
}

export default function RiskAssessment() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<RiskSummary>({
    risk_score: 0,
    risk_level: 'Low',
    active_threats: 0,
    affected_systems: 0,
    risky_sources: 0
  });
  const [hosts, setHosts] = useState<VulnerableHost[]>([]);
  const [sources, setSources] = useState<RiskySource[]>([]);
  const [trends, setTrends] = useState<RiskTrend[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryData, hostsData, sourcesData, trendsData] = await Promise.all([
          riskService.getSummary(),
          riskService.getHosts(),
          riskService.getSources(),
          riskService.getTrends()
        ]);
        
        setSummary(summaryData);
        setHosts(hostsData);
        setSources(sourcesData);
        setTrends(trendsData);
      } catch (error) {
        console.error("Failed to fetch risk data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await riskService.export();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Risk_Assessment_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Failed to export risk report');
    } finally {
      setExporting(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return '#ef4444'; // Red
    if (score >= 50) return '#f97316'; // Orange
    if (score >= 20) return '#eab308'; // Yellow
    return '#22c55e'; // Green
  };

  const gaugeData = [
    { name: 'Score', value: summary.risk_score },
    { name: 'Remaining', value: 100 - summary.risk_score }
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-purple-500" />
              Risk Assessment Module
            </h1>
            <p className="text-gray-400">Evaluate threat seriousness and network impact analysis</p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            {exporting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            <span className="font-semibold">Export Report</span>
          </button>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Risk Gauge */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
            <h3 className="text-gray-400 font-medium absolute top-4 left-4">Overall Risk Score</h3>
            <div className="w-48 h-24 mt-8 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gaugeData}
                    cx="50%"
                    cy="100%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    <Cell key="score" fill={getRiskColor(summary.risk_score)} />
                    <Cell key="remaining" fill="#334155" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute bottom-0 left-0 w-full text-center">
                <span className="text-3xl font-bold text-white">{summary.risk_score}</span>
                <span className="text-sm text-gray-400">/100</span>
              </div>
            </div>
            <div className={`mt-2 px-3 py-1 rounded-full text-sm font-medium ${
              summary.risk_level === 'Critical' ? 'bg-red-500/20 text-red-400' :
              summary.risk_level === 'High' ? 'bg-orange-500/20 text-orange-400' :
              summary.risk_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-green-500/20 text-green-400'
            }`}>
              {summary.risk_level} Risk
            </div>
          </div>

          {/* Active Threats */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Active Threats (24h)</h3>
              <Activity className="w-6 h-6 text-purple-400" />
            </div>
            <p className="text-4xl font-bold text-white">{summary.active_threats}</p>
            <p className="text-sm text-gray-500 mt-2">Detected in last 24 hours</p>
          </div>

          {/* Affected Systems */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Affected Systems</h3>
              <Server className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-4xl font-bold text-white">{summary.affected_systems}</p>
            <p className="text-sm text-gray-500 mt-2">Targets under attack</p>
          </div>

          {/* Risky Sources */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Risky Sources</h3>
              <Target className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-4xl font-bold text-white">{summary.risky_sources}</p>
            <p className="text-sm text-gray-500 mt-2">Unique attackers identified</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vulnerable Hosts */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-400" />
              Vulnerable Hosts
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="pb-3 text-sm font-medium text-gray-400">Host IP</th>
                    <th className="pb-3 text-sm font-medium text-gray-400">Risk Score</th>
                    <th className="pb-3 text-sm font-medium text-gray-400">Attacks</th>
                    <th className="pb-3 text-sm font-medium text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {hosts.map((host, index) => (
                    <tr key={index} className="group hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 text-white font-mono">{host.ip}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full" 
                              style={{ 
                                width: `${host.risk_score}%`,
                                backgroundColor: getRiskColor(host.risk_score)
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-300">{host.risk_score}</span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-300">{host.total_attacks}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          host.status === 'Vulnerable' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {host.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {hosts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        No vulnerable hosts detected
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Risky Sources */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-red-400" />
              Top Risky Sources
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="pb-3 text-sm font-medium text-gray-400">Source IP</th>
                    <th className="pb-3 text-sm font-medium text-gray-400">Attacks</th>
                    <th className="pb-3 text-sm font-medium text-gray-400">Risk Level</th>
                    <th className="pb-3 text-sm font-medium text-gray-400">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {sources.map((source, index) => (
                    <tr key={index} className="group hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 text-white font-mono">{source.ip}</td>
                      <td className="py-3 text-gray-300">{source.attacks_count}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          source.risk_level === 'Critical' ? 'bg-red-500/20 text-red-400' :
                          source.risk_level === 'High' ? 'bg-orange-500/20 text-orange-400' :
                          source.risk_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {source.risk_level}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-400">
                        {new Date(source.last_seen).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                  {sources.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        No risky sources detected
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Risk Trend Chart */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Risk Trend (Last 7 Days)
          </h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8' }} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8' }} 
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#f8fafc'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="risk_score" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
