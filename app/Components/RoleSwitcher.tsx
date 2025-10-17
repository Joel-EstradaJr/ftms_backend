"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouteContext } from '../hooks/useRouteContext';

const RoleSwitcher: React.FC = () => {
  const pathname = usePathname();
  const { userRole, isRoleBasedRoute } = useRouteContext();

  if (!isRoleBasedRoute || !userRole) {
    return null; // Don't show on role selection page
  }

  const otherRole = userRole === 'admin' ? 'staff' : 'admin';
  const currentPagePath = pathname.replace(`/${userRole}`, '') || '/dashboard';

  return (
    <div className="role-switcher">
      <div className="current-role">
        <span className={`role-badge ${userRole}`}>
          {userRole === 'admin' ? (
            <>
              <i className="ri-admin-line"></i> Admin
            </>
          ) : (
            <>
              <i className="ri-user-line"></i> Staff
            </>
          )}
        </span>
      </div>
      
      <div className="switch-role">
        <Link 
          href={`/${otherRole}${currentPagePath}`}
          className="switch-link"
          title={`Switch to ${otherRole} view`}
        >
          Switch to {otherRole === 'admin' ? 'Admin' : 'Staff'}
        </Link>
        <span className="separator">|</span>
        <Link href="/" className="home-link" title="Back to role selection">
          Home
        </Link>
      </div>

      <style jsx>{`
        .role-switcher {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .role-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: 600;
          color: white;
        }

        .role-badge.admin {
          background: var(--primary-color);
        }

        .role-badge.staff {
          background: var(--secondary-color);
        }

        .switch-role {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .switch-link, .home-link {
          color: #666;
          text-decoration: none;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .switch-link:hover, .home-link:hover {
          color: #333;
          background: rgba(255, 255, 255, 0.2);
        }

        .separator {
          color: #999;
        }

        @media (max-width: 768px) {
          .role-switcher {
            flex-direction: column;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default RoleSwitcher;