import { useState, useEffect, useCallback } from 'react';
import { 
  AlertOctagon, 
  Clock, 
  Filter, 
  Plus, 
  Search, 
  User, 
  Shield, 
  MoreHorizontal,
  FileText,
  Activity,
  AlertTriangle,
  Download
} from 'lucide-react';
import AdminLayout from '@/react-app/components/AdminLayout';
import DashboardLayout from '@/react-app/components/DashboardLayout';
import { incidentsService } from '@/react-app/services/api';

interface IncidentNote {
  content: string;
  author: string;
  timestamp: string;
}

interface IncidentAction {
  action_type: string;
  details: string;
  performed_by: string;
  timestamp: string;
  status: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Investigating' | 'Resolved' | 'Closed';
  created_at: string;
  updated_at: string;
  source_ip?: string;
  target_ip?: string;
  assigned_to?: string;
  notes: IncidentNote[];
  actions: IncidentAction[];
  timeline: { event: string; timestamp: string; details: string }[];
}

export default function IncidentResponse() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';
  const Layout = isAdmin ? AdminLayout : DashboardLayout;
  
  // New Incident Form State
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'Medium',
    source_ip: '',
    target_ip: '',
    assigned_to: ''
  });

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const status = filterStatus === 'All' ? undefined : filterStatus;
      const data = await incidentsService.getIncidents(status);
      setIncidents(data);
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await incidentsService.createIncident(newIncident);
      setIsCreateModalOpen(false);
      setNewIncident({
        title: '',
        description: '',
        severity: 'Medium',
        source_ip: '',
        target_ip: '',
        assigned_to: ''
      });
      fetchIncidents();
    } catch (error) {
      console.error('Failed to create incident:', error);
      alert('Failed to create incident');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await incidentsService.updateIncident(id, { status: newStatus });
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident({ ...selectedIncident, status: newStatus as Incident['status'] });
      }
      fetchIncidents();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !newNote.trim()) return;
    
    try {
      const note = await incidentsService.addNote(selectedIncident.id, newNote);
      // Optimistically update UI
      const updatedNotes = [...selectedIncident.notes, note];
      setSelectedIncident({ ...selectedIncident, notes: updatedNotes });
      setNewNote('');
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handlePerformAction = async (actionType: string) => {
    if (!selectedIncident) return;
    
    let details = '';
    if (actionType === 'block_ip') {
        if (!selectedIncident.source_ip) {
            alert("No Source IP to block");
            return;
        }
        details = `Blocked IP ${selectedIncident.source_ip} on firewall`;
    } else if (actionType === 'isolate_device') {
        if (!selectedIncident.target_ip) {
            alert("No Target IP to isolate");
            return;
        }
        details = `Isolated device ${selectedIncident.target_ip} from network`;
    }

    try {
      const action = await incidentsService.performAction(selectedIncident.id, actionType, details);
      const updatedActions = [...selectedIncident.actions, action];
      setSelectedIncident({ ...selectedIncident, actions: updatedActions });
      alert(`Action ${actionType} performed successfully`);
    } catch (error) {
      console.error('Failed to perform action:', error);
      alert('Failed to perform action');
    }
  };

  const handleExport = async (incident: Incident) => {
    try {
      const blob = await incidentsService.export(incident.id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `incident_report_${incident.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export incident report:', error);
      alert('Failed to export incident report');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'High': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'Medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'Low': return 'text-green-400 bg-green-500/10 border-green-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'text-red-400';
      case 'Investigating': return 'text-yellow-400';
      case 'Resolved': return 'text-green-400';
      case 'Closed': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-500" />
              Incident Response Center
            </h1>
            <p className="text-gray-400">Manage, track, and resolve security incidents</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-lg shadow-red-500/20"
          >
            <Plus className="w-5 h-5" />
            <span>New Incident</span>
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
          {/* Incident List */}
          <div className={`col-span-12 ${selectedIncident ? 'lg:col-span-4' : 'lg:col-span-12'} bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl flex flex-col`}>
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-700/50 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search incidents..." 
                  className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="relative">
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-red-500 appearance-none cursor-pointer"
                >
                  <option value="All">All Status</option>
                  <option value="Open">Open</option>
                  <option value="Investigating">Investigating</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
                <Filter className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                </div>
              ) : incidents.length === 0 ? (
                <div className="text-center p-8 text-gray-500">No incidents found</div>
              ) : (
                incidents.map((incident) => (
                  <div 
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident)}
                    className={`p-4 rounded-lg cursor-pointer transition-all border ${
                      selectedIncident?.id === incident.id 
                        ? 'bg-slate-800 border-red-500/50 shadow-md' 
                        : 'bg-slate-800/30 border-transparent hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-white font-medium truncate pr-4">{incident.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded border ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2 mb-3">{incident.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 ${getStatusColor(incident.status)}`}>
                          <AlertOctagon className="w-3 h-3" />
                          {incident.status}
                        </span>
                        <span>•</span>
                        <span>{new Date(incident.created_at).toLocaleDateString()}</span>
                      </div>
                      {incident.assigned_to && (
                        <div className="flex items-center gap-1 text-gray-400">
                          <User className="w-3 h-3" />
                          {incident.assigned_to}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Incident Detail */}
          {selectedIncident && (
            <div className="col-span-12 lg:col-span-8 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl flex flex-col h-full overflow-hidden">
              {/* Detail Header */}
              <div className="p-6 border-b border-slate-700/50 bg-slate-900/80">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-white">{selectedIncident.title}</h2>
                      <span className={`text-sm px-2.5 py-0.5 rounded border ${getSeverityColor(selectedIncident.severity)}`}>
                        {selectedIncident.severity}
                      </span>
                    </div>
                    <p className="text-gray-400">{selectedIncident.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      value={selectedIncident.status}
                      onChange={(e) => handleUpdateStatus(selectedIncident.id, e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-red-500 cursor-pointer"
                    >
                      <option value="Open">Open</option>
                      <option value="Investigating">Investigating</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                    <button 
                      onClick={() => setSelectedIncident(null)}
                      className="p-2 text-gray-400 hover:text-white lg:hidden"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  {selectedIncident.source_ip && (
                    <div className="flex items-center gap-2 text-gray-300 bg-slate-800 px-3 py-1.5 rounded-md">
                      <Activity className="w-4 h-4 text-red-400" />
                      Source: <span className="font-mono text-white">{selectedIncident.source_ip}</span>
                    </div>
                  )}
                  {selectedIncident.target_ip && (
                    <div className="flex items-center gap-2 text-gray-300 bg-slate-800 px-3 py-1.5 rounded-md">
                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                      Target: <span className="font-mono text-white">{selectedIncident.target_ip}</span>
                    </div>
                  )}
                  {selectedIncident.assigned_to && (
                    <div className="flex items-center gap-2 text-gray-300 bg-slate-800 px-3 py-1.5 rounded-md">
                      <User className="w-4 h-4 text-blue-400" />
                      Assignee: <span className="text-white">{selectedIncident.assigned_to}</span>
                    </div>
                  )}
                </div>

                {/* Actions Toolbar */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {isAdmin && (
                    <>
                      <button 
                        onClick={() => handlePerformAction('block_ip')}
                        disabled={!selectedIncident.source_ip}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        <Shield className="w-4 h-4" />
                        Block Source IP
                      </button>
                      <button 
                        onClick={() => handlePerformAction('isolate_device')}
                        disabled={!selectedIncident.target_ip}
                        className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        <Activity className="w-4 h-4" />
                        Isolate Device
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => handleExport(selectedIncident)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export Report
                  </button>
                </div>
              </div>

              {/* Detail Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* Notes Section */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-400" />
                    Investigation Notes
                  </h3>
                  <div className="space-y-4 mb-4">
                    {selectedIncident.notes.length === 0 ? (
                      <p className="text-gray-500 italic">No notes added yet.</p>
                    ) : (
                      selectedIncident.notes.map((note, idx) => (
                        <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-blue-400">{note.author}</span>
                            <span className="text-xs text-gray-500">{new Date(note.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-300 whitespace-pre-wrap">{note.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <form onSubmit={handleAddNote} className="flex gap-2">
                    <textarea 
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add an investigation note..."
                      className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 resize-none h-20"
                    />
                    <button 
                      type="submit"
                      disabled={!newNote.trim()}
                      className="px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </form>
                </div>

                {/* Timeline Section */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    Incident Timeline
                  </h3>
                  <div className="relative border-l-2 border-slate-700 ml-3 space-y-6">
                    {selectedIncident.timeline && selectedIncident.timeline.length > 0 ? (
                        [...selectedIncident.timeline].reverse().map((event, idx) => (
                        <div key={idx} className="relative pl-6">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-900 border-2 border-blue-500"></div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
                            <span className="text-white font-medium">{event.event}</span>
                            <span className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-400">{event.details}</p>
                        </div>
                        ))
                    ) : (
                         <div className="relative pl-6">
                            <p className="text-gray-500">No events recorded.</p>
                         </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Report New Incident</h2>
            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Incident Title</label>
                <input
                  type="text"
                  required
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  placeholder="e.g., Suspicious Login Activity"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Severity</label>
                  <select
                    value={newIncident.severity}
                    onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Assigned To</label>
                  <input
                    type="text"
                    value={newIncident.assigned_to}
                    onChange={(e) => setNewIncident({ ...newIncident, assigned_to: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                    placeholder="Username (optional)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Source IP</label>
                  <input
                    type="text"
                    value={newIncident.source_ip}
                    onChange={(e) => setNewIncident({ ...newIncident, source_ip: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                    placeholder="192.168.1.100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Target IP</label>
                  <input
                    type="text"
                    value={newIncident.target_ip}
                    onChange={(e) => setNewIncident({ ...newIncident, target_ip: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                    placeholder="10.0.0.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <textarea
                  required
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-red-500 focus:outline-none h-24"
                  placeholder="Describe what happened..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Create Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
