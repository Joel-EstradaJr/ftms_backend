// types/microservices.ts
export interface MicroserviceConfig {
  id: string;
  name: string;
  url: string;
  port: number;
  routes: MicroserviceRoute[];
  icon: string;
  category: string;
  healthCheck?: string;
  description?: string;
}

export interface MicroserviceRoute {
  path: string;
  name: string;
  description?: string;
  requiresAuth?: boolean;
}