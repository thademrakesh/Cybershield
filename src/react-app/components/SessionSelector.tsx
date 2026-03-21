import { useEffect, useState, useRef } from 'react';
import { sessionsService } from '@/react-app/services/api';
import { ChevronDown, Database, Trash2, Wifi, FileText, RefreshCw, Clock, Activity } from 'lucide-react';

export interface Session {
  id: string;
  type: string;
  start_time: string;
  end_time?: string;
  name: string;
  status: string;
  packet_count?: number;
}

interface SessionSelectorProps {
  onSelect: (sessionId: string | null) => void;
  selectedSessionId: string | null;
  className?: string;
}

export default function SessionSelector({ onSelect, selectedSessionId, className = '' }: SessionSelectorProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await sessionsService.getSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this session? This will delete all associated logs and alerts.')) {
      try {
        await sessionsService.deleteSession(sessionId);
        if (selectedSessionId === sessionId) {
          onSelect(null);
        }
        fetchSessions();
      } catch (error) {
        console.error('Failed to delete session', error);
      }
    }
  };

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-64 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:border-cyan-500/50 transition-colors text-left`}
      >
        <div className="flex items-center space-x-2 overflow-hidden">
          <Database className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span className="text-sm text-gray-200 truncate">
            {selectedSession ? selectedSession.name : 'Current Session (Live/Latest)'}
          </span>
        </div>
        <div className="flex items-center space-x-1">
            {loading && <RefreshCw className="w-3 h-3 text-cyan-500 animate-spin" />}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-2 space-y-1">
            <button
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                !selectedSessionId ? 'bg-cyan-500/10 text-cyan-400' : 'hover:bg-slate-800 text-gray-300'
              }`}
            >
              <div className="p-1.5 bg-cyan-500/20 rounded">
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Current Session</div>
                <div className="text-xs text-gray-500">Live data or latest upload</div>
              </div>
            </button>

            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center justify-between w-full px-3 py-2 rounded-md transition-colors ${
                  selectedSessionId === session.id ? 'bg-cyan-500/10' : 'hover:bg-slate-800'
                }`}
              >
                <button
                  onClick={() => {
                    onSelect(session.id);
                    setIsOpen(false);
                  }}
                  className="flex items-center space-x-3 flex-1 min-w-0"
                >
                  <div className={`p-1.5 rounded ${
                    session.type === 'live_capture' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {session.type === 'live_capture' ? <Wifi className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className={`text-sm font-medium truncate ${
                      selectedSessionId === session.id ? 'text-cyan-400' : 'text-gray-300'
                    }`}>
                      {session.name}
                    </div>
                    <div className="flex items-center text-xs text-gray-500 space-x-2">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(session.start_time).toLocaleDateString()}
                      </span>
                      {session.packet_count !== undefined && (
                        <span>• {session.packet_count} pkts</span>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => handleDelete(e, session.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete Session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {sessions.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                    No saved sessions found
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
