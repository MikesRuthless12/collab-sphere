/**
 * User Preferences Manager
 * Handles persistent storage of user settings across sessions
 */

export interface UserPreferences {
  // Device preferences
  preferredCameraId: string;
  preferredMicId: string;
  preferredSpeakerId: string;

  // Media settings
  isCameraEnabled: boolean;
  isMicEnabled: boolean;
  videoQuality: 'low' | 'medium' | 'high';

  // Visual preferences
  backgroundEffect: 'none' | 'blur' | 'gradient';
  gradientConfig?: {
    type: 'linear' | 'radial';
    angle?: number;
    color1: string;
    color2: string;
  };
  avatarFilter: string;
  virtualBackground: string;

  // Audio preferences
  voicePitch: number;
  voicePreset: string;

  // Feature preferences
  isProfanityFilterEnabled: boolean;
  isLiveCaptionsEnabled: boolean;
  isAutoJoinEnabled: boolean;
  isNotificationsEnabled: boolean;

  // UI preferences
  theme: 'dark' | 'light';
  language: string;
  chatPosition: 'right' | 'bottom';
  videoGridLayout: 'auto' | 'gallery' | 'speaker';

  // Privacy preferences
  allowScreenSharing: boolean;
  allowRecording: boolean;
  showOnlineStatus: boolean;
}

const STORAGE_KEY = 'collab_sphere_preferences';
const DEFAULT_PREFERENCES: UserPreferences = {
  preferredCameraId: '',
  preferredMicId: '',
  preferredSpeakerId: '',
  isCameraEnabled: true,
  isMicEnabled: true,
  videoQuality: 'high',
  backgroundEffect: 'none',
  avatarFilter: 'none',
  virtualBackground: 'none',
  voicePitch: 0,
  voicePreset: 'Default',
  isProfanityFilterEnabled: true,
  isLiveCaptionsEnabled: false,
  isAutoJoinEnabled: false,
  isNotificationsEnabled: true,
  theme: 'dark',
  language: 'en',
  chatPosition: 'right',
  videoGridLayout: 'auto',
  allowScreenSharing: true,
  allowRecording: true,
  showOnlineStatus: true,
};

class UserPreferencesManager {
  private preferences: UserPreferences;

  constructor() {
    this.preferences = this.loadPreferences();
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new preferences in updates
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
    return { ...DEFAULT_PREFERENCES };
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  /**
   * Get all preferences
   */
  getAll(): UserPreferences {
    return { ...this.preferences };
  }

  /**
   * Get a specific preference value
   */
  get<K extends keyof UserPreferences>(key: K): UserPreferences[K] {
    return this.preferences[key];
  }

  /**
   * Set a specific preference value
   */
  set<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): void {
    this.preferences[key] = value;
    this.savePreferences();
  }

  /**
   * Update multiple preferences at once
   */
  update(updates: Partial<UserPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.savePreferences();
  }

  /**
   * Reset to default preferences
   */
  reset(): void {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.savePreferences();
  }

  /**
   * Export preferences as JSON
   */
  export(): string {
    return JSON.stringify(this.preferences, null, 2);
  }

  /**
   * Import preferences from JSON
   */
  import(jsonString: string): boolean {
    try {
      const imported = JSON.parse(jsonString);
      this.preferences = { ...DEFAULT_PREFERENCES, ...imported };
      this.savePreferences();
      return true;
    } catch (error) {
      console.error('Error importing preferences:', error);
      return false;
    }
  }

  /**
   * Clear all preferences (delete from storage)
   */
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.preferences = { ...DEFAULT_PREFERENCES };
  }

  /**
   * Get device preferences
   */
  getDevicePreferences() {
    return {
      cameraId: this.preferences.preferredCameraId,
      micId: this.preferences.preferredMicId,
      speakerId: this.preferences.preferredSpeakerId,
    };
  }

  /**
   * Set device preferences
   */
  setDevicePreferences(
    cameraId: string,
    micId: string,
    speakerId: string
  ): void {
    this.update({
      preferredCameraId: cameraId,
      preferredMicId: micId,
      preferredSpeakerId: speakerId,
    });
  }

  /**
   * Get visual preferences
   */
  getVisualPreferences() {
    return {
      backgroundEffect: this.preferences.backgroundEffect,
      gradientConfig: this.preferences.gradientConfig,
      avatarFilter: this.preferences.avatarFilter,
      virtualBackground: this.preferences.virtualBackground,
    };
  }

  /**
   * Set visual preferences
   */
  setVisualPreferences(
    backgroundEffect: 'none' | 'blur' | 'gradient',
    gradientConfig?: any,
    avatarFilter?: string,
    virtualBackground?: string
  ): void {
    this.update({
      backgroundEffect,
      gradientConfig,
      avatarFilter: avatarFilter || this.preferences.avatarFilter,
      virtualBackground: virtualBackground || this.preferences.virtualBackground,
    });
  }

  /**
   * Get audio preferences
   */
  getAudioPreferences() {
    return {
      voicePitch: this.preferences.voicePitch,
      voicePreset: this.preferences.voicePreset,
    };
  }

  /**
   * Set audio preferences
   */
  setAudioPreferences(voicePitch: number, voicePreset: string): void {
    this.update({ voicePitch, voicePreset });
  }

  /**
   * Get feature preferences
   */
  getFeaturePreferences() {
    return {
      isProfanityFilterEnabled: this.preferences.isProfanityFilterEnabled,
      isLiveCaptionsEnabled: this.preferences.isLiveCaptionsEnabled,
      isAutoJoinEnabled: this.preferences.isAutoJoinEnabled,
      isNotificationsEnabled: this.preferences.isNotificationsEnabled,
    };
  }

  /**
   * Set feature preferences
   */
  setFeaturePreferences(updates: Partial<{
    isProfanityFilterEnabled: boolean;
    isLiveCaptionsEnabled: boolean;
    isAutoJoinEnabled: boolean;
    isNotificationsEnabled: boolean;
  }>): void {
    this.update(updates);
  }

  /**
   * Get privacy preferences
   */
  getPrivacyPreferences() {
    return {
      allowScreenSharing: this.preferences.allowScreenSharing,
      allowRecording: this.preferences.allowRecording,
      showOnlineStatus: this.preferences.showOnlineStatus,
    };
  }

  /**
   * Set privacy preferences
   */
  setPrivacyPreferences(updates: Partial<{
    allowScreenSharing: boolean;
    allowRecording: boolean;
    showOnlineStatus: boolean;
  }>): void {
    this.update(updates);
  }
}

// Export singleton instance
export const userPreferences = new UserPreferencesManager();
