/**
 * Revenue Filter Component - Wrapper
 * 
 * This is a lightweight wrapper around the base FilterDropdown component.
 * It provides Revenue-specific fields and configuration.
 * 
 * The base component (filter.tsx) handles all UI, styling, and interactions.
 */

import React from "react";
import FilterDropdown, { FilterSection, FilterOption } from "./filter";

// Revenue-specific filter structure
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
    
    // Define Revenue-specific filter sections
    const filterSections: FilterSection[] = [
        // Revenue Source filter
        {
            id: 'sources',
            title: 'Revenue Source',
            type: 'checkbox',
            icon: 'ri-money-dollar-circle-line',
            options: sources,
            defaultValue: []
        },
        // Payment Method filter
        {
            id: 'paymentMethods',
            title: 'Payment Method',
            type: 'checkbox',
            icon: 'ri-bank-card-line',
            options: paymentMethods,
            defaultValue: []
        },
        // Transaction Date Range filter
        {
            id: 'dateRange',
            title: 'Transaction Date',
            type: 'dateRange',
            icon: 'ri-calendar-line',
            defaultValue: { from: '', to: '' }
        },
        // Amount Range filter
        {
            id: 'amountRange',
            title: 'Amount Range',
            type: 'numberRange',
            icon: 'ri-price-tag-3-line',
            defaultValue: { from: '', to: '' },
            numberConfig: {
                min: 0,
                step: 0.01,
                prefix: '₱'
            }
        }
    ];

    // Convert initial values to the format expected by base component
    const convertedInitialValues = {
        sources: initialValues.sources || [],
        paymentMethods: initialValues.paymentMethods || [],
        dateRange: initialValues.dateRange || { from: '', to: '' },
        amountRange: initialValues.amountRange || { from: '', to: '' }
    };

    // Handle apply from base component
    const handleApply = (filterValues: Record<string, string | string[] | { from: string; to: string }>) => {
        // Convert back to Revenue-specific format and call the parent handler
        onApply({
            sources: (filterValues.sources as string[]) || [],
            paymentMethods: (filterValues.paymentMethods as string[]) || [],
            dateRange: (filterValues.dateRange as { from: string; to: string }) || { from: '', to: '' },
            amountRange: (filterValues.amountRange as { from: string; to: string }) || { from: '', to: '' }
        });
    };

    // Use the base FilterDropdown component with Revenue-specific configuration
    return (
        <FilterDropdown
            sections={filterSections}
            onApply={handleApply}
            initialValues={convertedInitialValues}
            title="Filter Revenue"
            showBadge={true}
        />
    );
}
