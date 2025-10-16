'use client';

import "../globals.css";
import '../styles/general/index.css';
import SideBar from "../Components/sideBar";
import TopBar from '../Components/topBar';

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-wrapper staff-theme">
      {/* Sidebar Navbar */}
      <SideBar />

      <div className="layout-right">
        <TopBar /> 

        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}