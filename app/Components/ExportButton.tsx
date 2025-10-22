'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportButtonProps {
  data: any[];
  filename: string;
  columns?: { header: string; key: string }[];
  title?: string;
  logo?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({ 
  data, 
  filename, 
  columns, 
  title = 'Export Report',
  logo 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Auto-detect columns from first data item if not provided
  const getColumns = () => {
    if (columns) return columns;
    if (data.length === 0) return [];
    
    const firstItem = data[0];
    return Object.keys(firstItem).map(key => ({
      header: key.replace(/_/g, ' ').toUpperCase(),
      key: key
    }));
  };

  const handleExportCSV = () => {
    setIsOpen(false);
    const cols = getColumns();
    const headers = cols.map(col => col.header);
    const rows = data.map(row => cols.map(col => {
      const value = row[col.key];
      // Handle undefined/null values
      if (value === undefined || value === null) return '';
      // Convert to string and escape quotes
      return String(value).replace(/"/g, '""');
    }));

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    setIsOpen(false);
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
    
    // Add logo if provided
    if (logo) {
      try {
        doc.addImage(logo, 'PNG', 14, 10, 30, 30);
      } catch (error) {
        console.warn('Could not add logo to PDF:', error);
      }
    }

    // Add title
    doc.setFontSize(18);
    doc.setTextColor(150, 28, 30); // Primary color #961C1E
    doc.text(title, logo ? 50 : 14, 20);

    // Add generation date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, logo ? 50 : 14, 28);

    const cols = getColumns();
    const headers = [cols.map(col => col.header)];
    const body = data.map(row => cols.map(col => {
      const value = row[col.key];
      if (value === undefined || value === null) return '-';
      return String(value);
    }));

    autoTable(doc, {
      head: headers,
      body: body,
      startY: logo ? 45 : 35,
      theme: 'grid',
      headStyles: {
        fillColor: [150, 28, 30], // Primary color
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportExcel = () => {
    setIsOpen(false);
    const cols = getColumns();
    const headers = [cols.map(col => col.header)];
    const rows = data.map(row => cols.map(col => {
      const value = row[col.key];
      return value ?? '';
    }));

    const ws = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
    
    // Style headers
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!ws[address]) continue;
      ws[address].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "961C1E" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="export-button-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="exportButton"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          height: '2.5rem',
          background: 'var(--secondary-color)',
          color: 'white',
          border: 'none',
          padding: '0 1rem',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--secondary-hover-color)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--secondary-color)';
        }}
      >
        <i className="ri-download-line"></i>
        Export
        <i className={`ri-arrow-${isOpen ? 'up' : 'down'}-s-line`}></i>
      </button>
      
      {isOpen && (
        <div
          className="export-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '180px',
            overflow: 'hidden'
          }}
        >
          <button 
            onClick={handleExportCSV}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'white',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
          >
            <i className="ri-file-text-line" style={{ fontSize: '18px', color: '#28a745' }}></i>
            Export as CSV
          </button>
          
          <div style={{ height: '1px', background: '#eee' }}></div>
          
          <button 
            onClick={handleExportPDF}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'white',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
          >
            <i className="ri-file-pdf-line" style={{ fontSize: '18px', color: '#dc3545' }}></i>
            Export as PDF
          </button>
          
          <div style={{ height: '1px', background: '#eee' }}></div>
          
          <button 
            onClick={handleExportExcel}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'white',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
          >
            <i className="ri-file-excel-line" style={{ fontSize: '18px', color: '#107C41' }}></i>
            Export as Excel
          </button>
        </div>
      )}
      
      {/* Click outside to close */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default ExportButton;
