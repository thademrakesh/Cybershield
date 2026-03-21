import { useState, useEffect } from 'react';
import { Server, Database, Save, Globe, Cpu } from 'lucide-react';
import AdminLayout from '@/react-app/components/AdminLayout';
import { adminService } from '@/react-app/services/api';

export default function AdminSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [settings, setSettings] = useState({
    systemName: 'CyberShield XAI Platform',
    maintenanceMode: false,
    debugLogging: true,
    maxConcurrentAnalysis: 10,
    dataRetentionDays: 90,
    autoBackup: true,
    backupFrequency: 'daily',
    apiRateLimit: 1000,
    emailNotifications: true,
    smsNotifications: false,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await adminService.getSystemSettings();
        setSettings(data);
      } catch (error) {
        console.error('Failed to fetch system settings:', error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await adminService.updateSystemSettings(settings);
      alert('System settings saved successfully');
    } catch (error) {
      console.error('Failed to update system settings:', error);
      alert('Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
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
            <h1 className="text-3xl font-bold text-white mb-2">System Settings</h1>
            <p className="text-gray-400">Configure global platform settings and parameters</p>
          </div>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span className="font-semibold">Save Changes</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Configuration */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 space-y-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
              <Globe className="w-5 h-5 text-purple-400" />
              <span>General Configuration</span>
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">System Name</label>
                <input
                  type="text"
                  value={settings.systemName}
                  onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Server className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Maintenance Mode</h3>
                    <p className="text-sm text-gray-500">Disable user access for updates</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Cpu className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Debug Logging</h3>
                    <p className="text-sm text-gray-500">Enable verbose system logs</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.debugLogging}
                    onChange={(e) => setSettings({ ...settings, debugLogging: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Performance & Data */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 space-y-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
              <Database className="w-5 h-5 text-purple-400" />
              <span>Performance & Data</span>
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Max Concurrent Analysis Jobs</label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={settings.maxConcurrentAnalysis}
                    onChange={(e) => setSettings({ ...settings, maxConcurrentAnalysis: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <span className="w-12 text-center bg-slate-800 text-white rounded py-1 font-mono">
                    {settings.maxConcurrentAnalysis}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Data Retention (Days)</label>
                <select
                  value={settings.dataRetentionDays}
                  onChange={(e) => setSettings({ ...settings, dataRetentionDays: parseInt(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days</option>
                  <option value={180}>180 Days</option>
                  <option value={365}>1 Year</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">API Rate Limit (Req/Min)</label>
                <input
                  type="number"
                  value={settings.apiRateLimit}
                  onChange={(e) => setSettings({ ...settings, apiRateLimit: parseInt(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
