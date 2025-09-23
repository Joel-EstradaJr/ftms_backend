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
      },
      {
        path: '/budget-management/budgetAllocation',
        name: 'Budget Allocation',
        description: 'Allocate budgets to departments'
      },
      {
        path: '/budget-management/budgetApproval',
        name: 'Budget Approval',
        description: 'Approve budget requests'
      }
    ]
  }
  // Future microservices will be added here
];