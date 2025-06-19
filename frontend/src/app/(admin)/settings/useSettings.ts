import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/apiClient';
import { SystemSettings } from './types';

export function useSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load system settings on hook initialization
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setSettingsLoading(true);
        const response = await apiRequest<{ status: string; data: { settings: SystemSettings } }>('admin/settings', {
          requireAuth: true
        });
        setSettings(response.data.settings);
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast({
          title: 'Failed to load settings',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive'
        });
      } finally {
        setSettingsLoading(false);
      }
    };
    
    loadSettings();
  }, [toast]);

  // Function to save system settings
  const saveSettings = async () => {
    if (!settings || !hasChanges) return;
    
    try {
      setSettingsSaving(true);
      
      // Strip MongoDB-specific fields before sending to NestJS backend
      const { _id, createdAt, updatedAt, __v, ...cleanSettings } = settings as any;
      
      const response = await apiRequest<{ status: string; data: { settings: SystemSettings; message: string } }>('admin/settings', {
        method: 'PUT',
        body: cleanSettings,
        requireAuth: true
      });
      
      setSettings(response.data.settings);
      setHasChanges(false);
      
      toast({
        title: 'Settings saved successfully',
        description: response.data.message,
        variant: 'default'
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Failed to save settings',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setSettingsSaving(false);
    }
  };

  // Function to update a setting value
  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    if (!settings) return;
    
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
    setHasChanges(true);
  };

  return {
    settings,
    settingsLoading,
    settingsSaving,
    hasChanges,
    saveSettings,
    updateSetting
  };
} 