import { useState, useEffect } from 'react';
import { Search, UserPlus, Edit2, Trash2, Shield, User, CheckCircle, XCircle, Mail, Calendar, X } from 'lucide-react';
import AdminLayout from '@/react-app/components/AdminLayout';
import { adminService } from '@/react-app/services/api';

interface UserData {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  lastLogin: string;
  createdAt: string;
}

interface ApiUser {
  id: string;
  username: string;
  email: string;
  role: string;
  disabled: boolean;
  last_login?: string;
  created_at?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    status: 'active'
  });

  const fetchUsers = async () => {
    try {
      const data = await adminService.getUsers() as ApiUser[];
      const mappedUsers: UserData[] = data.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email || 'N/A',
        role: u.role === 'admin' ? 'admin' : 'user',
        status: u.disabled ? 'inactive' : 'active',
        lastLogin: u.last_login ? new Date(u.last_login).toLocaleString() : 'Never',
        createdAt: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Unknown'
      }));
      setUsers(mappedUsers);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await adminService.deleteUser(userId);
        fetchUsers();
      } catch (error) {
        console.error("Failed to delete user", error);
        alert('Failed to delete user');
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({ username: '', email: '', password: '', role: 'user', status: 'active' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserData) => {
    setEditingUser(user);
    setFormData({ 
      username: user.username, 
      email: user.email, 
      password: '', // Keep empty unless changing
      role: user.role, 
      status: user.status 
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, unknown> = {
        username: formData.username,
        email: formData.email,
        role: formData.role,
        disabled: formData.status === 'inactive'
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (editingUser) {
        await adminService.updateUser(editingUser.id, payload);
      } else {
        if (!formData.password) {
            alert("Password is required for new users");
            return;
        }
        await adminService.createUser(payload);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Failed to save user", error);
      const err = error as { response?: { data?: { detail?: string } } };
      alert(err.response?.data?.detail || "Failed to save user");
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    admins: users.filter(u => u.role === 'admin').length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
            <p className="text-gray-400">Manage user accounts and permissions</p>
          </div>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
          >
            <UserPlus className="w-5 h-5" />
            <span className="font-medium">Add User</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            icon={<User className="w-6 h-6 text-purple-400" />}
            label="Total Users"
            value={stats.total}
            bgGradient="from-purple-500/10 to-pink-500/10"
            borderColor="border-purple-500/30"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6 text-green-400" />}
            label="Active Users"
            value={stats.active}
            bgGradient="from-green-500/10 to-emerald-500/10"
            borderColor="border-green-500/30"
          />
          <StatCard
            icon={<XCircle className="w-6 h-6 text-gray-400" />}
            label="Inactive Users"
            value={stats.inactive}
            bgGradient="from-gray-500/10 to-slate-500/10"
            borderColor="border-gray-500/30"
          />
          <StatCard
            icon={<Shield className="w-6 h-6 text-orange-400" />}
            label="Administrators"
            value={stats.admins}
            bgGradient="from-orange-500/10 to-red-500/10"
            borderColor="border-orange-500/30"
          />
        </div>

        {/* Filters and Search */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'user')}
                className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50 border-b border-purple-500/20">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Last Login</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Created At</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                    <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-400">Loading users...</td>
                    </tr>
                ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                            <div className="text-white font-medium">{user.username}</div>
                            <div className="text-sm text-gray-500 flex items-center space-x-1">
                                <Mail className="w-3 h-3" />
                                <span>{user.email}</span>
                            </div>
                            </div>
                        </div>
                        </td>
                        <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'admin'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                            {user.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                        </td>
                        <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.status === 'active'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                        }`}>
                            {user.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">
                        {user.lastLogin}
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">
                        <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{user.createdAt}</span>
                        </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                            <button 
                                onClick={() => handleOpenEdit(user)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                            >
                            <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                            <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        </td>
                    </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-400">No users found</td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-purple-500/20 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white">
                        {editingUser ? 'Edit User' : 'Add New User'}
                    </h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                        <input
                            type="text"
                            required
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Password {editingUser && <span className="text-xs text-gray-500">(Leave blank to keep current)</span>}
                        </label>
                        <input
                            type="password"
                            required={!editingUser}
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({...formData, role: e.target.value as 'user' | 'admin'})}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4 space-x-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 font-medium shadow-lg transition-all"
                        >
                            {editingUser ? 'Update User' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </AdminLayout>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  bgGradient: string;
  borderColor: string;
}

function StatCard({ icon, label, value, bgGradient, borderColor }: StatCardProps) {
  return (
    <div className={`bg-gradient-to-br ${bgGradient} backdrop-blur-sm border ${borderColor} rounded-xl p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-slate-900/50 rounded-lg">
          {icon}
        </div>
      </div>
      <h3 className="text-gray-400 text-sm mb-2">{label}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
