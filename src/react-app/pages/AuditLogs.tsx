import { useState, useEffect } from 'react';
import { Search, Download, AlertCircle, CheckCircle, Info, XCircle, Shield, User, Database, Settings, FileText } from 'lucide-react';
import AdminLayout from '@/react-app/components/AdminLayout';
import { auditService } from '@/react-app/services/api';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  status: 'success' | 'failed' | 'warning';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
}

export default function AuditLogs() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'warning'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low' | 'info'>('all');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await auditService.getLogs();
        setAuditLogs(data);
      } catch (error) {
        console.error("Failed to fetch audit logs", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const handleExport = async () => {
    try {
      const blob = await auditService.export();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error("Failed to export audit logs", error);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const stats = {
    total: auditLogs.length,
    success: auditLogs.filter(l => l.status === 'success').length,
    failed: auditLogs.filter(l => l.status === 'failed').length,
    critical: auditLogs.filter(l => l.severity === 'critical').length,
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Audit Logs</h1>
            <p className="text-gray-400">Track all system activities and user actions</p>
          </div>
          <button 
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
          >
            <Download className="w-5 h-5" />
            <span className="font-medium">Export Logs</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            icon={<FileText className="w-6 h-6 text-purple-400" />}
            label="Total Events"
            value={stats.total}
            bgGradient="from-purple-500/10 to-pink-500/10"
            borderColor="border-purple-500/30"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6 text-green-400" />}
            label="Successful"
            value={stats.success}
            bgGradient="from-green-500/10 to-emerald-500/10"
            borderColor="border-green-500/30"
          />
          <StatCard
            icon={<XCircle className="w-6 h-6 text-red-400" />}
            label="Failed"
            value={stats.failed}
            bgGradient="from-red-500/10 to-orange-500/10"
            borderColor="border-red-500/30"
          />
          <StatCard
            icon={<AlertCircle className="w-6 h-6 text-orange-400" />}
            label="Critical"
            value={stats.critical}
            bgGradient="from-orange-500/10 to-red-500/10"
            borderColor="border-orange-500/30"
          />
        </div>

        {/* Filters and Search */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by action, user, or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-purple-500/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'success' | 'failed' | 'warning')}
              className="px-4 py-3 bg-slate-800/50 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="warning">Warning</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as 'all' | 'critical' | 'high' | 'medium' | 'low' | 'info')}
              className="px-4 py-3 bg-slate-800/50 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-purple-500/20">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {log.user === 'system' ? (
                          <Settings className="w-4 h-4 text-gray-400" />
                        ) : (
                          <User className="w-4 h-4 text-cyan-400" />
                        )}
                        <span className="text-white text-sm">{log.user}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getActionIcon(log.action)}
                        <span className="text-white font-medium">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      {log.resource}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${
                        log.status === 'success'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : log.status === 'failed'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {log.status === 'success' && <CheckCircle className="w-3 h-3" />}
                        {log.status === 'failed' && <XCircle className="w-3 h-3" />}
                        {log.status === 'warning' && <AlertCircle className="w-3 h-3" />}
                        <span className="capitalize">{log.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getSeverityStyle(log.severity)}`}>
                        {log.severity.charAt(0).toUpperCase() + log.severity.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-sm font-mono">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Log Details on Hover */}
          {filteredLogs.length > 0 && (
            <div className="border-t border-purple-500/20 p-4 bg-slate-800/30">
              <p className="text-gray-400 text-sm">
                <Info className="w-4 h-4 inline mr-2" />
                Hover over any row to see more details. Click Export Logs to download complete audit trail.
              </p>
            </div>
          )}

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No audit logs found matching your filters</p>
            </div>
          )}
        </div>

        {/* Recent Activity Details */}
        {filteredLogs.length > 0 && (
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Activity Details</h2>
            <div className="space-y-3">
              {filteredLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getActionIcon(log.action)}
                      <span className="text-white font-medium">{log.action}</span>
                    </div>
                    <span className="text-xs text-gray-500">{log.timestamp}</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">{log.details}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>User: {log.user}</span>
                    <span>•</span>
                    <span>IP: {log.ipAddress}</span>
                    <span>•</span>
                    <span>Resource: {log.resource}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  bgGradient: string;
  borderColor: string;
}

function StatCard({ icon, label, value, bgGradient, borderColor }: StatCardProps) {
  return (
    <div className={`bg-gradient-to-br ${bgGradient} backdrop-blur-sm border ${borderColor} rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-3xl font-bold text-white">{value}</span>
      </div>
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  );
}

function getActionIcon(action: string) {
  if (action.includes('Model') || action.includes('Training')) {
    return <Database className="w-4 h-4 text-purple-400" />;
  }
  if (action.includes('User') || action.includes('Login')) {
    return <User className="w-4 h-4 text-cyan-400" />;
  }
  if (action.includes('Security') || action.includes('Alert')) {
    return <Shield className="w-4 h-4 text-orange-400" />;
  }
  return <Settings className="w-4 h-4 text-gray-400" />;
}

function getSeverityStyle(severity: string) {
  switch (severity) {
    case 'critical':
      return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case 'high':
      return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    case 'low':
      return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
    case 'info':
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  }
}
