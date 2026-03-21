import { Shield, LayoutDashboard, Activity, Brain, Bell, FileText, User, LogOut, AlertOctagon } from 'lucide-react';
import { Link, useLocation } from 'react-router';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

const userNavItems: NavItem[] = [
  { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', path: '/dashboard' },
  { icon: <Activity className="w-5 h-5" />, label: 'Threat Detection', path: '/threats' },
  { icon: <Shield className="w-5 h-5" />, label: 'Traffic Capture', path: '/capture' },
  { icon: <AlertOctagon className="w-5 h-5" />, label: 'Incidents', path: '/incidents' },
  { icon: <Brain className="w-5 h-5" />, label: 'XAI Explanations', path: '/xai' },
  { icon: <Bell className="w-5 h-5" />, label: 'Alerts', path: '/alerts' },
  { icon: <FileText className="w-5 h-5" />, label: 'Logs & Reports', path: '/logs' },
  { icon: <User className="w-5 h-5" />, label: 'Profile', path: '/profile' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-slate-950 border-r border-cyan-500/20 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-cyan-500/20">
        <Link to="/dashboard" className="flex items-center space-x-2">
          <Shield className="w-8 h-8 text-cyan-400" />
          <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            CyberShield
          </span>
        </Link>
        <p className="text-xs text-gray-500 mt-1">Threat Intelligence</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {userNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:bg-slate-800/50 hover:text-gray-300'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-cyan-500/20">
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }}
          className="flex items-center space-x-3 px-4 py-3 w-full text-gray-400 hover:bg-slate-800/50 hover:text-red-400 rounded-lg transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
