"use client";

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

export type UserRole = 'admin' | 'staff';

export interface RouteContext {
  userRole: UserRole | null;
  baseUrl: string;
  isRoleBasedRoute: boolean;
}

export const useRouteContext = (): RouteContext => {
  const pathname = usePathname();

  const context = useMemo(() => {
    // Check if we're in a role-based route
    if (pathname.startsWith('/admin')) {
      return {
        userRole: 'admin' as UserRole,
        baseUrl: '/admin',
        isRoleBasedRoute: true
      };
    }
    
    if (pathname.startsWith('/staff')) {
      return {
        userRole: 'staff' as UserRole,
        baseUrl: '/staff',
        isRoleBasedRoute: true
      };
    }

    // Default fallback (for role selection page, etc.)
    return {
      userRole: null,
      baseUrl: '',
      isRoleBasedRoute: false
    };
  }, [pathname]);

  return context;
};

export const useNavigationUrl = () => {
  const { baseUrl, isRoleBasedRoute, userRole } = useRouteContext();

  const getUrl = (path: string): string => {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    if (isRoleBasedRoute) {
      return `${baseUrl}/${cleanPath}`;
    }
    
    // Fallback to original path if not in role-based route
    return `/${cleanPath}`;
  };

  return { getUrl, userRole };
};