'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MicroserviceConfig } from '../../../../../types/microservices';
import { MICROSERVICES } from '../../../../../config/microservices';
import Loading from '../../../../../Components/loading'
// @ts-ignore
import '../../../../../styles/general/microservices.css';
// @ts-ignore
import '../../../../../styles/general/index.css';

export default function AdminMicroservicePage() {
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [microservice, setMicroservice] = useState<MicroserviceConfig | null>(null);

  const serviceId = params.serviceId as string;
  const route = Array.isArray(params.route) ? params.route.join('/') : params.route || '';

  useEffect(() => {
    // Find the microservice by ID
    const foundService = MICROSERVICES.find(service => service.id === serviceId);
    
    if (!foundService) {
      setError(`Microservice "${serviceId}" not found`);
      setIsLoading(false);
      return;
    }

    setMicroservice(foundService);
    checkMicroserviceHealth(foundService);
  }, [serviceId]);

  const checkMicroserviceHealth = async (service: MicroserviceConfig) => {
    try {
      const healthUrl = service.healthCheck 
        ? `${service.url}${service.healthCheck}`
        : service.url;
        
      const response = await fetch(healthUrl, {
        mode: 'no-cors' // Allow checking if service is running
      });
      
      // If we reach here without error, service is likely running
      setIsLoading(false);
    } catch (err) {
      setError(`Failed to connect to ${service.name}. Please ensure it's running on port ${service.port}.`);
      setIsLoading(false);
    }
  };

  if (!microservice) {
    return (
      <div className='card'>
        <div className="microservice-error">
          <div className="error-icon">❌</div>
          <h3>Microservice Not Found</h3>
          <p>The microservice "{serviceId}" is not configured in the system.</p>
        </div>
      </div>
      
    );
  }

  if (isLoading) {
    return (
      <div className="card">
        <h1 className="title">{microservice.name} (Admin)</h1>
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className='card'>
        <div className="microservice-error">
          <div className="error-icon">⚠️</div>
          <h3>Service Unavailable</h3>
          <p>{error}</p>
          <div className="error-instructions">
            <p><strong>To start the {microservice.name} microservice:</strong></p>
            <ol>
              <li>Open a new terminal</li>
              <li>Navigate to the {microservice.name} folder</li>
              <li>Run: <code>npm run dev</code></li>
              <li>Wait for it to start on port {microservice.port}</li>
              <li>Then click the retry button below</li>
            </ol>
          </div>
          <button 
            onClick={() => checkMicroserviceHealth(microservice)}
            className="retry-button"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Construct the iframe URL with admin context
  const iframeUrl = `${microservice.url}/${route}?role=admin`;

  return (
    <div className="microservice-container">
      <iframe
        src={iframeUrl}
        width="100%"
        height="100%" 
        frameBorder="0"
        title={`${microservice.name} (Admin)`}
        className="microservice-iframe"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
      />
    </div>
  );
}