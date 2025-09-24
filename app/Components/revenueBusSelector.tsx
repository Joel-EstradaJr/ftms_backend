import React, { useState, useMemo } from "react";
import PaginationComponent from "./pagination"; // Reuse your pagination
import Loading from "./loading"; // Reuse your loading spinner
import "../styles/components/revenueBusSelector.css";
import type { Assignment } from '@/lib/operations/assignments';
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

const PAGE_SIZE = 5;

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

  // Filter assignments based on selected category (Boundary/Percentage/Bus Rental) and search
  const filteredAssignments = useMemo(() => {
    let filtered = assignments;
    if (!selectedCategoryId) return [];
    const selectedCategory = categories.find(cat => cat.category_id === selectedCategoryId);
    if (!selectedCategory) return [];
    const normalize = (s: string) => (s || '').replace(/_/g, ' ').trim();
    filtered = filtered.filter(a => {
      const name = normalize(selectedCategory.name);
      if (name === "Boundary") return a.assignment_type === "Boundary";
      if (name === "Percentage") return a.assignment_type === "Percentage";
      if (name === "Bus Rental") return a.assignment_type === "Bus Rental" || !a.assignment_type;
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

  const totalPages = Math.ceil(filteredAssignments.length / PAGE_SIZE);
  const paginatedAssignments = filteredAssignments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const formatAmount = (assignment: Assignment) => {
    const selectedCategory = categories.find(cat => cat.category_id === selectedCategoryId);
    let amount = assignment.trip_revenue;
    if (selectedCategory?.name === "Percentage" && assignment.assignment_value) {
      amount = assignment.trip_revenue * (assignment.assignment_value);
    }
    return `₱${amount.toLocaleString()}`;
  };

  const getEmployeeName = (id: string) =>
    employees.find(e => e.employee_id === id)?.name || "N/A";

  if (!isOpen) return null;

  return (
    <div className="modalOverlay">
      <div className="addRevenueModal">
        <ModalHeader title="Select Assignment" onClose={onClose} />
        <div className="revenue_modalContent">
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
            <table id="revenue-assignment-table">
              <thead>
                <tr>
                  <th>Date Assigned</th>
                  <th>Amount</th>
                  <th>Bus Plate Number</th>
                  <th>Bus Type</th>
                  <th>Bus Route</th>
                  <th>Driver</th>
                  <th>Conductor</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center" }}>
                      No assignments found.
                    </td>
                  </tr>
                ) : (
                  paginatedAssignments.map((assignment, index) => (
                    <tr
                      key={`${assignment.assignment_id}-${assignment.date_assigned}-${index}`}
                      onClick={() => {
                        onSelect(assignment);
                        onClose();
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{assignment.date_assigned.split("T")[0]}</td>
                      <td>{formatAmount(assignment)}</td>
                      <td>{assignment.bus_plate_number || 'N/A'}</td>
                      <td>{assignment.bus_type || 'N/A'}</td>
                      <td>{assignment.bus_route}</td>
                      <td>{assignment.driver_name || (assignment.driver_id ? getEmployeeName(assignment.driver_id) : 'N/A')}</td>
                      <td>{assignment.conductor_name || (assignment.conductor_id ? getEmployeeName(assignment.conductor_id) : 'N/A')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          <PaginationComponent
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            onPageSizeChange={() => {}}
          />
        </div>
      </div>
    </div>
  );
};

export default RevenueSourceSelector;