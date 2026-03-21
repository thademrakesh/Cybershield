import { useState, useEffect } from 'react';
import { User, Lock, Mail, Shield, Save, Key, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import DashboardLayout from '@/react-app/components/DashboardLayout';
import { authService } from '@/react-app/services/api';

export default function UserProfile() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profile, setProfile] = useState({
    username: '',
    email: '',
    role: '',
    created_at: '',
    profile_image: '',
  });

  const [passwords, setPasswords] = useState({
    new: '',
    confirm: '',
    otp: '',
  });

  const [otpStep, setOtpStep] = useState(1); // 1: Request OTP, 2: Verify & Update
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await authService.getCurrentUser();
        setProfile({
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: new Date(user.created_at).toLocaleDateString(),
          profile_image: user.profile_image || '',
        });
      } catch (err) {
        console.error('Failed to fetch user', err);
      }
    };
    fetchUser();
  }, []);

  const handleSaveProfile = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const updatedUser = await authService.updateProfile({
        username: profile.username,
        email: profile.email,
      });
      setProfile(prev => ({
        ...prev,
        username: updatedUser.username,
        email: updatedUser.email,
      }));
      // Update local storage user data
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, ...updatedUser }));
      
      setSuccess('Profile details updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');
    setSuccess('');
    try {
      const result = await authService.uploadProfileImage(file);
      const imageUrl = result.profile_image;
      
      // Update local state
      setProfile(prev => ({ ...prev, profile_image: imageUrl }));
      
      // Update local storage user data
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, profile_image: imageUrl }));
      
      setSuccess('Profile image updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRequestPasswordOtp = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      await authService.forgotPassword(profile.email);
      setOtpStep(2);
      setSuccess('OTP has been sent to your registered email.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      setError('New passwords do not match');
      return;
    }
    if (passwords.new.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!passwords.otp) {
      setError('Please enter the OTP');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await authService.resetPassword({
        email: profile.email,
        otp: passwords.otp,
        new_password: passwords.new
      });
      setSuccess('Password updated successfully!');
      setPasswords({ new: '', confirm: '', otp: '' });
      setOtpStep(1);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update password. Check your OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">User Profile</h1>
          <p className="text-gray-400">Manage your account settings and preferences</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-emerald-400 text-sm">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1 space-y-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === 'profile'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="font-medium">Profile Details</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === 'security'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Lock className="w-5 h-5" />
              <span className="font-medium">Security</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' ? (
              <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6 space-y-6">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
                  <User className="w-5 h-5 text-cyan-400" />
                  <span>Personal Information</span>
                </h2>

                {/* Avatar Section */}
                <div className="flex items-center space-x-6 pb-6 border-b border-slate-700/50">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-cyan-500/30 flex items-center justify-center overflow-hidden">
                      {profile.profile_image ? (
                        <img 
                          src={`http://localhost:8000${profile.profile_image}`} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-12 h-12 text-cyan-400" />
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 p-2 bg-cyan-500 rounded-full hover:bg-cyan-600 transition-colors cursor-pointer">
                      <Camera className="w-4 h-4 text-slate-900" />
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">{profile.username}</h3>
                    <p className="text-gray-400 uppercase text-xs tracking-widest">{profile.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Username</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={profile.username}
                        onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                      <User className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Email Address</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                      <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Role</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={profile.role}
                        readOnly
                        className="w-full bg-slate-800/50 border border-slate-700 text-gray-400 rounded-lg pl-10 pr-4 py-2.5 cursor-not-allowed"
                      />
                      <Shield className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Member Since</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={profile.created_at}
                        readOnly
                        className="w-full bg-slate-800/50 border border-slate-700 text-gray-400 rounded-lg pl-10 pr-4 py-2.5 cursor-not-allowed"
                      />
                      <Shield className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6 space-y-6">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
                  <Lock className="w-5 h-5 text-cyan-400" />
                  <span>Security Settings</span>
                </h2>

                <div className="space-y-4 max-w-md">
                  {otpStep === 1 ? (
                    <>
                      <p className="text-gray-400 text-sm mb-4">
                        To update your password, we need to verify your identity. An OTP will be sent to <strong>{profile.email}</strong>.
                      </p>
                      <button
                        onClick={handleRequestPasswordOtp}
                        disabled={isLoading}
                        className="flex items-center justify-center space-x-2 w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold rounded-lg transition-all disabled:opacity-50"
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Mail className="w-5 h-5" />
                        )}
                        <span>Send Verification OTP</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">6-Digit OTP</label>
                        <div className="relative">
                          <input
                            type="text"
                            maxLength={6}
                            value={passwords.otp}
                            onChange={(e) => setPasswords({ ...passwords, otp: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-cyan-500 transition-colors tracking-widest font-bold"
                            placeholder="123456"
                          />
                          <Key className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">New Password</label>
                        <div className="relative">
                          <input
                            type="password"
                            value={passwords.new}
                            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-cyan-500 transition-colors"
                            placeholder="••••••••"
                          />
                          <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Confirm New Password</label>
                        <div className="relative">
                          <input
                            type="password"
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-cyan-500 transition-colors"
                            placeholder="••••••••"
                          />
                          <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
                        </div>
                      </div>

                      <div className="pt-4 flex flex-col space-y-3">
                        <button
                          onClick={handleChangePassword}
                          disabled={isLoading}
                          className="flex items-center justify-center space-x-2 w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20"
                        >
                          {isLoading ? (
                            <div className="w-5 h-5 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Save className="w-5 h-5" />
                          )}
                          <span>Update Password</span>
                        </button>
                        <button
                          onClick={() => setOtpStep(1)}
                          className="text-sm text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
