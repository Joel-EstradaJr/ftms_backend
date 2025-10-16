'use client';

import "../globals.css";
import '../styles/general/index.css';
import SideBar from "../Components/sideBar";
import TopBar from '../Components/topBar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-wrapper admin-theme">
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