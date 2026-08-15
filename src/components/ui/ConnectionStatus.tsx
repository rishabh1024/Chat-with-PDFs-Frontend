import React, { useState, useEffect } from 'react';
import { chatService } from '../../services/chatService';

type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkConnection = async () => {
    setStatus('checking');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      // Simple health check - you might want to implement a dedicated endpoint
      const response = await fetch(`${chatService.getApiUrl()}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    } catch {
      setStatus('disconnected');
    } finally {
      clearTimeout(timeoutId);
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-red-500';
      case 'checking': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'disconnected': return 'Disconnected';
      case 'checking': return 'Checking...';
      default: return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span>{getStatusText()}</span>
      {lastChecked && status !== 'checking' && (
        <span className="text-gray-400">
          • Last checked {lastChecked.toLocaleTimeString()}
        </span>
      )}
      <button
        onClick={checkConnection}
        disabled={status === 'checking'}
        className="text-primary-600 hover:text-primary-700 disabled:opacity-50"
      >
        Refresh
      </button>
    </div>
  );
};

export default ConnectionStatus;