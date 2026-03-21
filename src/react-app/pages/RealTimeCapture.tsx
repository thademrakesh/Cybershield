import { useState, useEffect, useRef } from 'react';
import { Activity, Play, Square, Wifi, Server, Upload, FileText, CheckCircle } from 'lucide-react';
import DashboardLayout from '@/react-app/components/DashboardLayout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { captureService, mlService } from '../services/api';

type NetInterface = { id: string; name: string; active?: boolean };
type RecentPacket = {
  id: string;
  time?: string;
  interface?: string;
  protocol?: string;
  service?: string;
  src_ip?: string;
  dst_ip?: string;
  src_bytes?: number;
  dst_bytes?: number;
  attack_type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Normal' | string;
};

// Mock data for live traffic chart
const generateData = () => {
  return Array.from({ length: 20 }, (_, i) => ({
    time: i,
    packets: Math.floor(Math.random() * 500) + 100,
    bytes: Math.floor(Math.random() * 1000) + 500,
  }));
};

type AnalysisResult = {
  attack_type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Normal';
  confidence: number;
};

export default function RealTimeCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isOwner, setIsOwner] = useState(true);
  const [interfaces, setInterfaces] = useState<NetInterface[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>('');
  const [chartData, setChartData] = useState(generateData());
  const [stats, setStats] = useState({
    packetsCaptured: 0,
    packetsDropped: 0,
    dataRate: '0 MB/s',
    duration: '00:00:00'
  });
  const [error, setError] = useState('');
  const [recentPackets, setRecentPackets] = useState<RecentPacket[]>([]);
  const [bpfFilter, setBpfFilter] = useState<string>('');

  // File Upload State
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'complete'>('idle');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll for capture status
  useEffect(() => {
    const fetchInterfaces = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Unauthorized: please log in to access interfaces');
          return;
        }
        const data = await captureService.interfaces();
        const raw = (data?.interfaces || []) as unknown[];
        const def: string | undefined = data?.default;
        let mapped: NetInterface[] = [];
        if (raw.length && typeof raw[0] === 'string') {
          mapped = (raw as string[]).map((id) => ({ id, name: id + (def && id === def ? ' (Active)' : ''), active: def ? id === def : false }));
        } else {
          mapped = raw.map((itf) => {
            if (typeof itf === 'object' && itf !== null) {
              const o = itf as { id?: string; name?: string; description?: string };
              const id = o.id ?? o.name ?? String(itf);
              const desc = (o.description ?? o.name ?? '').toLowerCase();
              let base = o.name ?? o.description ?? id;
              if (/wi-?fi|wifi|wireless|wlan|802\.11|wireless lan/.test(desc)) base = 'Wi‑Fi';
              else if (/ethernet|local area connection|gbe family|network connection/.test(desc)) base = 'Ethernet';
              else if (/virtualbox/.test(desc)) base = 'VirtualBox';
              const isActive = !!(def && id === def);
              const name = base + (isActive ? (/wi-?fi|wifi|wireless|wlan|802\.11|wireless lan/.test(desc) ? ' (Connected)' : ' (Active)') : '');
              return { id, name, active: isActive };
            }
            const id = String(itf);
            const name = id + (def && id === def ? ' (Active)' : '');
            return { id, name, active: def ? id === def : false };
          });
        }
        // Removed the filter that required NPF_ prefix because IDs are opaque.
        // Also we trust the backend to send relevant interfaces.
        const list = mapped;
        setInterfaces(list);
        if (!selectedInterface) {
          if (def && list.find(i => i.id === def)) {
            setSelectedInterface(def);
          } else if (list.length) {
            setSelectedInterface(list[0].id);
          }
        }
      } catch (e: unknown) {
        console.error('Failed to fetch interfaces', e);
        setError('Failed to fetch interfaces. Please ensure you are logged in.');
      }
    };
    fetchInterfaces();
  }, [selectedInterface]);
  
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const status = await captureService.status();
        setIsCapturing(status.is_running);
        setIsOwner(status.is_owner);
        if (status.is_running) {
          setStats(prev => ({ ...prev, packetsCaptured: status.packets_captured }));
        }
      } catch (err) {
        console.error("Failed to check initial status", err);
      }
    };
    checkInitialStatus();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isCapturing && isOwner) {
      interval = setInterval(async () => {
        try {
          const status = await captureService.status();
          setIsCapturing(status.is_running);
          setIsOwner(status.is_owner);
          
          if (!status.is_owner) {
            setError('Capture is being performed by another analyst.');
            return;
          }

          setStats(prev => ({
            ...prev,
            packetsCaptured: status.packets_captured,
            dataRate: `${(Math.random() * 2 + 1).toFixed(1)} MB/s` // Mock rate for now
          }));
          
          // Update chart
          setChartData(prev => {
            const newData = [...prev.slice(1), {
              time: prev[prev.length - 1].time + 1,
              packets: Math.floor(Math.random() * 100) + 50, // Visualize activity
              bytes: Math.floor(Math.random() * 500) + 200,
            }];
            return newData;
          });

          const recent = await captureService.recent(5);
          setRecentPackets(Array.isArray(recent) ? recent : []);
        } catch (err) {
          console.error("Failed to fetch capture status", err);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isCapturing]);

  const toggleCapture = async () => {
    if (!isOwner && isCapturing) {
      setError('You cannot stop a capture started by another analyst.');
      return;
    }
    try {
      setError('');
      if (isCapturing) {
        await captureService.stop();
        setIsCapturing(false);
      } else {
        await captureService.start(selectedInterface, bpfFilter || undefined);
        setIsCapturing(true);
      }
    } catch (err: unknown) {
      console.error(err);
      setError('Failed to toggle capture. Backend might be unreachable.');
      setIsCapturing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploadStatus('uploading');
    setAnalysisResult(null);
    
    try {
      const result = await mlService.upload(file);
      setAnalysisResult(result);
      setUploadStatus('complete');
      try {
        localStorage.setItem('xai_source_pref', 'file_upload');
      } catch { void 0 }
    } catch (err) {
      console.error("Analysis failed", err);
      setError('File upload failed. Ensure backend is running and file is valid CSV.');
      setUploadStatus('idle');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Traffic Capture & Analysis</h1>
            <p className="text-gray-400">Real-time packet capture and historical log analysis</p>
          </div>
          <div className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
            isCapturing 
              ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
              : 'bg-slate-800 border border-slate-700 text-gray-400'
          }`}>
            <div className={`w-3 h-3 rounded-full ${isCapturing ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
            <span className="font-semibold uppercase">{isCapturing ? 'Live Capture Active' : 'Live Capture Idle'}</span>
          </div>
        </div>

        {/* Two-Column Layout: Live Capture & File Upload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Live Capture Control */}
          <div className="space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6 h-full">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
                <Wifi className="w-5 h-5 text-cyan-400" />
                <span>Live Interface Capture</span>
              </h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Select Interface (Wi‑Fi/Ethernet/VirtualBox)</label>
                  <div className="relative">
                    <select 
                      value={selectedInterface}
                      onChange={(e) => setSelectedInterface(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 appearance-none focus:outline-none focus:border-cyan-500 transition-colors"
                    >
                      {interfaces.map(iface => (
                        <option key={iface.id} value={iface.id}>
                          {iface.name}
                        </option>
                      ))}
                    </select>
                    <Server className="absolute right-3 top-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">BPF Filter</label>
                  <input 
                    type="text" 
                    placeholder="tcp port 80 or udp"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors"
                    value={bpfFilter}
                    onChange={(e) => setBpfFilter(e.target.value)}
                  />
                </div>

                <div className="pt-4 flex items-center space-x-4">
                  {!isCapturing ? (
                    <button 
                      onClick={toggleCapture}
                      className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-cyan-500/20"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>Start Capture</span>
                    </button>
                  ) : (
                    <button 
                      onClick={toggleCapture}
                      className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-red-500/20"
                    >
                      <Square className="w-5 h-5 fill-current" />
                      <span>Stop Capture</span>
                    </button>
                  )}
                </div>
                {error && <p className="text-red-400 text-sm text-center pt-2">{error}</p>}
              </div>
            </div>
          </div>

          {/* Historical Log Upload */}
          <div className="space-y-6">
             <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 h-full">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <span>Analyze Historical Logs</span>
              </h2>

              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  dragActive 
                    ? 'border-purple-500 bg-purple-500/10' 
                    : 'border-slate-700 hover:border-purple-500/50 hover:bg-slate-800/30'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {!file ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                      <Upload className="w-8 h-8 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Drag & drop your log file here</p>
                      <p className="text-sm text-gray-500 mt-1">Supported formats: .csv, .pcap, .json</p>
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-purple-400 hover:text-purple-300 font-medium text-sm"
                    >
                      Browse Files
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    {uploadStatus === 'idle' && (
                      <div className="flex justify-center space-x-3">
                        <button 
                          onClick={() => setFile(null)}
                          className="text-gray-400 hover:text-white text-sm"
                        >
                          Remove
                        </button>
                        <button 
                          onClick={handleUpload}
                          className="text-purple-400 hover:text-purple-300 font-bold text-sm"
                        >
                          Analyze Now
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="hidden" 
                  accept=".csv,.pcap,.json"
                  onChange={handleFileChange}
                />
              </div>

              {/* Upload Progress/Status */}
              {uploadStatus !== 'idle' && (
                <div className="mt-6 space-y-4">
                  {/* ... (existing progress bar logic if any, or simpler) */}
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        uploadStatus === 'complete' ? 'bg-green-500 w-full' : 
                        uploadStatus === 'analyzing' ? 'bg-purple-500 w-2/3 animate-pulse' : 'bg-blue-500 w-1/3'
                      }`}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">
                        {uploadStatus === 'uploading' && 'Uploading...'}
                        {uploadStatus === 'analyzing' && 'Analyzing traffic patterns...'}
                        {uploadStatus === 'complete' && 'Analysis Complete'}
                    </span>
                    {uploadStatus === 'complete' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  </div>

                  {/* Analysis Result */}
                  {analysisResult && (
                    <div className={`mt-4 p-4 rounded-lg border ${
                        analysisResult.severity === 'Normal' ? 'bg-green-500/10 border-green-500/30' : 
                        analysisResult.severity === 'High' || analysisResult.severity === 'Critical' ? 'bg-red-500/10 border-red-500/30' :
                        'bg-yellow-500/10 border-yellow-500/30'
                    }`}>
                        <h3 className="font-bold text-white mb-2">Analysis Result</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-gray-400">Attack Type:</span>
                            <span className="text-white font-mono">{analysisResult.attack_type}</span>
                            <span className="text-gray-400">Severity:</span>
                            <span className={`${
                                analysisResult.severity === 'Normal' ? 'text-green-400' : 
                                analysisResult.severity === 'High' || analysisResult.severity === 'Critical' ? 'text-red-400' :
                                'text-yellow-400'
                            }`}>{analysisResult.severity}</span>
                            <span className="text-gray-400">Confidence:</span>
                            <span className="text-white">{(analysisResult.confidence * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                  )}
                
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      {uploadStatus === 'uploading' && 'Uploading log file...'}
                      {uploadStatus === 'analyzing' && 'Running XGBoost classification...'}
                      {uploadStatus === 'complete' && 'Analysis Complete'}
                    </span>
                    <span className="text-purple-400 font-mono">
                      {uploadStatus === 'uploading' && '45%'}
                      {uploadStatus === 'analyzing' && '82%'}
                      {uploadStatus === 'complete' && '100%'}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        uploadStatus === 'complete' ? 'bg-green-500' : 'bg-purple-500'
                      }`}
                      style={{ 
                        width: uploadStatus === 'uploading' ? '45%' : uploadStatus === 'analyzing' ? '82%' : '100%' 
                      }}
                    />
                  </div>
                  {uploadStatus === 'complete' && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                      <div>
                        <h4 className="text-green-400 font-semibold">Threats Detected</h4>
                        <p className="text-sm text-gray-400 mt-1">
                          Found 3 potential anomalies in uploaded log. <br/>
                          <a href="/threats" className="text-white underline hover:text-green-400">View detailed report</a>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Traffic Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <div className="text-gray-400 text-sm mb-1">Packets Captured</div>
            <div className="text-2xl font-bold text-white font-mono">{stats.packetsCaptured.toLocaleString()}</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <div className="text-gray-400 text-sm mb-1">Packets Dropped</div>
            <div className="text-2xl font-bold text-red-400 font-mono">{stats.packetsDropped}</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <div className="text-gray-400 text-sm mb-1">Data Rate</div>
            <div className="text-2xl font-bold text-cyan-400 font-mono">{stats.dataRate}</div>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Packets</h2>
          <div className="space-y-2">
            {recentPackets.length === 0 && (
              <div className="text-sm text-gray-500">No packets yet</div>
            )}
            {recentPackets.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-400 text-xs">{p.time ? new Date(p.time).toLocaleTimeString() : '-'}</span>
                  <span className="text-white font-mono text-sm">{p.protocol?.toUpperCase() || '-'}</span>
                  <span className="text-gray-400 text-sm">{p.service || 'private'}</span>
                  <span className="text-gray-400 text-xs">{p.src_ip ?? '-'} → {p.dst_ip ?? '-'}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-cyan-400 font-mono text-sm">{p.src_bytes ?? 0}B → {p.dst_bytes ?? 0}B</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    p.severity === 'Normal' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    p.severity === 'High' || p.severity === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  }`}>{p.attack_type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Traffic Visualization */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span>Live Traffic Volume</span>
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPackets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" hide />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #06b6d4',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="packets" 
                  stroke="#06b6d4" 
                  fillOpacity={1} 
                  fill="url(#colorPackets)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
