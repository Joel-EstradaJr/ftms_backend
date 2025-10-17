'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatDate } from '@/app/utility/dateFormatter';
import { showSuccess, showError, showConfirmation } from '@/app/utility/Alerts';
import PaginationComponent from '@/app/Components/pagination';
import Loading from '@/app/Components/loading';
import FilterDropdown, { FilterSection } from '@/app/Components/filter';
import AddAccountModal from './AddAccountModal';
import EditAccountModal from './EditAccountModal';
import ViewAccountModal from './ViewAccountModal';
import AddChildAccountModal from './AddChildAccountModal';
import ValidateBalanceModal from './ValidateBalanceModal';
import AuditTrailModal from './AuditTrailModal';
import { ChartOfAccount, AccountType, AccountFormData} from '@/app/types/jev';
import {getAccountTypeClass, 
        getAccountStatusInfo, 
        canArchiveAccount,
        getChildCount,
        canHaveChildren,
        isParentAccount} from '@/app/lib/jev/accountHelpers';
import '@/app/styles/JEV/chart-of-accounts.css';
import '@/app/styles/components/table.css'; 
import '@/app/styles/components/chips.css';
import '@/app/styles/JEV/JEV_table.css'; 

const ChartOfAccountsPage = () => {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showAuditTrailModal, setShowAuditTrailModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccount | null>(null);

  // Sample data for testing
  const sampleAccounts: ChartOfAccount[] = [
    // PARENT ACCOUNTS (Root level)
    {
      account_id: '1',
      account_code: '1010',
      account_name: 'Cash on Hand',
      account_type: AccountType.ASSET,
      description: 'Physical cash available',
      is_active: true,
      is_system_account: true,
      level: 1,
    },
    {
      account_id: '2',
      account_code: '1020',
      account_name: 'Cash in Bank',
      account_type: AccountType.ASSET,
      description: 'Bank deposits',
      is_active: true,
      is_system_account: true,
      level: 1,
    },
    
    // CHILD ACCOUNTS (Under "Cash in Bank")
    {
      account_id: '3',
      account_code: '1021',
      account_name: 'BDO Savings Account',
      account_type: AccountType.ASSET,
      description: 'BDO primary savings account',
      parent_account_id: '2',
      parent_account_code: '1020',
      parent_account_name: 'Cash in Bank',
      is_active: true,
      is_system_account: false,
      level: 2,
    },
    {
      account_id: '4',
      account_code: '1022',
      account_name: 'BPI Current Account',
      account_type: AccountType.ASSET,
      description: 'BPI business current account',
      parent_account_id: '2',
      parent_account_code: '1020',
      parent_account_name: 'Cash in Bank',
      is_active: true,
      is_system_account: false,
      level: 2,
    },
    {
      account_id: '5',
      account_code: '1023',
      account_name: 'Metrobank Payroll Account',
      account_type: AccountType.ASSET,
      description: 'Payroll disbursement account',
      parent_account_id: '2',
      parent_account_code: '1020',
      parent_account_name: 'Cash in Bank',
      is_active: true,
      is_system_account: false,
      level: 2,
    },
    
    // MORE PARENT ACCOUNTS
    {
      account_id: '6',
      account_code: '1210',
      account_name: 'Loan Receivable - Employee',
      account_type: AccountType.ASSET,
      description: 'Employee loans',
      is_active: true,
      is_system_account: false,
      level: 1,
    },
    {
      account_id: '7',
      account_code: '2010',
      account_name: 'Accounts Payable',
      account_type: AccountType.LIABILITY,
      description: 'Amounts owed to suppliers',
      is_active: true,
      is_system_account: true,
      level: 1,
    },
    
    // PARENT: Revenue
    {
      account_id: '8',
      account_code: '4000',
      account_name: 'Bus Operations Revenue',
      account_type: AccountType.REVENUE,
      description: 'All revenue from bus operations',
      is_active: true,
      is_system_account: true,
      level: 1,
    },
    
    // CHILDREN: Revenue breakdown
    {
      account_id: '9',
      account_code: '4010',
      account_name: 'Route 1 Revenue',
      account_type: AccountType.REVENUE,
      description: 'Revenue from Route 1',
      parent_account_id: '8',
      parent_account_code: '4000',
      parent_account_name: 'Bus Operations Revenue',
      is_active: true,
      is_system_account: false,
      level: 2,
    },
    {
      account_id: '10',
      account_code: '4020',
      account_name: 'Route 2 Revenue',
      account_type: AccountType.REVENUE,
      description: 'Revenue from Route 2',
      parent_account_id: '8',
      parent_account_code: '4000',
      parent_account_name: 'Bus Operations Revenue',
      is_active: true,
      is_system_account: false,
      level: 2,
    },
    
    // PARENT: Expenses
    {
      account_id: '11',
      account_code: '5000',
      account_name: 'Operating Expenses',
      account_type: AccountType.EXPENSE,
      description: 'All operating expenses',
      is_active: true,
      is_system_account: true,
      level: 1,
    },
    
    // CHILDREN: Expense breakdown
    {
      account_id: '12',
      account_code: '5010',
      account_name: 'Salary Expense',
      account_type: AccountType.EXPENSE,
      description: 'Employee salaries',
      parent_account_id: '11',
      parent_account_code: '5000',
      parent_account_name: 'Operating Expenses',
      is_active: true,
      is_system_account: false,
      level: 2,
    },
    {
      account_id: '13',
      account_code: '5020',
      account_name: 'Fuel Expense',
      account_type: AccountType.EXPENSE,
      description: 'Fuel costs',
      parent_account_id: '11',
      parent_account_code: '5000',
      parent_account_name: 'Operating Expenses',
      is_active: true,
      is_system_account: false,
      level: 2,
    },
  ];

  const fetchAccounts = useCallback(() => {
    setLoading(true);
    
    // Simulate API call with setTimeout
    setTimeout(() => {
      let filtered = [...sampleAccounts];

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(acc => 
          acc.account_code.toLowerCase().includes(searchLower) ||
          acc.account_name.toLowerCase().includes(searchLower)
        );
      }

      // Apply type filter
      if (accountTypeFilter) {
        filtered = filtered.filter(acc => acc.account_type === accountTypeFilter);
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(acc => 
          statusFilter === 'active' ? acc.is_active : !acc.is_active
        );
      }

      // Sort by account code
      filtered.sort((a, b) => a.account_code.localeCompare(b.account_code));

      // Pagination
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedAccounts = filtered.slice(startIndex, endIndex);

      setAccounts(paginatedAccounts);
      setTotalPages(Math.ceil(filtered.length / pageSize));
      setLoading(false);
    }, 500);
  }, [search, accountTypeFilter, statusFilter, currentPage, pageSize]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Filter sections for FilterDropdown component
  const filterSections: FilterSection[] = [
    {
      id: 'accountType',
      title: 'Account Type',
      type: 'checkbox',
      options: [
        { id: AccountType.ASSET, label: 'Assets' },
        { id: AccountType.LIABILITY, label: 'Liabilities' },
        { id: AccountType.EQUITY, label: 'Equity' },
        { id: AccountType.REVENUE, label: 'Revenue' },
        { id: AccountType.EXPENSE, label: 'Expenses' },
      ],
      defaultValue: [],
    },
    {
      id: 'status',
      title: 'Status',
      type: 'radio',
      options: [
        { id: 'all', label: 'All' },
        { id: 'active', label: 'Active' },
        { id: 'archived', label: 'Archived' },
      ],
      defaultValue: 'active',
    },
  ];

  const handleFilterApply = (filterValues: Record<string, string | string[] | { from: string; to: string }>) => {
    const accountTypes = filterValues.accountType as string[];
    const status = filterValues.status as string;

    // If accountTypes is empty, show all types, otherwise filter by selected types
    if (accountTypes && accountTypes.length > 0) {
      setAccountTypeFilter(accountTypes[0]); // For now, we'll use the first selected type
      // TODO: Update fetchAccounts to handle multiple types
    } else {
      setAccountTypeFilter('');
    }

    setStatusFilter(status as 'active' | 'archived' | 'all');
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleAddAccount = async (formData: AccountFormData) => {
    try {
      // Find parent account details if parent_account_id is provided
      let parentAccount = undefined;
      if (formData.parent_account_id) {
        parentAccount = sampleAccounts.find(acc => acc.account_id === formData.parent_account_id);
      }

      const newAccount: ChartOfAccount = {
        account_id: `temp_${Date.now()}`,
        account_code: formData.account_code,
        account_name: formData.account_name,
        account_type: formData.account_type,
        description: formData.description,
        notes: formData.notes,
        parent_account_id: formData.parent_account_id,
        parent_account_code: parentAccount?.account_code,
        parent_account_name: parentAccount?.account_name,
        level: parentAccount ? 2 : 1,
        is_active: true,
        is_system_account: false,
      };

      // TODO: Replace with actual API call
      // For now, just add to sampleAccounts array
      sampleAccounts.push(newAccount);
      
      await showSuccess('Account created successfully!', 'Success');
      setShowAddModal(false);
      fetchAccounts(); // Refresh the table
    } catch (error) {
      console.error('Error adding account:', error);
      await showError('Failed to create account', 'Error');
    }
  };

  const handleView = (account: ChartOfAccount) => {
    setSelectedAccount(account);
    setShowViewModal(true);
  };

  const handleEdit = (account: ChartOfAccount) => {
    setSelectedAccount(account);
    setShowEditModal(true);
  };

  const handleAddChild = (account: ChartOfAccount) => {
    setSelectedAccount(account);
    setShowAddChildModal(true);
  };

  const handleExport = async () => {
    await showSuccess('Chart of Accounts exported successfully', 'Success');
  };

  const handleArchive = async (account: ChartOfAccount) => {
    if (!canArchiveAccount(account)) {
      await showError('Cannot archive system accounts', 'Error');
      return;
    }
    
    const childCount = getChildCount(account.account_id, sampleAccounts);
    if (childCount > 0) {
      await showError('Cannot archive account with child accounts', 'Error');
      return;
    }

    const result = await showConfirmation(
      `Are you sure you want to archive "${account.account_name}"?<br/>
      <span style="color: #666; font-size: 0.9em;">This account will no longer appear in active listings.</span>`,
      'Archive Account'
    );

    if (result.isConfirmed) {
      await showSuccess('Account archived successfully', 'Success');
      fetchAccounts();
    }
  };

  const handleRestore = async (account: ChartOfAccount) => {
    const result = await showConfirmation(
      `Restore account "${account.account_name}"?`,
      'Restore Account'
    );

    if (result.isConfirmed) {
      await showSuccess('Account restored successfully', 'Success');
      fetchAccounts();
    }
  };

  const renderActionButtons = (account: ChartOfAccount) => {
    if (!account.is_active) {
      // Archived account
      return (
        <div className="actionButtonsContainer">
          <button
            className="viewBtn"
            onClick={() => {
              setSelectedAccount(account);
              setShowViewModal(true);
            }}
            title="View Details"
          >
            <i className="ri-eye-line" />
          </button>
          <button
            className="successBtn"
            onClick={() => handleRestore(account)}
            title="Restore Account"
          >
            <i className="ri-refresh-line" />
          </button>
          <button
            className="infoBtn"
            onClick={() => {
              setSelectedAccount(account);
              setShowAuditTrailModal(true);
            }}
            title="Audit Trail"
          >
            <i className="ri-history-line" />
          </button>
        </div>
      );
    }

    // System account (view only)
    if (account.is_system_account) {
      return (
        <div className="actionButtonsContainer">
          <button
            className="viewBtn"
            onClick={() => {
              setSelectedAccount(account);
              setShowViewModal(true);
            }}
            title="View Details"
          >
            <i className="ri-eye-line" />
          </button>
          <button
            className="infoBtn"
            onClick={() => {
              setSelectedAccount(account);
              setShowAuditTrailModal(true);
            }}
            title="Audit Trail"
          >
            <i className="ri-history-line" />
          </button>
        </div>
      );
    }

    // Active account (full access)
    const childCount = getChildCount(account.account_id, sampleAccounts);
    
    return (
      <div className="actionButtonsContainer">
        <button
          className="viewBtn"
          onClick={() => {
            setSelectedAccount(account);
            setShowViewModal(true);
          }}
          title="View Details"
        >
          <i className="ri-eye-line" />
        </button>
        <button
          className="editBtn"
          onClick={() => {
            setSelectedAccount(account);
            setShowEditModal(true);
          }}
          title="Edit Account"
        >
          <i className="ri-edit-2-line" />
        </button>
        <button
          className="deleteBtn"
          onClick={() => handleArchive(account)}
          title="Archive Account"
          disabled={childCount > 0}
        >
          <i className="ri-archive-line" />
        </button>
        <button
          className="addBtn"
          onClick={() => {
            setSelectedAccount(account);
            setShowAddChildModal(true);
          }}
          title="Add Child Account"
        >
          <i className="ri-node-tree" />
        </button>
        <button
          className="infoBtn"
          onClick={() => {
            setSelectedAccount(account);
            setShowAuditTrailModal(true);
          }}
          title="Audit Trail"
        >
          <i className="ri-history-line" />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Chart of Accounts</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="elements">
        <h1 className="title">Chart of Accounts</h1>

        <div className="settings">
          {/* Search Bar */}
          <div className="searchBar">
            <i className="ri-search-line" />
            <input
              type="text"
              placeholder="Search account code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filters and Actions */}
          <div className="filters">
            <FilterDropdown
              sections={filterSections}
              onApply={handleFilterApply}
              initialValues={{
                accountType: [],
                status: statusFilter,
              }}
            />

            <button onClick={handleExport} id="export">
              <i className="ri-file-download-line" /> Generate CSV
            </button>

            <button 
              onClick={() => setShowValidateModal(true)} 
              className="validateBtn"
              title="Validate account balances"
            >
              <i className="ri-checkbox-circle-line" /> Validate
            </button>

            <button onClick={() => setShowAddModal(true)} id="addAccount">
              <i className="ri-add-line" /> Add Account
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th className="account-name">Account Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const childCount = getChildCount(account.account_id, sampleAccounts);
                  const isParent = childCount > 0;
                  
                  return (
                    <tr key={account.account_id}>
                      {/* Account Code */}
                      <td>{account.account_code}</td>

                      {/* Account Name with hierarchy indicator */}
                      <td className="account-name">
                        {account.parent_account_id && (
                          <span className="child-indicator">└─ </span>
                        )}
                        {account.account_name}
                        {account.parent_account_name && (
                          <div className="parent-account">
                            Parent: {account.parent_account_code} - {account.parent_account_name}
                          </div>
                        )}
                        {account.description && (
                          <div className="parent-account">{account.description}</div>
                        )}
                      </td>

                      {/* Type */}
                      <td>
                        <span className={`chip ${getAccountTypeClass(account.account_type)}`}>
                          {account.account_type}
                        </span>
                      </td>

                      {/* Status with child count */}
                      <td className="table-status">
                        <div className="status-chips">
                          <span className={`chip ${account.is_active ? 'active' : 'closed'}`}>
                            {account.is_active ? 'Active' : 'Archived'}
                          </span>
                          {account.is_system_account && (
                            <span className="chip Draft" style={{ fontSize: '11px' }}>
                              System
                            </span>
                          )}
                          {isParent && (
                            <span className="chip pending" style={{ fontSize: '11px' }}>
                              +{childCount} {childCount === 1 ? 'child' : 'children'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="actionButtonsContainer">
                          <button
                            className="viewBtn"
                            onClick={() => handleView(account)}
                            title="View Details"
                          >
                            <i className="ri-eye-line"></i>
                          </button>
                          <button
                            className="editBtn"
                            onClick={() => handleEdit(account)}
                            title="Edit"
                          >
                            <i className="ri-pencil-line"></i>
                          </button>
                          {canHaveChildren(account) && (
                            <button
                              className="addBtn"
                              onClick={() => handleAddChild(account)}
                              title="Add Child Account"
                            >
                              <i className="ri-add-line"></i>
                            </button>
                          )}
                          {canArchiveAccount(account) && (
                            <button
                              className="deleteBtn"
                              onClick={() => handleArchive(account)}
                              title="Archive"
                            >
                              <i className="ri-archive-line"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {accounts.length === 0 && (
              <p className="noRecords">No accounts found matching your criteria.</p>
            )}
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddAccountModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddAccount}
          accounts={sampleAccounts}
        />
      )}

      {showEditModal && selectedAccount && (
        <EditAccountModal
          account={selectedAccount}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAccount(null);
          }}
          onSubmit={async (data) => {
            await showSuccess('Account updated successfully', 'Success');
            setShowEditModal(false);
            fetchAccounts();
          }}
        />
      )}

      {showViewModal && selectedAccount && (
        <ViewAccountModal
          account={selectedAccount}
          onClose={() => {
            setShowViewModal(false);
            setSelectedAccount(null);
          }}
        />
      )}

      {showAddChildModal && selectedAccount && (
        <AddChildAccountModal
          parentAccount={selectedAccount}
          onClose={() => {
            setShowAddChildModal(false);
            setSelectedAccount(null);
          }}
          onSubmit={async (data) => {
            await showSuccess('Child account created successfully', 'Success');
            setShowAddChildModal(false);
            fetchAccounts();
          }}
        />
      )}

      {showValidateModal && (
        <ValidateBalanceModal
          onClose={() => setShowValidateModal(false)}
          onValidate={fetchAccounts}
        />
      )}

      {showAuditTrailModal && selectedAccount && (
        <AuditTrailModal
          recordId={selectedAccount.account_id}
          recordType="ChartOfAccount"
          recordName={`${selectedAccount.account_code} - ${selectedAccount.account_name}`}
          onClose={() => {
            setShowAuditTrailModal(false);
            setSelectedAccount(null);
          }}
        />
      )}
    </div>
  );
};

export default ChartOfAccountsPage;
