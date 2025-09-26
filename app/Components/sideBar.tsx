// app\Components\sideBar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MICROSERVICES } from '../config/microservices';
// @ts-ignore
import "../styles/components/sidebar.css";

const routeToItem: { [key: string]: string } = {
  "/dashboard": "dashboard",
  "/revenue": "revenue",
  "/expense": "expense",
  "/audit": "audit",
  "/report": "report",
  "/reimbursement": "reimbursement",
  "/JEV": "JEV",
  "/financial-management/payroll": "payroll",
  "/microservice/budget-request-management": "budget-request",
};

const expenseSubItems = [
  "/expense",
  "/reimbursement",
];

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

      const staticRoutes: { [key: string]: string } = {
      "/dashboard": "dashboard",
      "/revenue": "revenue",
      "/expense": "expense",
      "/budget-management": "budget-management",
      "/audit": "audit",
      "/report": "report",
      "/reimbursement": "reimbursement",
      "/JEV": "JEV",
      "/financial-management/payroll": "payroll",
    };

   useEffect(() => {
    // Check static routes first
    const staticMatch = staticRoutes[pathname];
    if (staticMatch) {
      setActiveItem(staticMatch);
      return;
    }

    // Check microservice routes
    if (pathname.startsWith('/microservice/budget-request-management')) {
      setActiveItem('budget-request');
      return;
    }

    // Generic microservice route detection
    for (const service of MICROSERVICES) {
      if (pathname.startsWith(`/microservice/${service.id}`)) {
        setActiveItem(service.id);
        return;
      }
    }
  }, [pathname]);

  const toggleSubMenu = (id: string) => {
    setOpenSubMenu((prev) => (prev === id ? null : id));
  };

  // Group microservices by category
  const servicesByCategory = MICROSERVICES.reduce((acc, service) => {
    const categoryKey = service.category.toLowerCase().replace(' ', '-');
    if (!acc[categoryKey]) {
      acc[categoryKey] = {
        name: service.category,
        services: []
      };
    }
    acc[categoryKey].services.push(service);
    return acc;
  }, {} as Record<string, { name: string; services: typeof MICROSERVICES }>);


  return (
    <div className="sidebar shadow-lg" id="sidebar">
      <div className="sidebar-content">
        <div className="logo-img">
          <Image src="/agilaLogo.png" alt="logo" width={150} height={50} priority />
        </div>

        <div className="nav-links">
          <Link
            href="/dashboard"
            className={`nav-item ${activeItem === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveItem("dashboard")}
          >
            <i className="ri-dashboard-line" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/revenue"
            className={`nav-item ${activeItem === "revenue" ? "active" : ""}`}
            onClick={() => setActiveItem("revenue")}
          >
            <i className="ri-money-dollar-circle-line" />
            <span>Revenue Management</span>
          </Link>

          {/* Expenses Submenu */}
          <div
            className={`nav-item module ${
              ["expense", "reimbursement"].includes(activeItem!) ? "active" : ""
            }`}
            onClick={() => toggleSubMenu("expense-management")}
          >
            <i className="ri-wallet-3-line"></i>
            <span>Expenses</span>
            <i
              className={`dropdown-arrow ri-arrow-down-s-line ${
                openSubMenu === "expense-management" ? "rotate" : ""
              }`}
            />
          </div>

          {openSubMenu === "expense-management" && (
            <div className="sub-menu active">
              <Link
                href="/expense"
                className={`sub-item ${activeItem === "expense" ? "active" : ""}`}
              >
                Expenses
              </Link>
              <Link
                href="/reimbursement"
                className={`sub-item ${activeItem === "reimbursement" ? "active" : ""}`}
              >
                Reimbursements
              </Link>
            </div>
          )}

          { <Link
            href="/financial-management/payroll"
            className={`nav-item ${activeItem === "payroll" ? "active" : ""}`}
            onClick={() => setActiveItem("payroll")}
          >
            <i className="ri-group-line" />
            <span>Payroll</span>
          </Link> }

          {/* Budget Management and Submenu */}
          <div
            className={`nav-item module ${
              ["budget-request", "budgetAllocation","budgetApproval"].includes(activeItem!) ? "active" : ""
            }`}
            onClick={() => toggleSubMenu("budget-management")}
          >
            <i className="ri-wallet-3-line"></i>
            <span>Budget Management</span>
            <i
              className={`dropdown-arrow ri-arrow-down-s-line ${
                openSubMenu === "budget-management" ? "rotate" : ""
              }`}
            />
          </div>

          {openSubMenu === "budget-management" && (
            <div className="sub-menu active">
              <Link
                href="/microservice/budget-request-management/budget-management/adminBudgetRequest"
                className={`sub-item ${activeItem === "budget-request" ? "active" : ""}`}
                onClick={() => setActiveItem("budget-request")}
              >
                <span>Budget Request 'microservice'</span>
              </Link>
              <Link
                href="/budget-management/budgetAllocation"
                className={`sub-item ${activeItem === "budgetAllocation" ? "active" : ""}`}
              >
                Budget Allocation
              </Link>
              <Link
                href="/budget-management/budgetApproval"
                className={`sub-item ${activeItem === "budgetApproval" ? "active" : ""}`}
              >
                Budget Approval
              </Link>
            </div>
          )}
 

          {/* Purchase Request and Submenu */}
          <div
            className={`nav-item module ${
              ["purchase-request", "purchaseApproval"].includes(activeItem!) ? "active" : ""
            }`}
            onClick={() => toggleSubMenu("purchase-management")}
          >
            < i className="ri-store-2-line" />
            <span>Purchase Management</span>
            <i
              className={`dropdown-arrow ri-arrow-down-s-line ${
                openSubMenu === "purchase-management" ? "rotate" : ""
              }`}
            />
          </div>

          {openSubMenu === "purchase-management" && (
            <div className="sub-menu active">
              <Link
                href="/microservice/purchase-request/purchase-request"
                className={`sub-item ${activeItem === "purchase-request" ? "active" : ""}`}
                onClick={() => setActiveItem("purchase-request")}
              >
                <span>Purchase Request 'microservice'</span>
              </Link>
    
              <Link
                href="/budget-management/budgetApproval"
                className={`sub-item ${activeItem === "purchaseApproval" ? "active" : ""}`}
              >
                Purchase Approval
              </Link>
            </div>
          )}


          { 
          <Link
            href="/report"
            className={`nav-item ${activeItem === "report" ? "active" : ""}`}
            onClick={() => setActiveItem("report")}
          >
            <i className="ri-file-chart-line" />
            <span>Financial Reports</span>
          </Link>
          }

          <Link
            href="/JEV"
            className={`nav-item ${activeItem === "JEV" ? "active" : ""}`}
            onClick={() => setActiveItem("JEV")}
          >
            <i className="ri-book-2-line"></i>
            <span>JEV</span>
          </Link>

          <Link
            href="/audit"
            className={`nav-item ${activeItem === "audit" ? "active" : ""}`}
            onClick={() => setActiveItem("audit")}
          >
            <i className="ri-booklet-line" />
            <span>Audit Logs</span>
          </Link>
        </div>

        <div className="logout">
          <a href="#">
            <i className="ri-logout-box-r-line" />
            <span>Logout</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
