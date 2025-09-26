import React, { useState, useMemo } from "react";
import PaginationComponent from "./pagination"; // Reuse your pagination
import Loading from "./loading"; // Reuse your loading spinner
import "../styles/components/busSelector.css";
import "../styles/components/revenueBusSelector.css";
import "../styles/components/table.css";
import type { Assignment } from '@/lib/operations/assignments';
import { formatDateTime } from '../utility/dateFormatter';
import ModalHeader from './ModalHeader';

type Employee = {
  employee_id: string;
  name: string;
};

type Category = {
  category_id: string;
  name: string;
};


type RevenueSourceSelectorProps = {
  assignments: Assignment[];
  employees: Employee[];
  categories: Category[]; 
  selectedCategoryId: string;
  onSelect: (assignment: Assignment) => void;
  onClose: () => void;
  isOpen: boolean;
};

const DEFAULT_PAGE_SIZE = 10;

const RevenueSourceSelector: React.FC<RevenueSourceSelectorProps> = ({
  assignments,
  employees,
  categories,
  selectedCategoryId,
  onSelect,
  onClose,
  isOpen,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading] = useState(false);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Filter assignments based on selected category (Boundary/Percentage/Bus Rental) and search
  const filteredAssignments = useMemo(() => {
    let filtered = assignments;
    if (!selectedCategoryId) return [];
    const selectedCategory = categories.find(cat => cat.category_id === selectedCategoryId);
    if (!selectedCategory) return [];
    // Normalize by removing all non-alphanumeric characters and lowercasing (e.g., 'Bus_Rental' -> 'busrental')
    const normalizeKey = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    filtered = filtered.filter(a => {
      const nameKey = normalizeKey(selectedCategory.name);
      const atKey = normalizeKey(a.assignment_type);
      if (nameKey === "boundary") return atKey === "boundary";
      if (nameKey === "percentage") return atKey === "percentage";
      if (nameKey === "busrental") return atKey === "busrental" || !a.assignment_type;
      return false;
    });
    if (search.trim()) {
      filtered = filtered.filter(a =>
        (a.bus_plate_number?.toLowerCase().includes(search.toLowerCase()) || false) ||
        a.bus_route.toLowerCase().includes(search.toLowerCase())
      );
    }
    return filtered.sort(
      (a, b) => new Date(a.date_assigned).getTime() - new Date(b.date_assigned).getTime()
    );
  }, [assignments, categories, selectedCategoryId, search]);

  const totalPages = Math.ceil(filteredAssignments.length / pageSize || 1);
  const paginatedAssignments = filteredAssignments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const formatAmount = (assignment: Assignment) => {
    const selectedCategory = categories.find(cat => cat.category_id === selectedCategoryId);
    let amount = assignment.trip_revenue;
    // Use the broadened normalization key for matching
    const normalizeKey = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (normalizeKey(selectedCategory?.name) === "percentage" && assignment.assignment_value) {
      amount = assignment.trip_revenue * (assignment.assignment_value);
    }
    return `₱${amount.toLocaleString()}`;
  };

  const getEmployeeName = (id: string) =>
    employees.find(e => e.employee_id === id)?.name || "N/A";

  if (!isOpen) return null;

  return (
    <div className="revenue-modalOverlay">
      <div className="addRevenueModal">
        <ModalHeader title="Select Assignment for Revenue" onClose={onClose} />
        <div className="revenue-modalBody">
          <input
            type="text"
            placeholder="Search by plate or route"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="formInput"
            style={{ marginBottom: 12, width: "100%" }}
          />
          {isLoading ? (
            <Loading />
          ) : (
            <div className="tableContainer">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Date Assigned</th>
                    <th>Amount</th>
                    <th>Plate Number</th>
                    <th>Bus Type</th>
                    <th>Route</th>
                    <th>Driver</th>
                    <th>Conductor</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center" }}>
                        No assignments found.
                      </td>
                    </tr>
                  ) : (
                    paginatedAssignments.map((assignment, idx) => {
                      const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                      return (
                        <tr
                          key={`${assignment.assignment_id}-${assignment.date_assigned}-${idx}`}
                          onClick={() => {
                            onSelect(assignment);
                            onClose();
                          }}
                        >
                          <td>{rowNumber}</td>
                          <td>
                              {formatDateTime(assignment.date_assigned)
                                .split("(")
                                .map((part, index) =>
                                  index === 0 ? (
                                    <div key={index}>{part.trim()}</div>
                                  ) : (
                                    <div key={index}>({part}</div>
                                  )
                                )}
                          </td>
                          <td>{formatAmount(assignment)}</td>
                          <td>{assignment.bus_plate_number || 'N/A'}</td>
                          <td>{assignment.bus_type || 'N/A'}</td>
                          <td>{assignment.bus_route}</td>
                          <td>{assignment.driver_name || (assignment.driver_id ? getEmployeeName(assignment.driver_id) : 'N/A')}</td>
                          <td>{assignment.conductor_name || (assignment.conductor_id ? getEmployeeName(assignment.conductor_id) : 'N/A')}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
          <PaginationComponent
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        </div>
      </div>
    </div>
  );
};

export default RevenueSourceSelector;