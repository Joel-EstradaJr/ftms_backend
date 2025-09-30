"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MICROSERVICES } from '../config/microservices';
// @ts-ignore
import "../styles/components/sidebar.css";

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

  const staticRoutes: { [key: string]: string } = {
    "/dashboard": "dashboard",
    "/revenue": "revenue",
    "/expense": "expense",
    "/reimbursement": "reimbursement",
    "/financial-management/payroll": "payroll",
    "/purchase-request-approval": "purchaseApproval", // Added missing route
    "/report": "report",
    "/JEV": "JEV",
    "/audit": "audit",
    // Budget Management routes
    "/budget-management/budgetAllocation": "budgetAllocation",
    "/budget-management/budgetApproval": "budgetApproval",
  };

  useEffect(() => {
    // Check static routes first
    const staticMatch = staticRoutes[pathname];
    if (staticMatch) {
      setActiveItem(staticMatch);
      
      // Auto-open relevant submenus based on active item
      if (["expense", "reimbursement"].includes(staticMatch)) {
        setOpenSubMenu("expense-management");
      } else if (["budget-request", "budgetAllocation", "budgetApproval"].includes(staticMatch)) {
        setOpenSubMenu("budget-management");
      } else if (["purchase-request", "purchaseApproval"].includes(staticMatch)) {
        setOpenSubMenu("purchase-management");
      }
      return;
    }

    // Check microservice routes
    if (pathname.startsWith('/microservice/budget-request-management')) {
      setActiveItem('budget-request');
      setOpenSubMenu("budget-management");
      return;
    }

    if (pathname.startsWith('/microservice/purchase-request')) {
      setActiveItem('purchase-request');
      setOpenSubMenu("purchase-management");
      return;
    }

    // Generic microservice route detection
    for (const service of MICROSERVICES) {
      if (pathname.startsWith(`/microservice/${service.id}`)) {
        setActiveItem(service.id);
        // Auto-open relevant submenu based on service category
        if (service.category === 'Financial') {
          setOpenSubMenu("budget-management");
        } else if (service.category === 'Purchase') {
          setOpenSubMenu("purchase-management");
        }
        return;
      }
    }

    // Reset if no match found
    setActiveItem(null);
  }, [pathname]);

  const toggleSubMenu = (id: string) => {
    setOpenSubMenu((prev) => (prev === id ? null : id));
  };

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
                onClick={() => setActiveItem("expense")}
              >
                Expenses
              </Link>
              <Link
                href="/reimbursement"
                className={`sub-item ${activeItem === "reimbursement" ? "active" : ""}`}
                onClick={() => setActiveItem("reimbursement")}
              >
                Reimbursements
              </Link>
            </div>
          )}

          <Link
            href="/financial-management/payroll"
            className={`nav-item ${activeItem === "payroll" ? "active" : ""}`}
            onClick={() => setActiveItem("payroll")}
          >
            <i className="ri-group-line" />
            <span>Payroll</span>
          </Link>

          {/* Budget Management Submenu */}
          <div
            className={`nav-item module ${
              ["budget-request", "budgetAllocation", "budgetApproval"].includes(activeItem!) ? "active" : ""
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
                onClick={() => setActiveItem("budgetAllocation")}
              >
                Budget Allocation
              </Link>
              <Link
                href="/budget-management/budgetApproval"
                className={`sub-item ${activeItem === "budgetApproval" ? "active" : ""}`}
                onClick={() => setActiveItem("budgetApproval")}
              >
                Budget Approval
              </Link>
            </div>
          )}

          {/* Purchase Management Submenu */}
          <div
            className={`nav-item module ${
              ["purchase-request", "purchaseApproval"].includes(activeItem!) ? "active" : ""
            }`}
            onClick={() => toggleSubMenu("purchase-management")}
          >
            <i className="ri-store-2-line" />
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
                href="/purchase-request-approval"
                className={`sub-item ${activeItem === "purchaseApproval" ? "active" : ""}`}
                onClick={() => setActiveItem("purchaseApproval")}
              >
                Purchase Approval
              </Link>
            </div>
          )}

          <Link
            href="/report"
            className={`nav-item ${activeItem === "report" ? "active" : ""}`}
            onClick={() => setActiveItem("report")}
          >
            <i className="ri-file-chart-line" />
            <span>Financial Reports</span>
          </Link>

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