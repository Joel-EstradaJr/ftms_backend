import { MicroserviceConfig } from '../types/microservices';

export const MICROSERVICES: MicroserviceConfig[] = [
  {
    id: 'budget-request-management',
    name: 'Budget Management',
    url: 'http://localhost:3004',
    port: 3004,
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
    name: 'Purchase Request',
    url: 'http://localhost:3005',
    port: 3005,
    icon: 'ri-store-3-line',
    category: 'Purchase',
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