"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MICROSERVICES } from '../config/microservices';
import { useNavigationUrl } from '../hooks/useRouteContext';
// @ts-ignore
import "../styles/components/sidebar.css";

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const { getUrl } = useNavigationUrl();

  // Detect user role from pathname
  const userRole = pathname.startsWith('/admin') ? 'admin' : 'staff';

  const staticRoutes: { [key: string]: string } = {
    "/dashboard": "dashboard",
    "/revenue": "revenue",
    "/expense": "expense",
    "/reimbursement": "reimbursement",
    "/financial-management/payroll": "payroll",
    "/purchase-request-approval": "purchaseApproval",
    "/loan-management/loanRequest": "loan-request",
    "/loan-management/loanPayment": "loan-payment",
    "/report": "report",
    "/audit": "audit",
    "/budget-management/budgetAllocation": "budgetAllocation",
    "/budget-management/budgetApproval": "budgetApproval",
    "/budget-management/budgetRequest": "budget-request",
    "/jev/chart-of-accounts": "chart-of-accounts",
    "/jev/journal-entries": "journal-entries",
  };

  // Function to normalize pathname for comparison (remove role prefix)
  const getNormalizedPath = (path: string): string => {
    if (path.startsWith('/admin')) return path.replace('/admin', '');
    if (path.startsWith('/staff')) return path.replace('/staff', '');
    return path;
  };

  useEffect(() => {
    const normalizedPath = getNormalizedPath(pathname);
    
    const staticMatch = staticRoutes[normalizedPath];
    if (staticMatch) {
      setActiveItem(staticMatch);
      
      if (["expense", "reimbursement"].includes(staticMatch)) {
        setOpenSubMenu("expense-management");
      } else if (["budget-request", "budgetAllocation", "budgetApproval"].includes(staticMatch)) {
        setOpenSubMenu("budget-management");
      } else if (["purchase-request", "purchaseApproval"].includes(staticMatch)) {
        setOpenSubMenu("purchase-management");
      } else if (["loan-request", "loan-payment"].includes(staticMatch)) {
        setOpenSubMenu("loan-management");
      } else if (["chart-of-accounts", "journal-entries"].includes(staticMatch)) {
        setOpenSubMenu("jev-management");
      }
      return;
    }

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

    for (const service of MICROSERVICES) {
      if (pathname.startsWith(`/microservice/${service.id}`)) {
        setActiveItem(service.id);
        if (service.category === 'Financial') {
          setOpenSubMenu("budget-management");
        } else if (service.category === 'Purchase') {
          setOpenSubMenu("purchase-management");
        }
        return;
      }
    }

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
          {/* Dashboard - Both roles */}
          <Link
            href={getUrl("/dashboard")}
            className={`nav-item ${activeItem === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveItem("dashboard")}
          >
            <i className="ri-dashboard-line" />
            <span>Dashboard</span>
          </Link>

          {/* Revenue Management - Both roles */}
          <Link
            href={getUrl("/revenue")}
            className={`nav-item ${activeItem === "revenue" ? "active" : ""}`}
            onClick={() => setActiveItem("revenue")}
          >
            <i className="ri-money-dollar-circle-line" />
            <span>Revenue Management</span>
          </Link>

          {/* Expenses Submenu - Both roles */}
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
                href={getUrl("/expense")}
                className={`sub-item ${activeItem === "expense" ? "active" : ""}`}
                onClick={() => setActiveItem("expense")}
              >
                Expenses
              </Link>
              <Link
                href={getUrl("/reimbursement")}
                className={`sub-item ${activeItem === "reimbursement" ? "active" : ""}`}
                onClick={() => setActiveItem("reimbursement")}
              >
                Reimbursements
              </Link>
            </div>
          )}

          {/* Loan Submenu - Both roles */}
          <div
            className={`nav-item module ${
              ["loan-request", "loan-payment"].includes(activeItem!) ? "active" : ""
            }`}
            onClick={() => toggleSubMenu("loan-management")}
          >
            <i className="ri-hand-heart-line"></i>
            <span>Loans</span>
            <i
              className={`dropdown-arrow ri-arrow-down-s-line ${
                openSubMenu === "loan-management" ? "rotate" : ""
              }`}
            />
          </div>

          {openSubMenu === "loan-management" && (
            <div className="sub-menu active">
              <Link
                href={getUrl("/loan-management/loanRequest")}
                className={`sub-item ${activeItem === "loan-request" ? "active" : ""}`}
                onClick={() => setActiveItem("loan-request")}
              >
                Loan Requests
              </Link>
              <Link
                href={getUrl("/loan-management/loanPayment")}
                className={`sub-item ${activeItem === "loan-payment" ? "active" : ""}`}
                onClick={() => setActiveItem("loan-payment")}
              >
                Loan Payment
              </Link>
            </div>
          )}

          {/* Payroll - Both roles */}
          <Link
            href={getUrl("/financial-management/payroll")}
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
              {/* Budget Request - Both roles */}
              <Link
                href={getUrl("/budget-management/budgetRequest")}
                className={`sub-item ${activeItem === "budget-request" ? "active" : ""}`}
                onClick={() => setActiveItem("budget-request")}
              >
                Budget Request
              </Link>
              
              {/* Budget Allocation - Admin only */}
              {userRole === 'admin' && (
                <Link
                  href={getUrl("/budget-management/budgetAllocation")}
                  className={`sub-item ${activeItem === "budgetAllocation" ? "active" : ""}`}
                  onClick={() => setActiveItem("budgetAllocation")}
                >
                  Budget Allocation
                </Link>
              )}
              
              {/* Budget Approval - Admin only */}
              {userRole === 'admin' && (
                <Link
                  href={getUrl("/budget-management/budgetApproval")}
                  className={`sub-item ${activeItem === "budgetApproval" ? "active" : ""}`}
                  onClick={() => setActiveItem("budgetApproval")}
                >
                  Budget Approval
                </Link>
              )}
            </div>
          )}

          {/* Purchase Management Submenu - Both roles */}
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
                href={getUrl("/microservice/purchase-request/purchase-request")}
                className={`sub-item ${activeItem === "purchase-request" ? "active" : ""}`}
                onClick={() => setActiveItem("purchase-request")}
              >
                Purchase Request
              </Link>
              <Link
                href={getUrl("/purchase-request-approval")}
                className={`sub-item ${activeItem === "purchaseApproval" ? "active" : ""}`}
                onClick={() => setActiveItem("purchaseApproval")}
              >
                Purchase Approval
              </Link>
            </div>
          )}

          {/* Financial Reports - Both roles */}
          <Link
            href={getUrl("/report")}
            className={`nav-item ${activeItem === "report" ? "active" : ""}`}
            onClick={() => setActiveItem("report")}
          >
            <i className="ri-file-chart-line" />
            <span>Financial Reports</span>
          </Link>

          {/* JEV - Admin only */}
          {userRole === 'admin' && (
            <>
              <div
                className={`nav-item module ${
                  ["chart-of-accounts", "journal-entries"].includes(activeItem!) ? "active" : ""
                }`}
                onClick={() => toggleSubMenu("jev-management")}
              >
                <i className="ri-book-2-line"></i>
                <span>JEV</span>
                <i
                  className={`dropdown-arrow ri-arrow-down-s-line ${
                    openSubMenu === "jev-management" ? "rotate" : ""
                  }`}
                />
              </div>

              {openSubMenu === "jev-management" && (
                <div className="sub-menu active">
                  <Link
                    href={getUrl("/jev/chart-of-accounts")}
                    className={`sub-item ${activeItem === "chart-of-accounts" ? "active" : ""}`}
                    onClick={() => setActiveItem("chart-of-accounts")}
                  >
                    Chart of Accounts
                  </Link>
                  <Link
                    href={getUrl("/jev/journal-entries")}
                    className={`sub-item ${activeItem === "journal-entries" ? "active" : ""}`}
                    onClick={() => setActiveItem("journal-entries")}
                  >
                    Journal Entries
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Audit Logs - Admin only */}
          {userRole === 'admin' && (
            <Link
              href={getUrl("/audit")}
              className={`nav-item ${activeItem === "audit" ? "active" : ""}`}
              onClick={() => setActiveItem("audit")}
            >
              <i className="ri-booklet-line" />
              <span>Audit Logs</span>
            </Link>
          )}
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