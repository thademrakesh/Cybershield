import { useState, useEffect } from 'react';
import { Bell, Save, AlertTriangle, Mail, Smartphone, Radio, Hash, Globe } from 'lucide-react';
import AdminLayout from '@/react-app/components/AdminLayout';
import { adminService } from '@/react-app/services/api';

export default function AlertConfiguration() {
  const [thresholds, setThresholds] = useState({
    low: 25,
    medium: 50,
    high: 80,
    critical: 95,
  });

  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    slack: false,
    webhook: false
  });

  const [contacts, setContacts] = useState({
    email: '',
    phone: '',
    slackUrl: '',
    webhookUrl: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await adminService.getAlertConfig();
      if (config) {
        if (config.thresholds) setThresholds(config.thresholds);
        // Ensure all keys exist (merge with defaults)
        if (config.notifications) setNotifications(prev => ({ ...prev, ...config.notifications }));
        if (config.contacts) setContacts(prev => ({ ...prev, ...config.contacts }));
      }
    } catch (error) {
      console.error("Failed to load config", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminService.updateAlertConfig({
        thresholds,
        notifications,
        contacts
      });
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error("Failed to save config", error);
      alert('Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <div className="text-white text-xl animate-pulse">Loading Configuration...</div>
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
            <h1 className="text-3xl font-bold text-white mb-2">Alert Configuration</h1>
            <p className="text-gray-400">Configure threat detection thresholds and notification channels</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-lg shadow-purple-500/20 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Save className="w-5 h-5" />
            <span className="font-semibold">{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Severity Thresholds */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <span>Severity Thresholds</span>
            </h2>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-green-400 font-medium">Low Severity Threshold</label>
                  <span className="px-3 py-1 bg-slate-800 rounded-lg text-white font-mono">{thresholds.low}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={thresholds.low}
                  onChange={(e) => setThresholds({...thresholds, low: parseInt(e.target.value)})}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
                <p className="text-xs text-gray-500">Threats with confidence score above this value will be flagged as Low Severity.</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-yellow-400 font-medium">Medium Severity Threshold</label>
                  <span className="px-3 py-1 bg-slate-800 rounded-lg text-white font-mono">{thresholds.medium}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={thresholds.medium}
                  onChange={(e) => setThresholds({...thresholds, medium: parseInt(e.target.value)})}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
                <p className="text-xs text-gray-500">Threats with confidence score above this value will be flagged as Medium Severity.</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-orange-400 font-medium">High Severity Threshold</label>
                  <span className="px-3 py-1 bg-slate-800 rounded-lg text-white font-mono">{thresholds.high}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={thresholds.high}
                  onChange={(e) => setThresholds({...thresholds, high: parseInt(e.target.value)})}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <p className="text-xs text-gray-500">Threats with confidence score above this value will be flagged as High Severity.</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-red-400 font-medium">Critical Severity Threshold</label>
                  <span className="px-3 py-1 bg-slate-800 rounded-lg text-white font-mono">{thresholds.critical}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={thresholds.critical}
                  onChange={(e) => setThresholds({...thresholds, critical: parseInt(e.target.value)})}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
                <p className="text-xs text-gray-500">Threats with confidence score above this value will be flagged as Critical Severity.</p>
              </div>
            </div>
          </div>

          {/* Notification Channels */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
              <Bell className="w-5 h-5 text-purple-400" />
              <span>Notification Channels</span>
            </h2>

            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Email Notifications</h3>
                    <p className="text-sm text-gray-500">Send alerts to registered email</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notifications.email}
                    onChange={(e) => setNotifications({...notifications, email: e.target.checked})}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* SMS */}
              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Smartphone className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">SMS Alerts</h3>
                    <p className="text-sm text-gray-500">Emergency text messages</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notifications.sms}
                    onChange={(e) => setNotifications({...notifications, sms: e.target.checked})}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Push */}
              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-pink-500/20 rounded-lg">
                    <Radio className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Push Notifications</h3>
                    <p className="text-sm text-gray-500">Browser push alerts</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notifications.push}
                    onChange={(e) => setNotifications({...notifications, push: e.target.checked})}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Slack */}
              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Hash className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Slack Notifications</h3>
                    <p className="text-sm text-gray-500">Send alerts to Slack channel</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notifications.slack}
                    onChange={(e) => setNotifications({...notifications, slack: e.target.checked})}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Webhook */}
              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <Globe className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Webhook</h3>
                    <p className="text-sm text-gray-500">POST alerts to custom URL</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notifications.webhook}
                    onChange={(e) => setNotifications({...notifications, webhook: e.target.checked})}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

            </div>
          </div>

          {/* Contact Details */}
          <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
             <h2 className="text-xl font-semibold text-white mb-6">Contact Configuration</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Admin Email</label>
                  <input 
                    type="email" 
                    value={contacts.email}
                    onChange={(e) => setContacts({...contacts, email: e.target.value})}
                    placeholder="admin@example.com"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Emergency Phone</label>
                  <input 
                    type="tel" 
                    value={contacts.phone}
                    onChange={(e) => setContacts({...contacts, phone: e.target.value})}
                    placeholder="+1 (555) ..."
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Slack Webhook URL</label>
                  <input 
                    type="url" 
                    value={contacts.slackUrl}
                    onChange={(e) => setContacts({...contacts, slackUrl: e.target.value})}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Custom Webhook URL</label>
                  <input 
                    type="url" 
                    value={contacts.webhookUrl}
                    onChange={(e) => setContacts({...contacts, webhookUrl: e.target.value})}
                    placeholder="https://api.example.com/alerts"
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
