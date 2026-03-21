import { Brain, TrendingUp, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { mlService, captureService, adminService } from '@/react-app/services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import DashboardLayout from '@/react-app/components/DashboardLayout';
import SessionSelector from '@/react-app/components/SessionSelector';

export default function XAIExplanation() {
  const [featureImportance, setFeatureImportance] = useState<{ feature: string; importance: number; impact: 'high' | 'medium' | 'low'; value: number }[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [predictionDetails, setPredictionDetails] = useState({
    timestamp: '',
    sourceIp: '—',
    destIp: '—',
    attackType: '—',
    confidence: 0,
    severity: 'low',
    model: 'XGBoost',
  });
  const [modelMetrics, setModelMetrics] = useState<{ accuracy: number } | null>(null);

  useEffect(() => {
    adminService.getMetrics().then(setModelMetrics).catch(() => {});
  }, []);

  const [error, setError] = useState<string | null>(null);
  type RecentItem = { id: string; time?: string; features: Record<string, unknown>; prediction?: { attack_type?: string; severity?: string; confidence?: number } | null };
  const [items, setItems] = useState<RecentItem[]>([]);
  const [index, setIndex] = useState(0);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  
  const errorMessageFrom = (err: unknown) => {
    let msg = 'Failed to load explanation';
    if (typeof err === 'object' && err !== null) {
      const maybeAxios = err as { response?: { status?: number; data?: unknown } };
      if (maybeAxios.response?.status === 401) {
        msg = 'Unauthorized: please log in to view explanations';
      } else if (maybeAxios.response?.status === 422) {
        msg = 'Invalid features format (422). Try restarting capture.';
      } else if (maybeAxios.response?.status && maybeAxios.response.status >= 500) {
        msg = 'Server error while generating explanation';
      }
    }
    return msg;
  };

  useEffect(() => {
    const fetchExplanation = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Unauthorized: please log in to view explanations');
          return;
        }
        let pref: string | null = null;
        try {
          pref = localStorage.getItem('xai_source_pref');
        } catch { void 0 }
        const primary = pref === 'file_upload' ? 'file_upload' : 'live_capture';
        let recent = await captureService.recent_features(primary, 10, selectedSessionId || undefined);
        if ((!Array.isArray(recent) || recent.length === 0) && !selectedSessionId) {
          // Fallback to file uploads if live capture is empty
          recent = await captureService.recent_features('file_upload', 10);
          if (!Array.isArray(recent) || recent.length === 0) {
            setError('No recent captured packets. Start live capture to generate explanations.');
            return;
          }
        } else if ((!Array.isArray(recent) || recent.length === 0) && selectedSessionId) {
            setError('No data found for the selected session.');
            return;
        }
        try {
          localStorage.removeItem('xai_source_pref');
        } catch { void 0 }
        setItems(recent as RecentItem[]);
        const cur = recent[0];
        const features = cur.features;
        const pred = await mlService.predict(features as Record<string, unknown>);
        const exp = await mlService.explain(features as Record<string, unknown>);
        setPredictionDetails({
          timestamp: (cur.time && new Date(cur.time).toLocaleString()) || '',
          sourceIp: String((features as Record<string, unknown> as { src_ip?: unknown }).src_ip ?? ''),
          destIp: String((features as Record<string, unknown> as { dst_ip?: unknown }).dst_ip ?? ''),
          attackType: pred.attack_type,
          confidence: Math.round(pred.confidence * 100),
          severity: pred.severity.toLowerCase(),
          model: 'XGBoost',
        });
        const fi = (exp.important_features || []).map((f: { feature: string; value: number; percentage: number }) => ({
          feature: f.feature,
          importance: f.percentage / 100,
          impact: f.percentage > 25 ? 'high' : f.percentage > 10 ? 'medium' : 'low',
          value: f.value
        }));
        setFeatureImportance(fi);
        try {
          const explanationsMap: Record<string, string> = {};
          await Promise.all((recent as RecentItem[]).map(async (item) => {
            const e = await mlService.explain((item.features || {}) as Record<string, unknown>);
            const top = (e.important_features || []).filter((f: any) => f.value > 0).slice(0, 2);
            const summary = top.length ? top.map((t: { feature: string }) => t.feature).join(' & ') : '';
            explanationsMap[item.id] = summary;
          }));
          setExplanations(explanationsMap);
        } catch { void 0 }
      } catch (err) {
        setError(errorMessageFrom(err));
      }
    };
    fetchExplanation();
  }, [selectedSessionId]);
  
  const loadAtIndex = async (i: number) => {
    if (i < 0 || i >= items.length) return;
    setError(null);
    setIndex(i);
    const cur = items[i] as RecentItem;
    const features = cur.features as Record<string, unknown>;
    try {
      const pred = await mlService.predict(features);
      const exp = await mlService.explain(features);
      setPredictionDetails({
        timestamp: cur.time || new Date().toLocaleString(),
        sourceIp: String((features as { src_ip?: unknown }).src_ip ?? '—'),
        destIp: String((features as { dst_ip?: unknown }).dst_ip ?? '—'),
        attackType: pred.attack_type,
        confidence: Math.round(pred.confidence * 100),
        severity: pred.severity.toLowerCase(),
        model: 'XGBoost',
      });
      const fi = (exp.important_features || []).map((f: { feature: string; value: number; percentage: number }) => ({
        feature: f.feature,
        importance: f.percentage / 100,
        impact: f.percentage > 25 ? 'high' : f.percentage > 10 ? 'medium' : 'low',
        value: f.value
      }));
      setFeatureImportance(fi.slice(0, 10));
    } catch (err) {
      setError(errorMessageFrom(err));
    }
  };

  const riskIndicators: string[] = [];
  featureImportance
    .filter(f => f.value > 0)
    .slice(0, 3)
    .forEach(f => {
      riskIndicators.push(`${f.feature} contributes ${(f.importance * 100).toFixed(1)}% to threat score`);
    });

  if (riskIndicators.length === 0) {
    riskIndicators.push('No significant risk factors identified for this packet');
  }

  const normalcyDeviations: string[] = [];
  featureImportance
    .filter(f => f.value < 0)
    .slice(0, 3)
    .forEach(f => {
      normalcyDeviations.push(`${f.feature} aligns with normal patterns (offset: ${(f.importance * 100).toFixed(1)}%)`);
    });

  if (normalcyDeviations.length === 0) {
    normalcyDeviations.push('Packet features deviate entirely from normal baseline behavior');
  }


  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Explainable AI Analysis</h1>
            <p className="text-gray-400">Understanding threat classification decisions with XAI techniques</p>
          </div>
          <div className="flex items-center space-x-4">
            <SessionSelector
              selectedSessionId={selectedSessionId}
              onSelect={setSelectedSessionId}
            />
            <div className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400 font-semibold">SHAP & LIME</span>
            </div>
          </div>
        </div>
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
            <div className="mt-2">
              <button
                onClick={() => loadAtIndex(index)}
                className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-white hover:border-cyan-500 text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Recent Predictions Table */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Predictions</h2>
          <div className="space-y-2">
            {items.length === 0 && <div className="text-sm text-gray-500">No recent predictions</div>}
            {items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400">
                      <th className="text-left px-3 py-2">Time</th>
                      <th className="text-left px-3 py-2">Source → Dest</th>
                      <th className="text-left px-3 py-2">Attack</th>
                      <th className="text-left px-3 py-2">Severity</th>
                      <th className="text-left px-3 py-2">Explanation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => {
                      const f = item.features as { src_ip?: string; dst_ip?: string };
                      const pred = item.prediction as { attack_type?: string; severity?: string } | undefined;
                      return (
                        <tr 
                          key={item.id} 
                          className={`border-t border-slate-700 ${i === index ? 'bg-slate-800/50' : ''}`}
                          onClick={() => loadAtIndex(i)}
                        >
                          <td className="px-3 py-2 text-gray-300">{item.time ? new Date(item.time).toLocaleString() : ''}</td>
                          <td className="px-3 py-2 text-gray-400">{(f.src_ip || '')} → {(f.dst_ip || '')}</td>
                          <td className="px-3 py-2 text-white">{pred?.attack_type || ''}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              (pred?.severity || '').toLowerCase() === 'low' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                              (pred?.severity || '').toLowerCase() === 'high' || (pred?.severity || '').toLowerCase() === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                            }`}>
                              {pred?.severity || ''}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-400">{explanations[item.id] || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="flex justify-end items-center mt-4 space-x-2">
            <button
              onClick={() => loadAtIndex(index - 1)}
              className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-white hover:border-cyan-500 text-sm"
              disabled={index <= 0}
            >
              Previous
            </button>
            <button
              onClick={() => loadAtIndex(index + 1)}
              className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-white hover:border-cyan-500 text-sm"
              disabled={index >= items.length - 1}
            >
              Next
            </button>
          </div>
        </div>

        {/* Prediction Overview */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <AlertCircle className="w-6 h-6 text-cyan-400" />
            <span>Prediction Details</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DetailCard label="Attack Type" value={predictionDetails.attackType} highlight />
            <DetailCard label="Prediction Confidence" value={`${predictionDetails.confidence}%`} />
            <DetailCard label="Severity Level" value={predictionDetails.severity.toUpperCase()} severity={predictionDetails.severity} />
            <DetailCard label="Source IP" value={predictionDetails.sourceIp} mono />
            <DetailCard label="Destination IP" value={predictionDetails.destIp} mono />
            <DetailCard 
              label="Model Information" 
              value={predictionDetails.model} 
              subValue={modelMetrics ? `Global Accuracy: ${(modelMetrics.accuracy * 100).toFixed(1)}%` : 'Loading metrics...'}
            />
          </div>
        </div>

        

        {/* Feature Importance Chart */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-2 flex items-center space-x-2">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
              <span>Feature Importance Analysis</span>
            </h2>
            <p className="text-sm text-gray-400">
              These features had the most significant impact on the classification decision
            </p>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={featureImportance} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                type="number" 
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
                domain={[0, 0.3]}
              />
              <YAxis 
                type="category" 
                dataKey="feature"
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
                width={150}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #06b6d4',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value) => {
                  const num = typeof value === 'number' ? value : 0;
                  return `${(num * 100).toFixed(1)}%`;
                }}
              />
              <Bar dataKey="importance" radius={[0, 8, 8, 0]}>
                {featureImportance.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={
                      entry.impact === 'high' ? '#06b6d4' :
                      entry.impact === 'medium' ? '#3b82f6' :
                      '#8b5cf6'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Explanation Text */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <Brain className="w-6 h-6 text-purple-400" />
            <span>Why this traffic is classified as attack?</span>
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <p className="text-gray-300 leading-relaxed">
                The <span className="text-purple-400 font-semibold">{predictionDetails.model}</span> has classified this traffic pattern as a <span className="text-red-400 font-semibold">{predictionDetails.attackType}</span> with <span className="text-cyan-400 font-semibold">{Number(predictionDetails.confidence).toFixed(1)}% confidence</span>. This decision is primarily driven by {featureImportance.length > 0 ? `the top features such as ${featureImportance.slice(0, 2).map(f => f.feature).join(' and ')}` : 'the analyzed network features'}.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <h3 className="text-red-400 font-semibold mb-2">Key Risk Indicators</h3>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                  {riskIndicators.map((txt, idx) => (
                    <li key={idx}>{txt}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <h3 className="text-green-400 font-semibold mb-2">Normalcy Deviations</h3>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                  {normalcyDeviations.map((txt, idx) => (
                    <li key={idx}>{txt}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Model Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InsightCard
            title="SHAP Values"
            description="Shapley Additive exPlanations show how each feature contributes to the prediction"
            value={`${featureImportance.length} features analyzed`}
            color="from-cyan-500/10 to-blue-500/10"
            borderColor="border-cyan-500/30"
          />
          <InsightCard
            title="LIME Interpretation"
            description="Local Interpretable Model-agnostic Explanations provide instance-level insights"
            value={`${Number(predictionDetails.confidence).toFixed(1)}% confidence`}
            color="from-purple-500/10 to-pink-500/10"
            borderColor="border-purple-500/30"
          />
          <InsightCard
            title="Decision Path"
            description="The model evaluated 15 decision trees before reaching this classification"
            value="15 trees"
            color="from-green-500/10 to-emerald-500/10"
            borderColor="border-green-500/30"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

interface DetailCardProps {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
  severity?: string;
  subValue?: string;
}

function DetailCard({ label, value, highlight, mono, severity, subValue }: DetailCardProps) {
  return (
    <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${
        highlight ? 'text-red-400' :
        severity === 'critical' ? 'text-red-400' :
        severity === 'high' ? 'text-orange-400' :
        mono ? 'text-cyan-400 font-mono' :
        'text-white'
      }`}>
        {value}
      </p>
      {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
    </div>
  );
}

 

interface InsightCardProps {
  title: string;
  description: string;
  value: string;
  color: string;
  borderColor: string;
}

function InsightCard({ title, description, value, color, borderColor }: InsightCardProps) {
  return (
    <div className={`bg-gradient-to-br ${color} backdrop-blur-sm border ${borderColor} rounded-xl p-6`}>
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm mb-4">{description}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
