// components/MicroserviceLoader.tsx
'use client';

import { useEffect, useState } from 'react';
import { MicroserviceConfig } from '../types/microservices';

interface MicroserviceLoaderProps {
  microservice: MicroserviceConfig;
  route: string;
  className?: string;
}

export default function MicroserviceLoader({ 
  microservice, 
  route, 
  className = '' 
}: MicroserviceLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isHealthy, setIsHealthy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iframeUrl = `${microservice.url}${route}?embedded=true`;

  useEffect(() => {
    checkMicroserviceHealth();
  }, [microservice]);

  const checkMicroserviceHealth = async () => {
    try {
      const healthUrl = microservice.healthCheck 
        ? `${microservice.url}${microservice.healthCheck}`
        : microservice.url;
        
      const response = await fetch(healthUrl);
      
      if (response.ok) {
        setIsHealthy(true);
        setIsLoading(false);
      } else {
        throw new Error(`${microservice.name} is not responding`);
      }
    } catch (err) {
      setError(`Failed to connect to ${microservice.name}`);
      setIsHealthy(false);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="microservice-loading">
        <div className="loading-spinner"></div>
        <p>Loading {microservice.name}...</p>
      </div>
    );
  }

  if (error || !isHealthy) {
    return (
      <div className="microservice-error">
        <div className="error-icon">⚠️</div>
        <h3>Service Unavailable</h3>
        <p>{error}</p>
        <p>Please ensure {microservice.name} is running on port {microservice.port}</p>
        <button 
          onClick={checkMicroserviceHealth}
          className="retry-button"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className={`microservice-container ${className}`}>
      <iframe
        src={iframeUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        title={microservice.name}
        className="microservice-iframe"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />
    </div>
  );
}