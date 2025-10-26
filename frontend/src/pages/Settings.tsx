import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { 
  Mail, 
  Lock, 
  Image as ImageIcon, 
  Trash2, 
  ArrowLeft,
  UserCircle,
  Globe,
  FileText,
  Save,
  AlertTriangle,
  UserPlus
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import apiClient from '../services/api';

type SettingsSection = 'profile' | 'account' | 'settings';

const AVATAR_OPTIONS = [
  { id: 'avatar-1', emoji: '😊', name: 'Happy' },
  { id: 'avatar-2', emoji: '😎', name: 'Cool' },
  { id: 'avatar-3', emoji: '🤓', name: 'Nerdy' },
  { id: 'avatar-4', emoji: '😺', name: 'Cat' },
  { id: 'avatar-5', emoji: '🐶', name: 'Dog' },
  { id: 'avatar-6', emoji: '🦊', name: 'Fox' },
  { id: 'avatar-7', emoji: '🐼', name: 'Panda' },
  { id: 'avatar-8', emoji: '🦁', name: 'Lion' },
  { id: 'avatar-9', emoji: '🐻', name: 'Bear' },
  { id: 'avatar-10', emoji: '🐨', name: 'Koala' },
  { id: 'avatar-11', emoji: '🐯', name: 'Tiger' },
  { id: 'avatar-12', emoji: '🦄', name: 'Unicorn' },
];

export default function Settings() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const { success: showSuccessToast, error: showErrorToast } = useToastStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Account settings state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Profile settings state
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarUrl || 'avatar-1');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [country, setCountry] = useState(user?.country || '');

  // Settings state
  const [allowFriendRequests, setAllowFriendRequests] = useState(user?.settings?.allowFriendRequests ?? true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(user?.settings?.showOnlineStatus ?? true);

  // Load initial data
  useEffect(() => {
    if (user) {
        console.log(user)
      setSelectedAvatar(user.avatarUrl || 'avatar-1');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setCountry(user.country || '');
      setAllowFriendRequests(user.settings?.allowFriendRequests ?? true);
      setShowOnlineStatus(user.settings?.showOnlineStatus ?? true);
    }
  }, [user]);

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmText === 'DELETE') {
      // TODO: Implement account deletion API call
      console.log('Account deleted');
      setShowDeleteConfirmModal(false);
      setShowDeleteModal(false);
      showSuccessToast('Account deleted successfully');
      // Logout and redirect
    }
  };

  const handleSaveAccount = async () => {
    if (!currentPassword || !newPassword) {
      showErrorToast('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      showErrorToast('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      showErrorToast('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.changePassword(currentPassword, newPassword);
      showSuccessToast('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.updateMyProfile({
        username: username !== user?.username ? username : undefined,
        avatarUrl: selectedAvatar !== user?.avatarUrl ? selectedAvatar : undefined,
        bio: bio !== user?.bio ? bio : undefined,
        country: country !== user?.country ? country : undefined,
      });

      if (response.success && response.data) {
        setUser(response.data as any);
        showSuccessToast('Profile updated successfully!');
      }
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.updateUserSettings({
        allowFriendRequests,
        showOnlineStatus,
      });

      if (response.success && response.data) {
        // Update user settings in auth store
        if (user) {
          setUser({
            ...user,
            settings: response.data as any,
          });
        }
        showSuccessToast('Settings saved successfully!');
      }
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full bg-background-primary flex flex-col overflow-hidden">
      {/* Top Bar with Back Button */}
      <div className="h-16 bg-background-secondary border-b border-default flex items-center px-6 flex-shrink-0">
        <button
          onClick={() => navigate({ to: '/dashboard' })}
          className="p-2 -ml-2 rounded-lg hover:bg-background-tertiary text-secondary-text hover:text-primary-text transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-primary-text font-primary ml-3">Settings</h1>
      </div>

      {/* Tab Navigation - Similar to Dashboard */}
      <div className="bg-background-secondary border-b border-subtle flex-shrink-0 px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSection('profile')}
            className={`px-4 py-2 rounded-lg font-primary font-medium transition-colors ${
              activeSection === 'profile'
                ? 'bg-primary text-black'
                : 'text-secondary-text hover:text-primary-text hover:bg-background-tertiary'
            }`}
          >
            <UserCircle className="w-4 h-4 inline mr-2" />
            Profile
          </button>
          
          <button
            onClick={() => setActiveSection('account')}
            className={`px-4 py-2 rounded-lg font-primary font-medium transition-colors ${
              activeSection === 'account'
                ? 'bg-primary text-black'
                : 'text-secondary-text hover:text-primary-text hover:bg-background-tertiary'
            }`}
          >
            <Lock className="w-4 h-4 inline mr-2" />
            Account
          </button>

          <button
            onClick={() => setActiveSection('settings')}
            className={`px-4 py-2 rounded-lg font-primary font-medium transition-colors ${
              activeSection === 'settings'
                ? 'bg-primary text-black'
                : 'text-secondary-text hover:text-primary-text hover:bg-background-tertiary'
            }`}
          >
            <UserPlus className="w-4 h-4 inline mr-2" />
            Preferences
          </button>
        </div>
      </div>

      {/* Main Content - Centered */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8 space-y-6">
          {/* Account Section */}
          {activeSection === 'account' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-bold text-primary-text font-primary mb-2">Account Settings</h2>
                <p className="text-secondary-text font-primary">Manage your account preferences and security</p>
              </div>

              {/* Email Card - Read Only */}
              <div className="bg-background-secondary border border-default rounded-xl p-6 space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary-text font-primary">Email</h3>
                    <p className="text-sm text-secondary-text font-primary">Your registered email address</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-text font-primary mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-3 bg-background-tertiary/50 border border-default rounded-lg text-muted-text cursor-not-allowed font-primary"
                  />
                  <p className="text-xs text-muted-text font-primary mt-2">Email cannot be changed</p>
                </div>
              </div>

              {/* Password Card */}
              <div className="bg-background-secondary border border-default rounded-xl p-6 space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary-text font-primary">Password</h3>
                    <p className="text-sm text-secondary-text font-primary">Change your password</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-text font-primary mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-4 py-3 bg-background-tertiary border border-default rounded-lg text-primary-text focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,255,0,0.1)] transition-all font-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-text font-primary mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-4 py-3 bg-background-tertiary border border-default rounded-lg text-primary-text focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,255,0,0.1)] transition-all font-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-text font-primary mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-3 bg-background-tertiary border border-default rounded-lg text-primary-text focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,255,0,0.1)] transition-all font-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveAccount}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-6 py-3 bg-primary hover:bg-primary/90 text-black font-primary font-semibold rounded-lg transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-bold text-primary-text font-primary mb-2">Profile Settings</h2>
                <p className="text-secondary-text font-primary">Customize your profile appearance</p>
              </div>

              {/* Avatar Selection Card */}
              <div className="bg-background-secondary border border-default rounded-xl p-6 space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary-text font-primary">Avatar</h3>
                    <p className="text-sm text-secondary-text font-primary">Choose your profile avatar</p>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-3">
                  {AVATAR_OPTIONS.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatar(avatar.id)}
                      data-tooltip-id="avatar-tooltip"
                      data-tooltip-content={avatar.name}
                      className={`aspect-square rounded-xl text-4xl flex items-center justify-center transition-all duration-200 ${
                        selectedAvatar === avatar.id
                          ? 'bg-primary/20 border-2 border-primary shadow-lg shadow-primary/20 scale-105'
                          : 'bg-background-tertiary border-2 border-transparent hover:border-primary/30 hover:scale-105'
                      }`}
                    >
                      {avatar.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Username Card */}
              <div className="bg-background-secondary border border-default rounded-xl p-6 space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary-text font-primary">Username</h3>
                    <p className="text-sm text-secondary-text font-primary">Update your display name</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-text font-primary mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-background-tertiary border border-default rounded-lg text-primary-text focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,255,0,0.1)] transition-all font-primary"
                  />
                </div>
              </div>

              {/* Bio Card */}
              <div className="bg-background-secondary border border-default rounded-xl p-6 space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary-text font-primary">Bio</h3>
                    <p className="text-sm text-secondary-text font-primary">Tell others about yourself</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-text font-primary mb-2">
                    About Me
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    maxLength={200}
                    className="w-full px-4 py-3 bg-background-tertiary border border-default rounded-lg text-primary-text focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,255,0,0.1)] transition-all font-primary resize-none"
                    placeholder="Write a short bio..."
                  />
                  <div className="text-xs text-muted-text font-primary mt-2 text-right">
                    {bio.length}/200 characters
                  </div>
                </div>
              </div>

              {/* Country Card */}
              <div className="bg-background-secondary border border-default rounded-xl p-6 space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary-text font-primary">Country</h3>
                    <p className="text-sm text-secondary-text font-primary">Where are you from?</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-text font-primary mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-4 py-3 bg-background-tertiary border border-default rounded-lg text-primary-text focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,255,0,0.1)] transition-all font-primary"
                    placeholder="e.g., United States"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-6 py-3 bg-primary hover:bg-primary/90 text-black font-primary font-semibold rounded-lg transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-bold text-primary-text font-primary mb-2">Preferences</h2>
                <p className="text-secondary-text font-primary">Customize your VoiceFlow experience</p>
              </div>

              {/* Friend Requests Card */}
              <div className="bg-background-secondary border border-default rounded-xl p-6 space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary-text font-primary">Friend Requests</h3>
                    <p className="text-sm text-secondary-text font-primary">Control who can send you friend requests</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-background-tertiary transition-colors cursor-pointer">
                    <div>
                      <div className="text-primary-text font-primary font-medium">Allow Friend Requests</div>
                      <div className="text-sm text-secondary-text font-primary">Allow others to send you friend requests</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={allowFriendRequests}
                      onChange={(e) => setAllowFriendRequests(e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-default bg-background-tertiary checked:bg-primary checked:border-primary transition-colors cursor-pointer" 
                    />
                  </label>
                </div>
              </div>

              {/* Privacy Card */}
              <div className="bg-background-secondary border border-default rounded-xl p-6 space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary-text font-primary">Privacy</h3>
                    <p className="text-sm text-secondary-text font-primary">Control your privacy settings</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-background-tertiary transition-colors cursor-pointer">
                    <div>
                      <div className="text-primary-text font-primary font-medium">Show Online Status</div>
                      <div className="text-sm text-secondary-text font-primary">Let others see when you're online</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={showOnlineStatus}
                      onChange={(e) => setShowOnlineStatus(e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-default bg-background-tertiary checked:bg-primary checked:border-primary transition-colors cursor-pointer" 
                    />
                  </label>
                </div>
              </div>

              {/* Delete Account Card */}
              <div className="bg-background-secondary border border-error/20 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-error/10 rounded-lg flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-error" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-error font-primary">Danger Zone</h3>
                    <p className="text-sm text-secondary-text font-primary">Permanently delete your account</p>
                  </div>
                </div>
                <p className="text-secondary-text font-primary mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="flex items-center space-x-2 px-4 py-2 bg-error/10 hover:bg-error/20 text-error border border-error/20 font-primary font-medium rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Account</span>
                </button>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-6 py-3 bg-primary hover:bg-primary/90 text-black font-primary font-semibold rounded-lg transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fadeIn">
          <div className="bg-background-secondary border border-error/20 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-error" />
              </div>
              <h3 className="text-2xl font-bold text-error font-primary">Delete Account?</h3>
            </div>
            <p className="text-secondary-text font-primary mb-6">
              This action cannot be undone. All your data, messages, and settings will be permanently deleted.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setShowDeleteConfirmModal(true);
                }}
                className="flex-1 px-4 py-3 bg-error hover:bg-error/90 text-white font-primary font-semibold rounded-lg transition-all"
              >
                Continue
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-3 bg-background-tertiary hover:bg-background-tertiary/80 text-primary-text font-primary font-semibold rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fadeIn">
          <div className="bg-background-secondary border border-error/20 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-error" />
              </div>
              <h3 className="text-2xl font-bold text-error font-primary">Final Confirmation</h3>
            </div>
            <p className="text-secondary-text font-primary mb-4">
              To confirm deletion, please type <span className="text-error font-bold">DELETE</span> in the field below:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-4 py-3 bg-background-tertiary border border-default rounded-lg text-primary-text focus:outline-none focus:border-error focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)] transition-all font-primary mb-6"
              placeholder="Type DELETE"
            />
            <div className="flex space-x-3">
              <button
                onClick={handleConfirmDelete}
                disabled={deleteConfirmText !== 'DELETE'}
                className="flex-1 px-4 py-3 bg-error hover:bg-error/90 text-white font-primary font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Forever
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 px-4 py-3 bg-background-tertiary hover:bg-background-tertiary/80 text-primary-text font-primary font-semibold rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip for Avatar Selection */}
      <Tooltip 
        id="avatar-tooltip" 
        place="top"
        style={{
          backgroundColor: '#1e1e1e',
          color: '#ccff00',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '14px',
          fontWeight: '500',
          zIndex: 99999,
        }}
      />
    </div>
  );
}
