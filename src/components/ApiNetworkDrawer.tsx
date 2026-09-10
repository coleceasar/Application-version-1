/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Wifi, Radio, Shield, Zap, Globe, RefreshCw, Layers } from 'lucide-react';
import { ApiPacketLog, NetworkType } from '../types';
import { networkService } from '../services/networkManager';

interface ApiNetworkDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentNetwork: NetworkType;
  onNetworkChange: (type: NetworkType) => void;
  queuedCount: number;
  onFlushQueue: () => void;
}

export const ApiNetworkDrawer: React.FC<ApiNetworkDrawerProps> = ({
  isOpen,
  onClose,
  currentNetwork,
  onNetworkChange,
  queuedCount,
  onFlushQueue,
}) => {
  const [logs, setLogs] = useState<ApiPacketLog[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'REST' | 'WSS'>('ALL');

  useEffect(() => {
    const unsubscribe = networkService.subscribeLogs((newLogs) => {
      setLogs(newLogs);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ALL') return true;
    return log.protocol === filter;
  });

  return (
    <div
      id="api-network-drawer-overlay"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        id="api-network-drawer"
        className="w-full max-w-md h-full bg-neutral-900 border-l border-neutral-800 text-neutral-100 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Android Network & Key APIs</h3>
              <p className="text-[11px] text-neutral-400">
                REST API & WebSocket /ws/messages Telemetry
              </p>
            </div>
          </div>
          <button
            id="close-api-drawer-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Network Mode Switcher Control Bar */}
        <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-300 font-medium">Connectivity Manager</span>
            <span className="text-[10px] text-teal-400 flex items-center gap-1 font-mono">
              <Zap className="w-3 h-3 text-teal-400" />
              {currentNetwork === 'OFFLINE'
                ? '0 kbps (Queued)'
                : `${networkService.getLatency()}ms latency`}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 p-1 bg-neutral-900 rounded-xl border border-neutral-800 text-xs">
            {(['5G', 'WIFI', '4G', 'OFFLINE'] as NetworkType[]).map((type) => (
              <button
                key={type}
                id={`network-switch-${type}`}
                type="button"
                onClick={() => onNetworkChange(type)}
                className={`py-1.5 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1 ${
                  currentNetwork === type
                    ? type === 'OFFLINE'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                {type === 'WIFI' && <Wifi className="w-3 h-3" />}
                {type === 'OFFLINE' && <Radio className="w-3 h-3 rotate-45 opacity-60" />}
                <span>{type}</span>
              </button>
            ))}
          </div>

          {/* Queued Outbox Status */}
          {queuedCount > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-300">
                <Layers className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{queuedCount}</strong> message(s) queued in Room DB
                </span>
              </div>
              {currentNetwork !== 'OFFLINE' && (
                <button
                  id="flush-outbox-btn"
                  type="button"
                  onClick={onFlushQueue}
                  className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium text-[11px] flex items-center gap-1 shadow-sm transition-colors"
                >
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Flush Sync
                </button>
              )}
            </div>
          )}
        </div>

        {/* Security / Compliance Badges */}
        <div className="p-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            <span>TLS 1.3 Pinning: <strong>Enforced</strong></span>
          </div>
          <span className="text-teal-400 font-medium">Metadata Minimized</span>
        </div>

        {/* Protocol Filter Tabs */}
        <div className="flex border-b border-neutral-800 px-4 pt-2 gap-2 text-xs bg-neutral-900">
          {(['ALL', 'REST', 'WSS'] as const).map((tab) => (
            <button
              key={tab}
              id={`filter-tab-${tab}`}
              type="button"
              onClick={() => setFilter(tab)}
              className={`pb-2 px-3 border-b-2 font-medium transition-colors ${
                filter === tab
                  ? 'border-teal-400 text-teal-300'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {tab === 'ALL' ? 'All Packets' : tab === 'REST' ? 'REST APIs' : 'WebSocket /ws'}
            </button>
          ))}
        </div>

        {/* Packets Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 font-mono text-[11px]">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      log.protocol === 'WSS'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}
                  >
                    {log.protocol}
                  </span>
                  <span className="font-semibold text-neutral-200">{log.methodOrEvent}</span>
                </div>
                <span
                  className={`text-[10px] font-bold ${
                    log.status === 200 || log.status === 'OK'
                      ? 'text-teal-400'
                      : 'text-amber-400'
                  }`}
                >
                  {log.status}
                </span>
              </div>

              <div className="text-neutral-400 text-[10px] truncate mb-1">
                {log.endpoint}
              </div>

              <p className="font-sans text-neutral-300 text-[11px] leading-relaxed mb-1.5">
                {log.summary}
              </p>

              <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1.5 border-t border-neutral-800/60">
                <span>Latency: {log.latencyMs}ms</span>
                <span>Size: {log.payloadSize}</span>
                <span className="text-teal-400">Zero Plaintext</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-center text-[10px] text-neutral-500 flex items-center justify-center gap-1.5">
          <Globe className="w-3 h-3 text-neutral-400" />
          <span>Compliant with Android 14 Network Security Config & OkHttp Interceptor</span>
        </div>
      </div>
    </div>
  );
};
