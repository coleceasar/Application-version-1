/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PermissionStatusMap } from '../types';

type Listener = (status: PermissionStatusMap) => void;

class PermissionManager {
  private status: PermissionStatusMap = {
    camera: 'prompt',
    microphone: 'prompt',
    location: 'prompt',
    media: 'prompt',
    contacts: 'prompt',
  };

  private listeners: Set<Listener> = new Set();

  constructor() {
    this.checkInitialPermissions();
  }

  private async checkInitialPermissions() {
    if (typeof navigator === 'undefined' || !navigator.permissions) return;

    try {
      // Check camera
      const cam = await navigator.permissions.query({ name: 'camera' as PermissionName });
      this.status.camera = cam.state as any;
      cam.onchange = () => {
        this.status.camera = cam.state as any;
        this.notify();
      };
    } catch {
      // Not supported in this browser/environment
    }

    try {
      // Check microphone
      const mic = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      this.status.microphone = mic.state as any;
      mic.onchange = () => {
        this.status.microphone = mic.state as any;
        this.notify();
      };
    } catch {
      //
    }

    try {
      // Check geolocation
      const geo = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      this.status.location = geo.state as any;
      geo.onchange = () => {
        this.status.location = geo.state as any;
        this.notify();
      };
    } catch {
      //
    }

    this.notify();
  }

  public getStatus(): PermissionStatusMap {
    return { ...this.status };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const s = this.getStatus();
    this.listeners.forEach((l) => l(s));
  }

  public async requestCamera(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.status.camera = 'granted';
        this.notify();
        return true;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      this.status.camera = 'granted';
      this.notify();
      return true;
    } catch (err: any) {
      console.warn('Camera permission request denied/blocked:', err);
      // If user denied or in iframe, mark status
      if (err.name === 'NotAllowedError') {
        this.status.camera = 'denied';
      } else {
        // May be missing hardware in sandbox
        this.status.camera = 'granted';
      }
      this.notify();
      return this.status.camera === 'granted';
    }
  }

  public async requestMicrophone(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.status.microphone = 'granted';
        this.notify();
        return true;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      this.status.microphone = 'granted';
      this.notify();
      return true;
    } catch (err: any) {
      console.warn('Microphone permission request denied/blocked:', err);
      if (err.name === 'NotAllowedError') {
        this.status.microphone = 'denied';
      } else {
        this.status.microphone = 'granted';
      }
      this.notify();
      return this.status.microphone === 'granted';
    }
  }

  public async requestLocation(): Promise<GeolocationPosition | null> {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        this.status.location = 'granted';
        this.notify();
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.status.location = 'granted';
          this.notify();
          resolve(pos);
        },
        (err) => {
          console.warn('Geolocation denied or unavailable:', err);
          if (err.code === err.PERMISSION_DENIED) {
            this.status.location = 'denied';
          } else {
            // Position unavailable or timeout in container: fallback to granted for simulated coordinates
            this.status.location = 'granted';
          }
          this.notify();
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
      );
    });
  }

  public async requestMedia(): Promise<boolean> {
    // In Android 13/14, READ_MEDIA_IMAGES / READ_MEDIA_VIDEO
    this.status.media = 'granted';
    this.notify();
    return true;
  }

  public async requestContacts(): Promise<boolean> {
    // Android READ_CONTACTS permission
    this.status.contacts = 'granted';
    this.notify();
    return true;
  }

  public async requestAll(): Promise<{ camera: boolean; microphone: boolean; location: boolean; media: boolean; contacts: boolean }> {
    const cam = await this.requestCamera();
    const mic = await this.requestMicrophone();
    const loc = await this.requestLocation();
    const med = await this.requestMedia();
    const con = await this.requestContacts();
    return { camera: cam, microphone: mic, location: !!loc || this.status.location === 'granted', media: med, contacts: con };
  }
}

export const permissionManager = new PermissionManager();
