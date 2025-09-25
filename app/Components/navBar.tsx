// components/Navbar.tsx
"use client";

import React from 'react';
import Image from 'next/image';
import '../styles/components/sidebar.css'; // External CSS for styling
import NavItem from './NavItem'; // Importing NavItem component
import SubModule from './SubModule'; // Importing SubModule component

// ===== Props Interface =====
type NavbarProps = {
  activeModule: string;
  activeSubModule: string;
  setActiveModule: (module: string) => void;
  setActiveSubModule: (subModule: string) => void;
};

// ===== Main Navbar Component =====
const Navbar: React.FC<NavbarProps> = ({
  activeModule,
  activeSubModule,
  setActiveModule,
  setActiveSubModule,
}) => {
  // Handle Main Module Click
  const handleModuleClick = (moduleName: string) => {
    setActiveModule(moduleName);
    setActiveSubModule(''); // Reset submodule on main module switch
  };

  // Handle Sub-Module Click
  const handleSubModuleClick = (subModuleName: string) => {
    setActiveSubModule(subModuleName);
  };

  return (
    <div className="navBar">
      
      {/* ===== Logo Section ===== */}
      <div className="Logo">
        <div className="LogoImage">
          <Image 
            src="/agilaLogo.png" 
            alt="Logo" 
            width={150}
            height={50}
            className="logoImage"
          />
        </div>
      </div>

      {/* ===== Navigation Items ===== */}
      <div className="navContainer">
        <div className="navBarItems">

          {/* Dashboard */}
          <NavItem
            label="Dashboard"
            icon="ri-dashboard-line"
            active={activeModule === 'Dashboard'}
            onClick={() => handleModuleClick('Dashboard')}
          />

          {/* Receipt Management removed */}

          {/* Employee Financial Management */}
          <NavItem
            label="Employee Financial Management"
            icon="ri-group-line"
            active={activeModule === 'Employee Financial Management'}
            onClick={() => handleModuleClick('Employee Financial Management')}
          />

          {/* Employee Financial Management SubModules */}
          {activeModule === 'Employee Financial Management' && (
            <SubModule
              subModule="Balance & Payment"
              activeSubModule={activeSubModule}
              onClick={handleSubModuleClick}
            />
          )}
          {activeModule === 'Employee Financial Management' && (
            <SubModule
              subModule="Payroll"
              activeSubModule={activeSubModule}
              onClick={handleSubModuleClick}
            />
          )}

          {/* Financial Requests */}
          <NavItem
            label="Financial Requests"
            icon="ri-service-bell-line"
            active={activeModule === 'Financial Requests'}
            onClick={() => handleModuleClick('Financial Requests')}
          />

          {/* Financial Reports */}
          <NavItem
            label="Financial Reports"
            icon="ri-file-chart-line"
            active={activeModule === 'Financial Reports'}
            onClick={() => handleModuleClick('Financial Reports')}
          />

          {/* Audit Logs */}
          <NavItem
            label="Audit Logs"
            icon="ri-booklet-line"
            active={activeModule === 'Audit Logs'}
            onClick={() => handleModuleClick('Audit Logs')}
          />
        </div>

        {/* ===== Logout Button ===== */}
        <div className="logout">
          <i className="ri-logout-box-line" /> Logout
        </div>
      </div>
    </div>
  );
};

export default Navbar;
