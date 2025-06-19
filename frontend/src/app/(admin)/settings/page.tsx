'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/providers/AuthProvider';
import { useSettings } from './useSettings';
import { useSystemStatus } from './useSystemStatus';
import { MaintenanceTab } from './MaintenanceTab';
import { ConfigurationTab } from './ConfigurationTab';

export default function SettingsPage() {
  const { user } = useAuth();
  
  // Use custom hooks for state management
  const {
    settings,
    settingsLoading,
    settingsSaving,
    hasChanges,
    saveSettings,
    updateSetting
  } = useSettings();
  
  const {
    isLoading,
    results,
    systemStatus,
    schedulerStates,
    schedulerInfo,
    handleCleanup,
    refreshSystemStatus,
    handleSystemCleanup,
    handleSchedulerSetup
  } = useSystemStatus();

  if (!user || user.role !== 'admin') {
    return <div>Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="container space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">
          Manage system configuration and maintenance tasks
        </p>
      </div>
      
      <Tabs defaultValue="maintenance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>
        
        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <MaintenanceTab
            systemStatus={systemStatus}
            isLoading={isLoading}
            results={results}
            schedulerStates={schedulerStates}
            schedulerInfo={schedulerInfo}
            handleCleanup={handleCleanup}
            refreshSystemStatus={refreshSystemStatus}
            handleSystemCleanup={handleSystemCleanup}
            handleSchedulerSetup={handleSchedulerSetup}
          />
        </TabsContent>
        
        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-6">
          <ConfigurationTab
            settings={settings}
            settingsLoading={settingsLoading}
            settingsSaving={settingsSaving}
            hasChanges={hasChanges}
            saveSettings={saveSettings}
            updateSetting={updateSetting}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 