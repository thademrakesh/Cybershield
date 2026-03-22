import { Shield, LayoutDashboard, Users, Brain, Bell, BarChart3, FileText, LogOut, Settings, ShieldAlert, AlertOctagon } from 'lucide-react';
import { Link, useLocation } from 'react-router';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

const adminNavItems: NavItem[] = [
  { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: <ShieldAlert className="w-5 h-5" />, label: 'Risk Assessment', path: '/admin/risk' },
  { icon: <AlertOctagon className="w-5 h-5" />, label: 'Incident Response', path: '/admin/incidents' },
  { icon: <Users className="w-5 h-5" />, label: 'User Management', path: '/admin/users' },
  { icon: <Brain className="w-5 h-5" />, label: 'Model Management', path: '/admin/models' },
  { icon: <Bell className="w-5 h-5" />, label: 'Alert Configuration', path: '/admin/alert-config' },
  { icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics', path: '/admin/analytics' },
  { icon: <FileText className="w-5 h-5" />, label: 'Audit Logs', path: '/admin/audit' },
  { icon: <Settings className="w-5 h-5" />, label: 'System Settings', path: '/admin/settings' },
];

export default function AdminSidebar() {
  const location = useLocation();

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-slate-950 border-r border-purple-500/20 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-purple-500/20">
        <Link to="/admin/dashboard" className="flex items-center space-x-2">
          <Shield className="w-8 h-8 text-purple-400" />
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            CyberShield
          </span>
        </Link>
        <p className="text-xs text-purple-400 mt-1 font-semibold">Admin Panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {adminNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30'
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
      <div className="p-4 border-t border-purple-500/20">
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
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
