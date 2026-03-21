import React, { useState, useEffect, useCallback } from 'react';
import { Brain, Upload, RefreshCw, CheckCircle, TrendingUp, Zap, Activity, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdminLayout from '@/react-app/components/AdminLayout';
import { adminService } from '@/react-app/services/api';

interface ModelMetrics {
  accuracy: number;
  f1_score: number;
  train_accuracy?: number;
  train_f1?: number;
  test_samples?: number;
  train_samples?: number;
  validation_status?: string;
  response_time?: number;
  training_size?: number;
  precision?: number;
  recall?: number;
  training_date?: string;
}

// Keep some mock data for the charts for now, as backend only returns current metrics
const trainingHistory = [
  { epoch: 1, loss: 0.45, accuracy: 85.2 },
  { epoch: 5, loss: 0.28, accuracy: 92.1 },
  { epoch: 10, loss: 0.18, accuracy: 95.3 },
  { epoch: 15, loss: 0.12, accuracy: 97.1 },
  { epoch: 20, loss: 0.08, accuracy: 98.2 },
  { epoch: 25, loss: 0.05, accuracy: 98.7 },
];

const featureImportance = [
  { feature: 'Packet Size', importance: 0.28 },
  { feature: 'Protocol Type', importance: 0.22 },
  { feature: 'Port Number', importance: 0.18 },
  { feature: 'Traffic Volume', importance: 0.15 },
  { feature: 'Connection Duration', importance: 0.12 },
  { feature: 'Error Rate', importance: 0.05 },
];

export default function ModelManagement() {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Action States
  const [isTraining, setIsTraining] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<{model?: File, encoders?: File, metrics?: File}>({});

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await adminService.getMetrics();
      setMetrics(data);
    } catch (error) {
      console.error("Failed to fetch metrics", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const handleTrainModel = async () => {
    try {
        setIsTraining(true);
        await adminService.retrainModel();
        alert("Training started in background. Metrics will update upon completion.");
    } catch (error) {
        console.error("Training failed", error);
        alert("Failed to start training");
    } finally {
        setIsTraining(false);
    }
  };

  const handleUploadModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFiles.model) {
        alert("Model file is required");
        return;
    }
    try {
        await adminService.uploadModel(uploadFiles.model, uploadFiles.encoders, uploadFiles.metrics);
        setShowUploadModal(false);
        setUploadFiles({});
        alert("Model uploaded successfully");
        fetchMetrics();
    } catch (error) {
        console.error("Upload failed", error);
        alert("Upload failed");
    }
  };

  // Format metrics for display (multiply by 100 for percentage if they are 0-1)
  // Assuming backend sends 0-1 for accuracy/precision/etc based on trainer.py
  const formatMetric = (val?: number) => val ? (val * 100).toFixed(1) : "0.0";

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-white text-xl animate-pulse">Loading Model Management...</div>
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
            <h1 className="text-3xl font-bold text-white mb-2">Model Management</h1>
            <p className="text-gray-400">Manage ML models and monitor performance</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 px-4 py-3 bg-slate-800 border border-purple-500/30 text-white rounded-lg hover:bg-slate-700 transition-all"
            >
              <Upload className="w-5 h-5" />
              <span className="font-medium">Upload Model</span>
            </button>
            <button 
              onClick={handleTrainModel}
              disabled={isTraining}
              className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 ${isTraining ? 'animate-spin' : ''}`} />
              <span className="font-medium">{isTraining ? "Training..." : "Train New Model"}</span>
            </button>
          </div>
        </div>

        {/* Active Model Overview */}
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Brain className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Current Model Performance</h2>
                <p className="text-gray-400">
                   Status: {metrics?.validation_status || "Unknown"} | 
                   Last Trained: {metrics?.training_date ? new Date(metrics.training_date).toLocaleDateString() : "N/A"}
                </p>
              </div>
            </div>
            <span className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                metrics?.validation_status === "Overfitting detected" 
                ? "bg-red-500/20 text-red-400 border-red-500/30" 
                : "bg-green-500/20 text-green-400 border-green-500/30"
            }`}>
              {metrics?.validation_status === "Overfitting detected" ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
              <span className="font-semibold">{metrics?.validation_status === "Overfitting detected" ? "Overfitting" : "Healthy"}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={<TrendingUp className="w-5 h-5 text-green-400" />}
              label="Accuracy"
              value={`${formatMetric(metrics?.accuracy)}%`}
              color="green"
            />
            <MetricCard
              icon={<Zap className="w-5 h-5 text-cyan-400" />}
              label="Precision"
              value={`${formatMetric(metrics?.precision)}%`}
              color="cyan"
            />
            <MetricCard
              icon={<Activity className="w-5 h-5 text-purple-400" />}
              label="Recall"
              value={`${formatMetric(metrics?.recall)}%`}
              color="purple"
            />
            <MetricCard
              icon={<Brain className="w-5 h-5 text-pink-400" />}
              label="F1-Score"
              value={`${formatMetric(metrics?.f1_score)}%`}
              color="pink"
            />
          </div>
          
          {metrics?.train_accuracy && (
             <div className="mt-4 pt-4 border-t border-purple-500/20 grid grid-cols-2 gap-4 text-sm text-gray-400">
                <div>Train Accuracy: {formatMetric(metrics.train_accuracy)}%</div>
                <div>Train F1: {formatMetric(metrics.train_f1)}%</div>
             </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Training History Chart */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Training History (Simulated)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trainingHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="epoch" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #7c3aed' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Line type="monotone" dataKey="accuracy" stroke="#8b5cf6" strokeWidth={2} />
                  <Line type="monotone" dataKey="loss" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Feature Importance */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Feature Importance</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureImportance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis dataKey="feature" type="category" stroke="#9ca3af" width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #7c3aed' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="importance" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-purple-500/20 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4">Upload Model Files</h3>
                <form onSubmit={handleUploadModel} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Model File (model.json) *</label>
                        <input 
                            type="file" 
                            accept=".json"
                            onChange={e => setUploadFiles({...uploadFiles, model: e.target.files?.[0]})}
                            className="w-full bg-slate-800 text-white rounded p-2 text-sm border border-slate-700 focus:border-purple-500 focus:outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Encoders File (encoders.pkl)</label>
                        <input 
                            type="file" 
                            accept=".pkl"
                            onChange={e => setUploadFiles({...uploadFiles, encoders: e.target.files?.[0]})}
                            className="w-full bg-slate-800 text-white rounded p-2 text-sm border border-slate-700 focus:border-purple-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Metrics File (metrics.json)</label>
                        <input 
                            type="file" 
                            accept=".json"
                            onChange={e => setUploadFiles({...uploadFiles, metrics: e.target.files?.[0]})}
                            className="w-full bg-slate-800 text-white rounded p-2 text-sm border border-slate-700 focus:border-purple-500 focus:outline-none"
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={() => setShowUploadModal(false)} className="bg-slate-800 hover:bg-slate-700 text-white py-2 px-4 rounded-lg text-sm transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-sm transition-colors">
                            Upload
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </AdminLayout>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorStyles: Record<string, { border: string; bg: string; text: string; badge: string }> = {
    green: { border: 'border-green-500/20', bg: 'bg-green-500/10', text: 'text-green-400', badge: 'bg-green-500/10' },
    cyan: { border: 'border-cyan-500/20', bg: 'bg-cyan-500/10', text: 'text-cyan-400', badge: 'bg-cyan-500/10' },
    purple: { border: 'border-purple-500/20', bg: 'bg-purple-500/10', text: 'text-purple-400', badge: 'bg-purple-500/10' },
    pink: { border: 'border-pink-500/20', bg: 'bg-pink-500/10', text: 'text-pink-400', badge: 'bg-pink-500/10' },
  };

  const styles = colorStyles[color] || colorStyles.cyan;

  return (
    <div className={`bg-slate-800/50 border ${styles.border} p-4 rounded-lg`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 ${styles.bg} rounded-lg`}>
          {icon}
        </div>
        <span className={`text-xs font-medium ${styles.text} ${styles.badge} px-2 py-1 rounded-full`}>
          +2.4%
        </span>
      </div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
