"use client";

import React from 'react';
// @ts-ignore
import '../../../styles/general/index.css';

const JEVPage = () => {
  return (
    <div className="card">
      <h1 className="title">Journal Entry Voucher (JEV)</h1>
      <div className="content-placeholder">
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem',
          color: '#666',
          background: '#f8f9fa',
          borderRadius: '8px',
          border: '2px dashed #dee2e6'
        }}>
          <i className="ri-book-2-line" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
          <h3>JEV Module</h3>
          <p>The Journal Entry Voucher module is under development.</p>
          <p>This feature will allow you to create and manage journal entries for accounting purposes.</p>
        </div>
      </div>
    </div>
  );
};

export default JEVPage;