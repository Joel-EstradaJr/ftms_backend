import React, { useState, useRef, useEffect } from "react";
import '../styles/components/filter.css';

// Generic filter option type
export interface FilterOption {
    id: string;
    label: string;
}

// Types of filter fields we support
export type FilterFieldType = 'dateRange' | 'checkbox' | 'radio' | 'numberRange';

// Definition for a single filter section
export interface FilterSection {
    id: string;
    title: string;
    type: FilterFieldType;
    icon?: string; // Remix icon class (e.g., 'ri-calendar-line')
    options?: FilterOption[];
    defaultValue?: string | string[] | { from: string; to: string };
    placeholder?: string;
    numberConfig?: {
        min?: number;
        max?: number;
        step?: number;
        prefix?: string; // e.g., '₱' for currency
    };
}

// Props for the FilterDropdown component
export interface FilterDropdownProps {
    sections: FilterSection[];
    onApply: (filterValues: Record<string, string | string[] | { from: string; to: string }>) => void;
    initialValues?: Record<string, string | string[] | { from: string; to: string }>;
    className?: string;
    title?: string; // Optional custom title (default: "Filter")
    showBadge?: boolean; // Show active filter count badge (default: true)
}

export default function FilterDropdown({
    sections,
    onApply,
    initialValues = {},
    className = "",
    title = "Filter",
    showBadge = true
}: FilterDropdownProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);

    // Get truly default values (ignoring initialValues)
    const getTrueDefaultValues = () => {
        const defaults: Record<string, string | string[] | { from: string; to: string }> = {};

        sections.forEach(section => {
            if (section.defaultValue !== undefined) {
                defaults[section.id] = section.defaultValue;
            } else {
                // Set appropriate default based on filter type
                switch (section.type) {
                    case 'dateRange':
                    case 'numberRange':
                        defaults[section.id] = { from: '', to: '' };
                        break;
                    case 'checkbox':
                        defaults[section.id] = [];
                        break;
                    case 'radio':
                        defaults[section.id] = '';
                        break;
                }
            }
        });

        return defaults;
    };

    // Initialize filter values with initialValues (last applied state)
    const getInitialFilterValues = () => {
        const defaults = getTrueDefaultValues();
        const initial: Record<string, string | string[] | { from: string; to: string }> = {};

        sections.forEach(section => {
            if (initialValues[section.id] !== undefined) {
                initial[section.id] = initialValues[section.id];
            } else {
                initial[section.id] = defaults[section.id];
            }
        });

        return initial;
    };

    const [filterValues, setFilterValues] = useState<Record<string, string | string[] | { from: string; to: string }>>(getInitialFilterValues());

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

    // Toggle dropdown visibility
    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    // Handle date range changes
    const handleDateRangeChange = (sectionId: string, field: "from" | "to", value: string) => {
        setFilterValues({
            ...filterValues,
            [sectionId]: {
                ...filterValues[sectionId] as { from: string; to: string }, // Type assertion
                [field]: value
            }
        });
    };

    // Handle checkbox selection (multiple selection)
    const handleCheckboxChange = (sectionId: string, optionId: string) => {
        const currentValues = filterValues[sectionId] as string[] || [];
        const newValues = currentValues.includes(optionId)
            ? currentValues.filter((item: string) => item !== optionId)
            : [...currentValues, optionId];

        setFilterValues({
            ...filterValues,
            [sectionId]: newValues
        });
    };

    // Handle radio selection (single selection)
    const handleRadioChange = (sectionId: string, value: string) => {
        setFilterValues({
            ...filterValues,
            [sectionId]: value
        });
    };

    // Apply filters
    const handleApply = () => {
        onApply(filterValues);
        setIsOpen(false);
    };

    // Clear all filters - reset to true defaults and apply immediately
    const handleClearAll = () => {
        const defaults = getTrueDefaultValues();
        setFilterValues(defaults);
        onApply(defaults); // Apply the cleared filters immediately
        setIsOpen(false); // Close the dropdown
    };

    // Check if a checkbox option is selected
    const isCheckboxSelected = (sectionId: string, optionId: string) => {
        const values = filterValues[sectionId] as string[] || [];
        return values.includes(optionId);
    };

    // Count active filters
    const countActiveFilters = () => {
        let count = 0;
        sections.forEach(section => {
            const value = filterValues[section.id];
            if (section.type === 'checkbox' && Array.isArray(value) && value.length > 0) {
                count++;
            } else if (section.type === 'radio' && value && value !== '') {
                count++;
            } else if ((section.type === 'dateRange' || section.type === 'numberRange') && 
                       typeof value === 'object' && 
                       ((value as { from: string; to: string }).from || (value as { from: string; to: string }).to)) {
                count++;
            }
        });
        return count;
    };

    // Render field based on type
    const renderFilterField = (section: FilterSection) => {
        switch (section.type) {
            case 'dateRange':
                return (
                    <div className="date-range-inputs">
                        <div className="date-field">
                            <label>From:</label>
                            <input
                                type="date"
                                value={(filterValues[section.id] as { from: string; to: string })?.from || ''}
                                onChange={(e) => handleDateRangeChange(section.id, "from", e.target.value)}
                                placeholder={section.placeholder || "mm/dd/yyyy"}
                            />
                        </div>
                        <div className="date-field">
                            <label>To:</label>
                            <input
                                type="date"
                                value={(filterValues[section.id] as { from: string; to: string })?.to || ''}
                                onChange={(e) => handleDateRangeChange(section.id, "to", e.target.value)}
                                placeholder={section.placeholder || "mm/dd/yyyy"}
                            />
                        </div>
                    </div>
                );

            case 'numberRange':
                const config = section.numberConfig || {};
                return (
                    <div className="amount-range-inputs">
                        <div className="amount-field">
                            <label>Min {config.prefix || ''}:</label>
                            <input
                                type="number"
                                min={config.min || 0}
                                max={config.max}
                                step={config.step || 0.01}
                                placeholder={section.placeholder || "0.00"}
                                value={(filterValues[section.id] as { from: string; to: string })?.from || ''}
                                onChange={(e) => handleDateRangeChange(section.id, "from", e.target.value)}
                            />
                        </div>
                        <div className="amount-field">
                            <label>Max {config.prefix || ''}:</label>
                            <input
                                type="number"
                                min={config.min || 0}
                                max={config.max}
                                step={config.step || 0.01}
                                placeholder={section.placeholder || "0.00"}
                                value={(filterValues[section.id] as { from: string; to: string })?.to || ''}
                                onChange={(e) => handleDateRangeChange(section.id, "to", e.target.value)}
                            />
                        </div>
                    </div>
                );

            case 'checkbox':
                return (
                    <div className="filter-options">
                        {section.options?.map((option) => (
                            <div
                                key={option.id}
                                className={`filter-option ${isCheckboxSelected(section.id, option.id) ? "selected" : ""}`}
                                onClick={() => handleCheckboxChange(section.id, option.id)}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                );

            case 'radio':
                return (
                    <div className="filter-options">
                        {section.options?.map((option) => (
                            <div
                                key={option.id}
                                className={`filter-option ${filterValues[section.id] === option.id ? "selected" : ""}`}
                                onClick={() => handleRadioChange(section.id, option.id)}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                );

            default:
                return null;
        }
    };

    const activeFilterCount = countActiveFilters();

    return (
        <div className={`filter-dropdown-container ${className}`}>
            <button 
                className="filter-btn" 
                onClick={toggleDropdown}
                title={`Filter ${title}`}
            >
                <i className="ri-filter-line" />
                Filter
                {showBadge && activeFilterCount > 0 && (
                    <span className="filter-badge">{activeFilterCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="filter-dropdown" ref={dropdownRef}>
                    <div className="filter-header">
                        <h3>
                            <i className="ri-filter-3-line" />
                            {title}
                        </h3>
                        <button className="clear-all-btn" onClick={handleClearAll}>
                            <i className="ri-delete-bin-line" />
                            Clear All
                        </button>
                    </div>

                    <div className="filter-content">
                        {sections.map((section) => (
                            <div className="filter-section" key={section.id}>
                                <h4>
                                    {section.icon && <i className={section.icon} />}
                                    {section.title}
                                </h4>
                                {renderFilterField(section)}
                            </div>
                        ))}
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
