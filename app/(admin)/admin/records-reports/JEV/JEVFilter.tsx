'use client';

import React from 'react';
import FilterDropdown, { FilterSection } from '../../../../Components/filter';
import { JournalEntryFilters, EntryType, JournalStatus } from '../../../../types/jev';

interface JEVFilterProps {
  onApply: (filters: JournalEntryFilters) => void;
  initialValues: JournalEntryFilters;
}

const JEVFilter: React.FC<JEVFilterProps> = ({ onApply, initialValues }) => {
  // Convert JournalEntryFilters to the format expected by FilterDropdown
  const convertToFilterFormat = (filters: JournalEntryFilters) => {
    return {
      search: filters.search || '',
      dateRange: filters.date_from && filters.date_to ? {
        from: filters.date_from,
        to: filters.date_to
      } : { from: '', to: '' },
      entry_type: filters.entry_type || '',
      status: filters.status || '',
      source_module: filters.source_module || '',
      account_id: filters.account_id || ''
    };
  };

  // Convert back from FilterDropdown format to JournalEntryFilters
  const convertFromFilterFormat = (filterValues: Record<string, string | string[] | { from: string; to: string }>): JournalEntryFilters => {
    const dateRange = filterValues.dateRange as { from: string; to: string } || { from: '', to: '' };

    return {
      search: filterValues.search as string || '',
      date_from: dateRange.from || '',
      date_to: dateRange.to || '',
      entry_type: (filterValues.entry_type as string) || '',
      status: (filterValues.status as string) || '',
      source_module: filterValues.source_module as string || '',
      account_id: filterValues.account_id as string || ''
    } as JournalEntryFilters;
  };

  const filterSections: FilterSection[] = [
    {
      id: 'search',
      title: 'Search',
      type: 'radio', // Using radio for single text input
      placeholder: 'Search JEV number, description, reference...',
      defaultValue: ''
    },
    {
      id: 'dateRange',
      title: 'Transaction Date',
      type: 'dateRange',
      icon: 'ri-calendar-line',
      defaultValue: { from: '', to: '' }
    },
    {
      id: 'entry_type',
      title: 'Entry Type',
      type: 'radio',
      icon: 'ri-file-list-line',
      options: [
        { id: '', label: 'All Types' },
        { id: EntryType.MANUAL, label: 'Manual' },
        { id: EntryType.AUTO_REVENUE, label: 'Auto Revenue' },
        { id: EntryType.AUTO_EXPENSE, label: 'Auto Expense' },
        { id: EntryType.AUTO_PAYROLL, label: 'Auto Payroll' },
        { id: EntryType.AUTO_LOAN, label: 'Auto Loan' },
        { id: EntryType.AUTO_PURCHASE, label: 'Auto Purchase' },
        { id: EntryType.AUTO_REFUND, label: 'Auto Refund' },
        { id: EntryType.ADJUSTMENT, label: 'Adjustment' },
        { id: EntryType.CLOSING, label: 'Closing' }
      ],
      defaultValue: ''
    },
    {
      id: 'status',
      title: 'Status',
      type: 'radio',
      icon: 'ri-information-line',
      options: [
        { id: '', label: 'All Status' },
        { id: JournalStatus.DRAFT, label: 'Draft' },
        { id: JournalStatus.POSTED, label: 'Posted' },
        { id: JournalStatus.REVERSED, label: 'Reversed' }
      ],
      defaultValue: ''
    },
    {
      id: 'source_module',
      title: 'Source Module',
      type: 'radio',
      icon: 'ri-building-line',
      options: [
        { id: '', label: 'All Modules' },
        { id: 'PURCHASE', label: 'Purchase' },
        { id: 'PAYROLL', label: 'Payroll' },
        { id: 'REVENUE', label: 'Revenue' },
        { id: 'EXPENSE', label: 'Expense' },
        { id: 'LOAN', label: 'Loan' },
        { id: 'MANUAL', label: 'Manual' }
      ],
      defaultValue: ''
    }
  ];

  const handleFilterApply = (filterValues: Record<string, string | string[] | { from: string; to: string }>) => {
    const jevFilters = convertFromFilterFormat(filterValues);
    onApply(jevFilters);
  };

  return (
    <FilterDropdown
      sections={filterSections}
      onApply={handleFilterApply}
      initialValues={convertToFilterFormat(initialValues)}
      title="JEV Filters"
      className="jev-filter"
    />
  );
};

export default JEVFilter;