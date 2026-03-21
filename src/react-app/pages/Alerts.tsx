import { useEffect, useState } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle2, Clock, Filter, Brain, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import DashboardLayout from '@/react-app/components/DashboardLayout';
import { alertsService, mlService } from '@/react-app/services/api';
import SessionSelector from '@/react-app/components/SessionSelector';

interface BackendAlert {
  id: string;
  attack: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  timestamp: string;
  status: string;
  details?: {
    description?: string;
    sourceIp?: string;
    destIp?: string;
    protocol?: string;
    port?: number;
    [key: string]: unknown;
  };
  features?: Record<string, unknown>;
}

export default function Alerts() {
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<BackendAlert[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchAlerts = async () => {
      try {
        const res = await alertsService.getAlerts(selectedSessionId || undefined);
        if (mounted) setAlerts(res || []);
      } catch {
        setError('Failed to load alerts');
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [selectedSessionId]);

  const refreshAlerts = async () => {
    try {
      const res = await alertsService.getAlerts(selectedSessionId || undefined);
      setAlerts(res || []);
    } catch {
      setError('Failed to refresh alerts');
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const severityType = alert.severity?.toLowerCase() === 'critical' ? 'critical'
      : alert.severity?.toLowerCase() === 'high' ? 'high'
      : alert.severity?.toLowerCase() === 'medium' ? 'medium'
      : alert.severity?.toLowerCase() === 'low' ? 'success'
      : 'info';
    const matchesType = selectedType === 'all' || severityType === selectedType;
    const matchesStatus = selectedStatus === 'all' || alert.status.toLowerCase() === selectedStatus;
    return matchesType && matchesStatus;
  });

  const activeCount = alerts.filter(a => a.status.toLowerCase() === 'new').length;
  const criticalCount = alerts.filter(a => a.severity.toLowerCase() === 'critical' && a.status.toLowerCase() === 'new').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Security Alerts</h1>
            <p className="text-gray-400">Monitor and manage system security notifications</p>
          </div>
          <button
            onClick={async () => {
              try {
                await Promise.all(alerts.map(a => alertsService.acknowledge(a.id, selectedSessionId || undefined)));
                const res = await alertsService.getAlerts(selectedSessionId || undefined);
                setAlerts(res || []);
              } catch {
                setError('Failed to acknowledge alerts');
              }
            }}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Acknowledge All</span>
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
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <span className="text-xs text-red-400 font-semibold">URGENT</span>
            </div>
            <p className="text-2xl font-bold text-white">{criticalCount}</p>
            <p className="text-sm text-gray-400">Critical Alerts</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-4">
            <Bell className="w-6 h-6 text-yellow-400 mb-2" />
            <p className="text-2xl font-bold text-white">{activeCount}</p>
            <p className="text-sm text-gray-400">Active Alerts</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-4">
            <Info className="w-6 h-6 text-cyan-400 mb-2" />
            <p className="text-2xl font-bold text-white">{alerts.length}</p>
            <p className="text-sm text-gray-400">Total Alerts</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-green-500/30 rounded-xl p-4">
            <CheckCircle2 className="w-6 h-6 text-green-400 mb-2" />
            <p className="text-2xl font-bold text-white">{alerts.filter(a => a.status === 'resolved').length}</p>
            <p className="text-sm text-gray-400">Resolved</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <SessionSelector
            selectedSessionId={selectedSessionId}
            onSelect={setSelectedSessionId}
          />
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            >
              <option value="all">All Types</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
            </select>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onRefresh={refreshAlerts} />
          ))}
        </div>

        {filteredAlerts.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No alerts match your current filters</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function AlertCard({ alert, onRefresh, sessionId }: { alert: BackendAlert; onRefresh: () => void; sessionId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [explanation, setExplanation] = useState<{ 
    shap_values: Record<string, number>;
    percentage_values?: Record<string, number>;
  } | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  useEffect(() => {
    const fetchExplanation = async () => {
      if (explanation || !alert.features) return;
      setLoadingExplanation(true);
      try {
        const res = await mlService.explain(alert.features);
        setExplanation(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingExplanation(false);
      }
    };

    if (expanded && alert.features && !explanation) {
      fetchExplanation();
    }
  }, [expanded, alert.features, explanation]);

  const typeConfig = {
    critical: {
      icon: <AlertTriangle className="w-5 h-5" />,
      bgColor: 'from-red-500/10 to-orange-500/10',
      borderColor: 'border-red-500/30',
      iconColor: 'text-red-400',
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
    high: {
      icon: <AlertTriangle className="w-5 h-5" />,
      bgColor: 'from-orange-500/10 to-yellow-500/10',
      borderColor: 'border-orange-500/30',
      iconColor: 'text-orange-400',
      badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    },
    medium: {
      icon: <AlertTriangle className="w-5 h-5" />,
      bgColor: 'from-yellow-500/10 to-amber-500/10',
      borderColor: 'border-yellow-500/30',
      iconColor: 'text-yellow-400',
      badgeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    },
    warning: { // Fallback/Legacy
      icon: <AlertTriangle className="w-5 h-5" />,
      bgColor: 'from-yellow-500/10 to-orange-500/10',
      borderColor: 'border-yellow-500/30',
      iconColor: 'text-yellow-400',
      badgeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    },
    info: {
      icon: <Info className="w-5 h-5" />,
      bgColor: 'from-cyan-500/10 to-blue-500/10',
      borderColor: 'border-cyan-500/30',
      iconColor: 'text-cyan-400',
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    },
    success: {
      icon: <CheckCircle2 className="w-5 h-5" />,
      bgColor: 'from-green-500/10 to-emerald-500/10',
      borderColor: 'border-green-500/30',
      iconColor: 'text-green-400',
      badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30',
    },
  };

  const statusLabel = alert.status.toLowerCase() === 'new' ? 'Active'
    : alert.status.toLowerCase() === 'acknowledged' ? 'Acknowledged'
    : alert.status.toLowerCase() === 'resolved' ? 'Resolved'
    : alert.status;
  const statusColor = alert.status.toLowerCase() === 'new' ? 'bg-red-500/20 text-red-400 border-red-500/30'
    : alert.status.toLowerCase() === 'acknowledged' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    : 'bg-green-500/20 text-green-400 border-green-500/30';

  const severityType = alert.severity.toLowerCase() === 'critical' ? 'critical'
    : alert.severity.toLowerCase() === 'high' ? 'high'
    : alert.severity.toLowerCase() === 'medium' ? 'medium'
    : alert.severity.toLowerCase() === 'low' ? 'success'
    : 'info';
  const config = typeConfig[severityType as keyof typeof typeConfig] || typeConfig.info;

  return (
    <div className={`bg-gradient-to-br ${config.bgColor} backdrop-blur-sm border ${config.borderColor} rounded-xl p-6 hover:shadow-lg transition-all`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          <div className={`p-3 bg-slate-900/50 rounded-lg ${config.iconColor}`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-white font-semibold text-lg">{alert.attack}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${config.badgeColor}`}>
                {alert.severity.toUpperCase()}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-gray-400 mb-3">{alert.details?.description || 'Security alert generated by detection engine'}</p>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>{new Date(alert.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-cyan-400">{alert.details?.sourceIp || 'Unknown IP'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          {alert.status.toLowerCase() === 'new' && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await alertsService.acknowledge(alert.id, sessionId);
                await onRefresh();
              }}
              className="px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-all text-sm font-medium"
            >
              Acknowledge
            </button>
          )}
          <button 
            onClick={() => setExpanded(!expanded)}
            className="px-4 py-2 bg-slate-800/50 text-gray-400 border border-slate-700/50 rounded-lg hover:bg-slate-800 transition-all text-sm font-medium flex items-center space-x-1"
          >
            <span>Details</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-white font-medium flex items-center space-x-2">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Alert Details</span>
              </h4>
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Source IP</span>
                  <span className="text-white font-mono">{alert.details?.sourceIp || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Destination IP</span>
                  <span className="text-white font-mono">{alert.details?.destIp || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Protocol</span>
                  <span className="text-white font-mono">{alert.details?.protocol || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Port</span>
                  <span className="text-white font-mono">{alert.details?.port || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-white font-medium flex items-center space-x-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span>XAI Analysis</span>
              </h4>
              <div className="bg-slate-900/50 rounded-lg p-4 text-sm min-h-[140px]">
                {loadingExplanation ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Analyzing threat patterns...
                  </div>
                ) : explanation ? (
                  <div className="space-y-3">
                    <p className="text-gray-300 text-xs">Top contributing factors to this detection:</p>
                    {explanation.shap_values && Object.entries(explanation.shap_values)
                      .sort(([,a], [,b]) => Math.abs(b as number) - Math.abs(a as number))
                      .slice(0, 3)
                      .map(([feature, value], idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-gray-400 truncate max-w-[150px]">{feature}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${Number(value) > 0 ? 'bg-red-500' : 'bg-blue-500'}`}
                                style={{ 
                                  width: `${explanation.percentage_values ? 
                                    Math.min(explanation.percentage_values[feature], 100) : 
                                    Math.min(Math.abs(Number(value)) * 100, 100)}%` 
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-12 text-right">
                              {explanation.percentage_values ? 
                                `${explanation.percentage_values[feature].toFixed(1)}%` : 
                                Number(value).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    {alert.features ? 'Click details to load analysis' : 'No feature data available for XAI analysis'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
