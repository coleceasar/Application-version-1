/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Download,
  EyeOff,
  Shield,
  KeyRound,
  Activity,
  Radio,
  Camera,
  Mic,
  MapPin,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Smartphone,
  ChevronRight,
  Lock,
  Sparkles,
  Cloud,
  CloudUpload,
  CloudCheck,
  RefreshCw,
  Sun,
  Moon,
  Type,
  FileJson,
  Check,
  ExternalLink,
  LogOut,
  Layers,
  CheckCheck,
  Trash2,
  Database,
} from 'lucide-react';
import { usePWAInstall } from '../services/usePWAInstall';
import { permissionManager } from '../services/permissionManager';
import {
  PermissionStatusMap,
  SettingsSection,
  AppFont,
  AppTheme,
  Contact,
  Message,
  GoogleAccountProfile,
  GoogleDriveBackupFile,
} from '../types';
import {
  initGoogleAuth,
  signInWithGoogle,
  signOutGoogle,
  uploadBackupToGoogleDrive,
  listGoogleDriveBackups,
  exportLocalChatData,
} from '../services/googleDriveService';
import {
  syncAllLocalDataToFirestore,
  testFirestoreConnection,
} from '../services/firebaseService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSecurityAudit: () => void;
  onOpenNetworkDrawer: () => void;
  onActivateStealthMode: () => void;
  onRequestPermissions: () => void;
  currentFont: AppFont;
  onFontChange: (font: AppFont) => void;
  theme: AppTheme;
  onToggleTheme: () => void;
  contacts: Contact[];
  messages: Record<string, Message[]>;
  readReceiptsEnabled?: boolean;
  onToggleReadReceipts?: () => void;
  onResetAppData?: () => void;
}

const FONT_OPTIONS: { id: AppFont; name: string; tag: string; sample: string; className: string }[] = [
  {
    id: 'jakarta',
    name: 'Plus Jakarta Sans',
    tag: 'Android Modern',
    sample: 'Clean geometric curves and high readability',
    className: 'font-app-jakarta',
  },
  {
    id: 'mono',
    name: 'JetBrains Mono',
    tag: 'Cyberpunk / Hacker',
    sample: '0x7F4A Authenticated E2EE Terminal',
    className: 'font-app-mono',
  },
  {
    id: 'cyber',
    name: 'Orbitron',
    tag: 'Sci-Fi Futuristic',
    sample: 'F& E TACTICAL MATRIX',
    className: 'font-app-cyber',
  },
  {
    id: 'serif',
    name: 'Playfair Display',
    tag: 'Editorial Luxury',
    sample: 'Refined classical elegance and contrast',
    className: 'font-app-serif',
  },
  {
    id: 'rounded',
    name: 'Comfortaa',
    tag: 'Friendly Rounded',
    sample: 'Smooth, warm, and approachable geometry',
    className: 'font-app-rounded',
  },
  {
    id: 'sans',
    name: 'System Default',
    tag: 'Standard UI',
    sample: 'Native platform system sans-serif',
    className: 'font-app-sans',
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenSecurityAudit,
  onOpenNetworkDrawer,
  onActivateStealthMode,
  onRequestPermissions,
  currentFont,
  onFontChange,
  theme,
  onToggleTheme,
  contacts,
  messages,
  readReceiptsEnabled = true,
  onToggleReadReceipts,
  onResetAppData,
}) => {
  const [permissions, setPermissions] = useState<PermissionStatusMap>(permissionManager.getStatus());
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showQrCode, setShowQrCode] = useState(false);
  const [secretCode, setSecretCode] = useState('1234');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Google Account & Drive Backup state
  const [googleUser, setGoogleUser] = useState<GoogleAccountProfile | null>(null);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccessInfo, setBackupSuccessInfo] = useState<{ name: string; time: string } | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [driveBackups, setDriveBackups] = useState<GoogleDriveBackupFile[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);

  // Firestore sync state
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);
  const [firestoreSyncSuccess, setFirestoreSyncSuccess] = useState<string | null>(null);
  const [firestoreConnected, setFirestoreConnected] = useState(true);

  useEffect(() => {
    testFirestoreConnection().then(setFirestoreConnected);
  }, []);

  useEffect(() => {
    return permissionManager.subscribe((s) => setPermissions(s));
  }, []);

  useEffect(() => {
    const unsubscribe = initGoogleAuth((user) => {
      setGoogleUser(user);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleGoogleSignIn = async () => {
    setIsSigningInGoogle(true);
    setBackupError(null);
    try {
      const res = await signInWithGoogle();
      if (res?.profile) {
        setGoogleUser(res.profile);
      }
    } catch (err: unknown) {
      setBackupError(err instanceof Error ? err.message : 'Google Sign-in failed');
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogle();
    setGoogleUser(null);
    setDriveBackups([]);
    setBackupSuccessInfo(null);
  };

  const handleBackupToDrive = async () => {
    setIsBackingUp(true);
    setBackupError(null);
    try {
      const result = await uploadBackupToGoogleDrive(contacts, messages);
      setBackupSuccessInfo({
        name: result.name,
        time: new Date().toLocaleTimeString(),
      });
      // Refresh backup list
      const list = await listGoogleDriveBackups();
      setDriveBackups(list);
    } catch (err: unknown) {
      setBackupError(err instanceof Error ? err.message : 'Backup to Google Drive failed');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleLoadDriveBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const list = await listGoogleDriveBackups();
      setDriveBackups(list);
    } catch (err: unknown) {
      setBackupError('Failed to fetch Drive backups');
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleSyncToFirestore = async () => {
    if (!googleUser?.uid) return;
    setIsSyncingFirestore(true);
    setFirestoreSyncSuccess(null);
    setBackupError(null);
    try {
      const res = await syncAllLocalDataToFirestore(googleUser.uid, contacts, messages, []);
      setFirestoreSyncSuccess(
        `Synced ${res.countContacts} contacts & ${res.countMessages} messages to Firestore`
      );
    } catch (err: unknown) {
      setBackupError(err instanceof Error ? err.message : 'Firestore cloud sync failed');
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  const handleLocalExport = () => {
    exportLocalChatData(contacts, messages);
  };

  const getStatusBadge = (status: 'granted' | 'prompt' | 'denied') => {
    if (status === 'granted') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/30">
          <CheckCircle2 className="w-3 h-3" /> Granted
        </span>
      );
    }
    if (status === 'denied') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/30">
          <AlertCircle className="w-3 h-3" /> Denied
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
        Prompt
      </span>
    );
  };

  return (
    <div
      id="settings-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in"
    >
      <div
        id="settings-modal-card"
        className="w-full max-w-lg max-h-[92vh] bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-neutral-100"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">App Settings & Customization</h2>
              <p className="text-xs text-neutral-400">Fonts, Dark Mode, Google Drive & Privacy</p>
            </div>
          </div>
          <button
            id="close-settings-modal-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm">
          {/* Section: Theme & Appearance */}
          <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center">
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-100 text-sm">Theme & Dark Mode</h3>
                  <p className="text-[11px] text-neutral-400">Toggle between Dark and Light mode</p>
                </div>
              </div>
              <button
                id="btn-settings-toggle-theme"
                type="button"
                onClick={onToggleTheme}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-semibold text-white transition-all active:scale-95"
              >
                {theme === 'dark' ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-teal-400" />
                    <span>Dark Mode (Active)</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Light Mode (Active)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section: Messaging & Read Receipts */}
          <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <CheckCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-100 text-sm">Read Receipts</h3>
                  <p className="text-[11px] text-neutral-400">
                    Send & receive blue checkmark confirmations
                  </p>
                </div>
              </div>
              <button
                id="btn-settings-toggle-read-receipts"
                type="button"
                onClick={onToggleReadReceipts}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  readReceiptsEnabled ? 'bg-cyan-500' : 'bg-neutral-800'
                }`}
                role="switch"
                aria-checked={readReceiptsEnabled}
                title={readReceiptsEnabled ? 'Disable read receipts' : 'Enable read receipts'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    readReceiptsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div className="text-[11px] leading-relaxed bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/60">
              {readReceiptsEnabled ? (
                <div className="flex items-start gap-1.5 text-cyan-300">
                  <CheckCheck className="w-3.5 h-3.5 mt-0.5 text-cyan-400 shrink-0" />
                  <span>
                    <strong>Read Receipts Active</strong>: Peers receive real-time WSS read receipts (cyan double checkmarks) when you open their messages.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-1.5 text-neutral-400">
                  <CheckCheck className="w-3.5 h-3.5 mt-0.5 text-neutral-500 shrink-0" />
                  <span>
                    <strong>Read Receipts Disabled</strong>: WSS delivery confirmations will strictly display delivered status (gray double checkmarks). No read alerts or timestamps are transmitted.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Very Cool Fonts */}
          <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center">
                <Type className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-100 text-sm">App Typography & Cool Fonts</h3>
                <p className="text-[11px] text-neutral-400">Choose custom fonts for messaging and interface</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {FONT_OPTIONS.map((f) => {
                const isSelected = currentFont === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onFontChange(f.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-teal-500/15 border-teal-500/50 ring-1 ring-teal-500/30'
                        : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-850 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold text-white ${f.className}`}>
                        {f.name}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-teal-400" />}
                    </div>
                    <span className="text-[10px] text-teal-400/80 font-mono block mt-0.5">
                      {f.tag}
                    </span>
                    <p className={`text-[11px] text-neutral-400 mt-1 line-clamp-1 ${f.className}`}>
                      {f.sample}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Firebase & Cloud Sync */}
          <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-100 text-sm">Firebase & Cloud Sync</h3>
                  <p className="text-[11px] text-neutral-400">Google Firestore database & Drive cloud backup</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-[10px] font-mono text-teal-400 font-medium">Firestore Live</span>
              </div>
            </div>

            {/* Firestore Database Connection Banner */}
            <div className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-neutral-300">
                <Database className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="text-[11px]">Database: <span className="text-teal-300 font-mono">europe-west2</span> (Enterprise Firestore)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
                Connected
              </span>
            </div>

            {/* Google Connection Status */}
            {googleUser ? (
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {googleUser.photoURL ? (
                      <img
                        src={googleUser.photoURL}
                        alt="Google avatar"
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full border border-neutral-700"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-teal-600/30 text-teal-300 font-bold flex items-center justify-center text-xs">
                        G
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-white">{googleUser.displayName}</p>
                      <p className="text-[11px] text-teal-400 font-mono">{googleUser.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleSignOut}
                    className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
                  >
                    <LogOut className="w-3 h-3" /> Disconnect
                  </button>
                </div>

                {/* Cloud & Backup Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSyncingFirestore}
                    onClick={handleSyncToFirestore}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-neutral-950 text-xs font-bold shadow-md transition-all active:scale-95"
                  >
                    {isSyncingFirestore ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Database className="w-3.5 h-3.5" />
                    )}
                    <span>{isSyncingFirestore ? 'Syncing to Firestore...' : 'Sync to Cloud Firestore'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBackingUp}
                    onClick={handleBackupToDrive}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-semibold transition-all active:scale-95"
                  >
                    {isBackingUp ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CloudUpload className="w-3.5 h-3.5 text-teal-400" />
                    )}
                    <span>{isBackingUp ? 'Uploading...' : 'Backup to Drive'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadDriveBackups}
                    disabled={isLoadingBackups}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-medium transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                    <span>List Backups</span>
                  </button>
                </div>

                {firestoreSyncSuccess && (
                  <div className="p-2.5 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center gap-2 text-xs text-teal-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-400" />
                    <span>{firestoreSyncSuccess}</span>
                  </div>
                )}

                {backupSuccessInfo && (
                  <div className="p-2.5 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center gap-2 text-xs text-teal-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-400" />
                    <span>
                      Backup saved to Google Drive at {backupSuccessInfo.time} ({backupSuccessInfo.name})
                    </span>
                  </div>
                )}

                {/* Backups List */}
                {driveBackups.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-neutral-800">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                      Recent Drive Backups ({driveBackups.length})
                    </span>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {driveBackups.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/60 text-xs text-neutral-300"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <CloudCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                            <span className="truncate">{b.name}</span>
                          </div>
                          <span className="text-[10px] text-neutral-500 shrink-0 font-mono">
                            {new Date(b.createdTime).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2.5">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Sign in with your Google Account to automatically sync encrypted chat backups to Google Drive.
                </p>
                <button
                  type="button"
                  id="btn-google-drive-signin"
                  disabled={isSigningInGoogle}
                  onClick={handleGoogleSignIn}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>{isSigningInGoogle ? 'Connecting Google Account...' : 'Sign in with Google'}</span>
                </button>
              </div>
            )}

            {backupError && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{backupError}</span>
              </div>
            )}

            {/* Local Export Option */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Local Encrypted Export</span>
                <span className="text-[10px] text-neutral-400">Download `.json` backup file locally</span>
              </div>
              <button
                type="button"
                id="btn-export-local-chats"
                onClick={handleLocalExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 hover:text-white transition-colors"
              >
                <FileJson className="w-3.5 h-3.5 text-teal-400" />
                <span>Export Chat Data</span>
              </button>
            </div>
          </div>

          {/* Section: Download App on Phone (PWA) */}
          <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-100 text-sm">Download App on Phone</h3>
                  <p className="text-[11px] text-neutral-400">Install native Android / iOS standalone PWA</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowQrCode(!showQrCode)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5 text-teal-400" />
                <span>{showQrCode ? 'Hide Phone QR' : 'Scan Phone QR'}</span>
              </button>

              {isInstallable && (
                <button
                  type="button"
                  onClick={install}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-neutral-950 text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install Web App</span>
                </button>
              )}
            </div>

            {showQrCode && (
              <div className="p-4 bg-white rounded-2xl flex flex-col items-center justify-center space-y-2 animate-in zoom-in-95">
                <div className="w-40 h-40 bg-neutral-900 p-2 rounded-xl flex items-center justify-center">
                  <div className="w-full h-full border-4 border-dashed border-teal-400 flex flex-col items-center justify-center text-center p-2">
                    <QrCode className="w-16 h-16 text-teal-400" />
                    <span className="text-[9px] font-mono text-white mt-1">OPEN ON PHONE</span>
                  </div>
                </div>
                <p className="text-[10px] text-neutral-600 font-mono text-center">
                  Scan with your Android or iPhone camera
                </p>
              </div>
            )}
          </div>

          {/* Section: App Permissions */}
          <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-100 text-sm">Hardware Permissions</h3>
                  <p className="text-[11px] text-neutral-400">Camera, Microphone & Location controls</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2 text-neutral-200">
                  <Camera className="w-4 h-4 text-teal-400" />
                  <div>
                    <div className="font-medium text-xs">Camera Access</div>
                    <div className="text-[10px] text-neutral-400">WebRTC video calling & photo capture</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(permissions.camera)}
                  <button
                    type="button"
                    onClick={async () => {
                      await permissionManager.requestCamera();
                      setPermissions(permissionManager.getStatus());
                    }}
                    className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px]"
                  >
                    Request
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2 text-neutral-200">
                  <Mic className="w-4 h-4 text-teal-400" />
                  <div>
                    <div className="font-medium text-xs">Microphone Access</div>
                    <div className="text-[10px] text-neutral-400">Opus 48kHz encrypted voice calling</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(permissions.microphone)}
                  <button
                    type="button"
                    onClick={async () => {
                      await permissionManager.requestMicrophone();
                      setPermissions(permissionManager.getStatus());
                    }}
                    className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px]"
                  >
                    Request
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2 text-neutral-200">
                  <MapPin className="w-4 h-4 text-teal-400" />
                  <div>
                    <div className="font-medium text-xs">Precise Location</div>
                    <div className="text-[10px] text-neutral-400">Real-time GPS location sharing</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(permissions.location)}
                  <button
                    type="button"
                    onClick={async () => {
                      await permissionManager.requestLocation();
                      setPermissions(permissionManager.getStatus());
                    }}
                    className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px]"
                  >
                    Request
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Security Audit & Network Telemetry Launchers */}
          <div className="grid grid-cols-2 gap-3">
            <button
              id="settings-open-audit-btn"
              type="button"
              onClick={() => {
                onClose();
                onOpenSecurityAudit();
              }}
              className="p-3.5 rounded-2xl bg-neutral-950/80 hover:bg-neutral-800/80 border border-neutral-800 text-left transition-all space-y-1 group active:scale-98"
            >
              <div className="flex items-center justify-between text-teal-400 mb-1">
                <Activity className="w-4 h-4" />
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="font-semibold text-neutral-100 text-xs">Security Audit</div>
              <p className="text-[10px] text-neutral-400 leading-tight">6 automated cryptographic tests</p>
            </button>

            <button
              id="settings-open-network-btn"
              type="button"
              onClick={() => {
                onClose();
                onOpenNetworkDrawer();
              }}
              className="p-3.5 rounded-2xl bg-neutral-950/80 hover:bg-neutral-800/80 border border-neutral-800 text-left transition-all space-y-1 group active:scale-98"
            >
              <div className="flex items-center justify-between text-teal-400 mb-1">
                <Radio className="w-4 h-4" />
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="font-semibold text-neutral-100 text-xs">Network & APIs</div>
              <p className="text-[10px] text-neutral-400 leading-tight">REST / WSS telemetry drawer</p>
            </button>
          </div>
          {/* Section: Delete All App Data (Reset as New) */}
          <div className="p-4 rounded-2xl bg-neutral-950/80 border border-red-900/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-100 text-sm">Delete All App Data</h3>
                  <p className="text-[11px] text-neutral-400">Reset F& E to look completely new</p>
                </div>
              </div>
              <button
                id="btn-settings-delete-all-data"
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-400 transition-all active:scale-95"
              >
                Reset Data
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Clears all local storage, encrypted chat histories, drafts, scheduled messages, locked chats, and settings so F& E looks fresh and brand new.
            </p>

            {showResetConfirm && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 space-y-2 animate-in fade-in">
                <p className="text-xs text-red-200 font-medium">
                  Are you sure you want to delete all app data? This action will reset F& E to a brand new state.
                </p>
                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-delete-all-data-btn"
                    type="button"
                    onClick={() => {
                      setShowResetConfirm(false);
                      if (onResetAppData) {
                        onResetAppData();
                      }
                      onClose();
                    }}
                    className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-xs shadow-md transition-colors active:scale-95"
                  >
                    Yes, Delete Everything
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-between text-[11px] text-neutral-500 shrink-0">
          <span>F& E v2.4.2 (Signal Protocol)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
