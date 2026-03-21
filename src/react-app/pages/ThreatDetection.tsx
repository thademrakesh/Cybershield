import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Search, Filter } from 'lucide-react';
import DashboardLayout from '@/react-app/components/DashboardLayout';
import { captureService } from '@/react-app/services/api';
import SessionSelector from '@/react-app/components/SessionSelector';

interface BackendAlert {
  id: string;
  attack: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  timestamp: string;
  status: string;
  details?: {
    sourceIp?: string;
    destIp?: string;
    protocol?: string;
    port?: number | string;
  };
}

interface RecentItem {
    id: string;
    time?: string;
    features: {
        src_ip?: string;
        dst_ip?: string;
        protocol_type?: string;
        port?: number | string;
        [key: string]: unknown;
    };
    prediction?: {
        attack_type?: string;
        severity?: string;
        confidence?: number;
    } | null;
}

export default function ThreatDetection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<BackendAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        // Determine source preference (match XAI page)
        let source = 'live_capture';
        try {
            const pref = localStorage.getItem('xai_source_pref');
            if (pref === 'file_upload') source = 'file_upload';
        } catch {
            // ignore localStorage errors
        }

        // Fetch recent features (packets/items) instead of alerts
        const items = await captureService.recent_features(source, 100, selectedSessionId || undefined);
        
        // Filter and map to BackendAlert structure
        const threats = items
            .filter((item: RecentItem) => {
                const type = item.prediction?.attack_type || 'Normal';
                return type !== 'Normal' && type !== 'Benign';
            })
            .map((item: RecentItem) => {
                // Normalize severity to ensure it matches UI expectations
                let sev = item.prediction?.severity || 'Low';
                if (!['Critical', 'High', 'Medium', 'Low'].includes(sev)) {
                    sev = 'Low';
                }

                return {
                    id: item.id,
                    attack: item.prediction?.attack_type || 'Unknown',
                    severity: sev as 'Critical' | 'High' | 'Medium' | 'Low',
                    timestamp: item.time || new Date().toISOString(),
                    status: 'detected', // Lowercase to match StatusBadge keys
                    details: {
                        sourceIp: item.features?.src_ip,
                        destIp: item.features?.dst_ip,
                        protocol: item.features?.protocol_type,
                        port: item.features?.port
                    }
                };
            });

        if (mounted) {
          setAlerts(threats);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load threats from XAI source.');
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [selectedSessionId]);

  const filteredThreats = alerts.filter(threat => {
    const matchesSearch = 
      (threat.details?.sourceIp || '').includes(searchTerm) ||
      (threat.details?.destIp || '').includes(searchTerm) ||
      threat.attack.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = selectedSeverity === 'all' || threat.severity.toLowerCase() === selectedSeverity;
    
    return matchesSearch && matchesSeverity;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Real-Time Threat Detection</h1>
          <p className="text-gray-400">Monitor and analyze network traffic for malicious activity</p>
        </div>
        {loading && (
          <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-gray-400 text-sm">
            Loading alerts…
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-sm border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <span className="text-xs text-red-400 font-semibold">LIVE</span>
            </div>
            <p className="text-2xl font-bold text-white">{filteredThreats.length}</p>
            <p className="text-sm text-gray-400">Active Threats</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-4">
            <Activity className="w-6 h-6 text-cyan-400 mb-2" />
            <p className="text-2xl font-bold text-white">{alerts.length}</p>
            <p className="text-sm text-gray-400">Alerts Fetched</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-green-500/30 rounded-xl p-4">
            <CheckCircle2 className="w-6 h-6 text-green-400 mb-2" />
            <p className="text-2xl font-bold text-white">{Math.max(0, alerts.filter(a => a.severity.toLowerCase() !== 'low').length)}</p>
            <p className="text-sm text-gray-400">Non-Low Severity</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4">
            <Activity className="w-6 h-6 text-purple-400 mb-2" />
            <p className="text-2xl font-bold text-white">{filteredThreats.length}</p>
            <p className="text-sm text-gray-400">Filtered</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4">
          <SessionSelector
            selectedSessionId={selectedSessionId}
            onSelect={setSelectedSessionId}
          />
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by IP address or attack type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Threat Table */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-cyan-500/20">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Source IP
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Destination IP
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Attack Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Protocol
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredThreats.map((threat) => (
                  <tr key={threat.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(threat.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-cyan-400">
                      {threat.details?.sourceIp || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-400">
                      {threat.details?.destIp || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {threat.attack}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <SeverityBadge severity={threat.severity.toLowerCase()} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={threat.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {(threat.details?.protocol || 'N/A') + ':' + (threat.details?.port || 'N/A')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredThreats.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No threats match your current filters</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const severityStyles = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${severityStyles[severity as keyof typeof severityStyles]}`}>
      {severity.toUpperCase()}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusStyles = {
    blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
    detected: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    quarantined: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    monitoring: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusStyles[status as keyof typeof statusStyles]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
