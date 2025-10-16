import { MicroserviceConfig } from '../types/microservices';

export const MICROSERVICES: MicroserviceConfig[] = [
  {
    id: 'budget-request-management',
    name: 'Budget Management',
    url: 'http://localhost:3001',
    port: 3001,
    icon: 'ri-wallet-3-line',
    category: 'Financial',
    healthCheck: '/api/health',
    routes: [
      {
        path: '/budget-management/budgetRequest',
        name: 'Budget Request',
        description: 'Manage budget requests'
      }
    ]
  },

  {
    id: 'purchase-request',
    name: 'Budget Request',
    url: 'http://localhost:3002',
    port: 3002,
    icon: 'ri-store-3-line',
    category: 'Financial',
    healthCheck: '/api/health',
    routes: [
      {
        path: '/purchase-request/purchaseRequest',
        name: 'Purchase Request',
        description: 'Manage purchase requests'
      }
    ]
  }
  // Future microservices will be added here
];