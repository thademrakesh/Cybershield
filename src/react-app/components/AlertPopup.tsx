import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X, Eye, Clock } from 'lucide-react';
import { alertsService } from '@/react-app/services/api';

interface Alert {
  id: string;
  attack: string;
  severity: string;
  timestamp: string;
  status: string;
  details?: {
    sourceIp?: string;
    destIp?: string;
  };
}

export default function AlertPopup() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for alerts immediately and then every 30 seconds
    checkAlerts();
    const interval = setInterval(checkAlerts, 30000); 
    
    return () => clearInterval(interval);
  }, []);

  const checkAlerts = async () => {
    // Check if snoozed
    const snoozeTime = localStorage.getItem('alert_snooze_until');
    if (snoozeTime && new Date().getTime() < parseInt(snoozeTime)) {
      return;
    }

    try {
      const res = await alertsService.getAlerts();
      // Filter for all unacknowledged (New) alerts
      const activeAlerts = (res || []).filter((a: Alert) => 
        a.status.toLowerCase() === 'new'
      );

      if (activeAlerts.length > 0) {
        setAlerts(activeAlerts);
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    } catch (error) {
      console.error('Failed to check alerts', error);
    }
  };

  const handleSeeLater = () => {
    setIsVisible(false);
    // Snooze for 5 minutes
    const snoozeUntil = new Date().getTime() + 5 * 60 * 1000;
    localStorage.setItem('alert_snooze_until', snoozeUntil.toString());
  };

  const handleCheckAlert = () => {
    setIsVisible(false);
    navigate('/alerts');
  };

  if (!isVisible || alerts.length === 0) return null;

  const criticalCount = alerts.filter(a => a.severity?.toLowerCase() === 'critical').length;
  const highCount = alerts.filter(a => a.severity?.toLowerCase() === 'high').length;
  const mediumCount = alerts.filter(a => a.severity?.toLowerCase() === 'medium').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-red-500/50 rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={handleSeeLater}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-red-500/20 rounded-full animate-pulse">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Security Alert Detected!</h2>
            <p className="text-red-400 text-sm font-medium">Immediate attention required</p>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-4 mb-6 space-y-2 border border-slate-700">
            <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Total New Alerts:</span>
                <span className="font-bold text-white">{alerts.length}</span>
            </div>
            {criticalCount > 0 && (
                <div className="flex justify-between items-center text-sm text-red-400">
                    <span>Critical Threats:</span>
                    <span className="font-bold">{criticalCount}</span>
                </div>
            )}
            {highCount > 0 && (
                <div className="flex justify-between items-center text-sm text-orange-400">
                    <span>High Severity:</span>
                    <span className="font-bold">{highCount}</span>
                </div>
            )}
            {mediumCount > 0 && (
                <div className="flex justify-between items-center text-sm text-yellow-400">
                    <span>Medium Severity:</span>
                    <span className="font-bold">{mediumCount}</span>
                </div>
            )}
            <div className="pt-2 border-t border-slate-700 mt-2">
                <p className="text-xs text-gray-400">
                    Latest: {alerts[0].attack} ({alerts[0].severity})
                </p>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleSeeLater}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg transition-colors border border-slate-700"
          >
            <Clock className="w-4 h-4" />
            <span>See Later</span>
          </button>
          <button
            onClick={handleCheckAlert}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-red-900/20"
          >
            <Eye className="w-4 h-4" />
            <span>Check Alerts</span>
          </button>
        </div>
        
        <p className="text-center text-xs text-gray-500 mt-4">
            Reminder set for 5 minutes if snoozed
        </p>
      </div>
    </div>
  );
}
