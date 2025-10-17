/**
 * Revenue Filter Component
 * Custom filter dropdown for the Revenue page with support for amount ranges
 */

import React, { useState, useRef, useEffect } from "react";
import '../styles/components/filter.css';

interface FilterOption {
    id: string;
    label: string;
}

interface RevenueFilterValues {
    sources: string[];
    paymentMethods: string[];
    dateRange: { from: string; to: string };
    amountRange: { from: string; to: string };
}

interface RevenueFilterProps {
    sources: FilterOption[];
    paymentMethods: FilterOption[];
    onApply: (filterValues: RevenueFilterValues) => void;
    initialValues?: Partial<RevenueFilterValues>;
}

export default function RevenueFilter({
    sources,
    paymentMethods,
    onApply,
    initialValues = {}
}: RevenueFilterProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);

    const [filterValues, setFilterValues] = useState<RevenueFilterValues>({
        sources: initialValues.sources || [],
        paymentMethods: initialValues.paymentMethods || [],
        dateRange: initialValues.dateRange || { from: '', to: '' },
        amountRange: initialValues.amountRange || { from: '', to: '' }
    });

    // Handle clicks outside the dropdown to close it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('.filter-btn')) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const handleCheckboxChange = (category: 'sources' | 'paymentMethods', optionId: string) => {
        setFilterValues(prev => {
            const currentValues = prev[category];
            const newValues = currentValues.includes(optionId)
                ? currentValues.filter(item => item !== optionId)
                : [...currentValues, optionId];

            return {
                ...prev,
                [category]: newValues
            };
        });
    };

    const handleDateChange = (field: 'from' | 'to', value: string) => {
        setFilterValues(prev => ({
            ...prev,
            dateRange: {
                ...prev.dateRange,
                [field]: value
            }
        }));
    };

    const handleAmountChange = (field: 'from' | 'to', value: string) => {
        setFilterValues(prev => ({
            ...prev,
            amountRange: {
                ...prev.amountRange,
                [field]: value
            }
        }));
    };

    const handleApply = () => {
        onApply(filterValues);
        setIsOpen(false);
    };

    const handleClearAll = () => {
        setFilterValues({
            sources: [],
            paymentMethods: [],
            dateRange: { from: '', to: '' },
            amountRange: { from: '', to: '' }
        });
    };

    const isCheckboxSelected = (category: 'sources' | 'paymentMethods', optionId: string) => {
        return filterValues[category].includes(optionId);
    };

    // Count active filters
    const activeFilterCount = 
        filterValues.sources.length +
        filterValues.paymentMethods.length +
        (filterValues.dateRange.from || filterValues.dateRange.to ? 1 : 0) +
        (filterValues.amountRange.from || filterValues.amountRange.to ? 1 : 0);

    return (
        <div className="filter-dropdown-container">
            <button
                className="filter-btn"
                onClick={toggleDropdown}
                title="Filter Revenue Records"
            >
                <i className="ri-filter-line" />
                Filter
                {activeFilterCount > 0 && (
                    <span className="filter-badge">{activeFilterCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="filter-dropdown" ref={dropdownRef}>
                    <div className="filter-header">
                        <h3>
                            <i className="ri-filter-3-line" />
                            Filter Revenue
                        </h3>
                        <button className="clear-all-btn" onClick={handleClearAll}>
                            <i className="ri-delete-bin-line" />
                            Clear All
                        </button>
                    </div>

                    <div className="filter-content">
                        {/* Revenue Sources */}
                        {sources.length > 0 && (
                            <div className="filter-section">
                                <h4>
                                    <i className="ri-money-dollar-circle-line" />
                                    Revenue Source
                                </h4>
                                <div className="filter-options">
                                    {sources.map(source => (
                                        <div
                                            key={source.id}
                                            className={`filter-option ${isCheckboxSelected('sources', source.id) ? 'selected' : ''}`}
                                            onClick={() => handleCheckboxChange('sources', source.id)}
                                        >
                                            {source.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Payment Methods */}
                        {paymentMethods.length > 0 && (
                            <div className="filter-section">
                                <h4>
                                    <i className="ri-bank-card-line" />
                                    Payment Method
                                </h4>
                                <div className="filter-options">
                                    {paymentMethods.map(method => (
                                        <div
                                            key={method.id}
                                            className={`filter-option ${isCheckboxSelected('paymentMethods', method.id) ? 'selected' : ''}`}
                                            onClick={() => handleCheckboxChange('paymentMethods', method.id)}
                                        >
                                            {method.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Transaction Date Range */}
                        <div className="filter-section">
                            <h4>
                                <i className="ri-calendar-line" />
                                Transaction Date
                            </h4>
                            <div className="date-range-inputs">
                                <div className="date-field">
                                    <label>From:</label>
                                    <input
                                        type="date"
                                        value={filterValues.dateRange.from}
                                        onChange={(e) => handleDateChange('from', e.target.value)}
                                    />
                                </div>
                                <div className="date-field">
                                    <label>To:</label>
                                    <input
                                        type="date"
                                        value={filterValues.dateRange.to}
                                        onChange={(e) => handleDateChange('to', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Amount Range */}
                        <div className="filter-section">
                            <h4>
                                <i className="ri-price-tag-3-line" />
                                Amount Range
                            </h4>
                            <div className="amount-range-inputs">
                                <div className="amount-field">
                                    <label>Min Amount (₱):</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={filterValues.amountRange.from}
                                        onChange={(e) => handleAmountChange('from', e.target.value)}
                                    />
                                </div>
                                <div className="amount-field">
                                    <label>Max Amount (₱):</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={filterValues.amountRange.to}
                                        onChange={(e) => handleAmountChange('to', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="filter-actions">
                        <button className="cancel-btn" onClick={toggleDropdown}>
                            <i className="ri-close-line" />
                            Cancel
                        </button>
                        <button className="apply-btn" onClick={handleApply}>
                            <i className="ri-check-line" />
                            Apply Filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
