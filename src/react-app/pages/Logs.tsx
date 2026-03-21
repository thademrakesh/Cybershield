import { useEffect, useState } from 'react';
import { FileText, Download, Search, Calendar, Filter } from 'lucide-react';
import DashboardLayout from '@/react-app/components/DashboardLayout';
import { logsService } from '@/react-app/services/api';
import SessionSelector from '@/react-app/components/SessionSelector';

interface BackendLog {
  id: string;
  attack_type: string;
  severity: string;
  timestamp: string;
  user_id?: string;
}

export default function Logs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [logs, setLogs] = useState<BackendLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      const blob = await logsService.export(selectedSessionId || undefined);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${selectedSessionId || 'all'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error('Failed to export logs:', error);
      setError('Failed to export logs');
    }
  };

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await logsService.getLogs(100, selectedSessionId || undefined);
        setLogs(data || []);
      } catch {
        setError('Failed to load logs');
      }
    };
    fetchLogs();
  }, [selectedSessionId]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.attack_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user_id || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || log.attack_type.toLowerCase() !== 'normal';
    const matchesLevel = selectedLevel === 'all' || log.severity.toLowerCase() === selectedLevel;
    
    return matchesSearch && matchesCategory && matchesLevel;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">System Logs & Reports</h1>
            <p className="text-gray-400">Track system events and security incidents</p>
          </div>
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Export Logs</span>
          </button>
        </div>
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-sm border border-red-500/30 rounded-xl p-4">
            <FileText className="w-6 h-6 text-red-400 mb-2" />
            <p className="text-2xl font-bold text-white">{logs.filter(l => l.severity?.toLowerCase() === 'critical').length}</p>
            <p className="text-sm text-gray-400">Critical Severity</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-4">
            <FileText className="w-6 h-6 text-yellow-400 mb-2" />
            <p className="text-2xl font-bold text-white">{logs.filter(l => l.severity?.toLowerCase() === 'high').length}</p>
            <p className="text-sm text-gray-400">High Severity</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-4">
            <FileText className="w-6 h-6 text-cyan-400 mb-2" />
            <p className="text-2xl font-bold text-white">{logs.filter(l => l.severity?.toLowerCase() === 'medium').length}</p>
            <p className="text-sm text-gray-400">Medium Severity</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4">
            <Calendar className="w-6 h-6 text-purple-400 mb-2" />
            <p className="text-2xl font-bold text-white">24h</p>
            <p className="text-sm text-gray-400">Time Range</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <SessionSelector
            selectedSessionId={selectedSessionId}
            onSelect={setSelectedSessionId}
          />
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search logs by message or source..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            >
              <option value="all">All Categories</option>
              <option value="system">System</option>
              <option value="security">Security</option>
              <option value="network">Network</option>
              <option value="audit">Audit</option>
            </select>
          </div>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
          >
            <option value="all">All Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Logs Table */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-cyan-500/20">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Attack Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {log.attack_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <LevelBadge level={log.severity} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-400">
                      {log.user_id || 'system'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No logs match your current filters</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function LevelBadge({ level }: { level: string }) {
  const levelStyles = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${levelStyles[level as keyof typeof levelStyles]}`}>
      {level.toUpperCase()}
    </span>
  );
}
