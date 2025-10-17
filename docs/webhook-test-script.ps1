# Webhook Testing Script for PowerShell
# Usage: .\webhook-test-script.ps1

$baseUrl = "http://localhost:3000"
$webhookEndpoint = "$baseUrl/api/webhooks/data-sync"
$bulkSyncEndpoint = "$baseUrl/api/webhooks/data-sync/bulk-sync"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "WEBHOOK TESTING SCRIPT" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Function to send webhook
function Send-Webhook {
    param (
        [string]$TestName,
        [string]$Endpoint,
        [hashtable]$Payload
    )
    
    Write-Host "Testing: $TestName" -ForegroundColor Yellow
    
    try {
        $body = $Payload | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri $Endpoint -Method Post -Body $body -ContentType "application/json"
        
        Write-Host "  ✓ Success" -ForegroundColor Green
        Write-Host "  Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
        Write-Host ""
        return $true
    }
    catch {
        Write-Host "  ✗ Failed" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        return $false
    }
}

# Test counters
$totalTests = 0
$passedTests = 0

# 1. Health Check
Write-Host "[1] Health Check" -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri $webhookEndpoint -Method Get
    Write-Host "  ✓ Service: $($health.service)" -ForegroundColor Green
    Write-Host "  ✓ Status: $($health.status)" -ForegroundColor Green
    Write-Host ""
    $passedTests++
}
catch {
    Write-Host "  ✗ Health check failed" -ForegroundColor Red
    Write-Host ""
}
$totalTests++

# 2. Test Employee INSERT
$payload = @{
    source = "hr_employees"
    action = "INSERT"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    data = @{
        employeeNumber = "TEST-PS-001"
        firstName = "PowerShell"
        middleName = "Test"
        lastName = "Employee"
        phone = "0999-123-4567"
        position = "Driver"
        departmentId = 1
        department = "Operations"
    }
}
if (Send-Webhook -TestName "[2] Employee INSERT" -Endpoint $webhookEndpoint -Payload $payload) {
    $passedTests++
}
$totalTests++

# 3. Test Employee UPDATE
$payload.action = "UPDATE"
$payload.data.firstName = "PowerShell-Updated"
$payload.data.position = "Senior Driver"
$payload.timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

if (Send-Webhook -TestName "[3] Employee UPDATE" -Endpoint $webhookEndpoint -Payload $payload) {
    $passedTests++
}
$totalTests++

# 4. Test Payroll INSERT
$payrollPayload = @{
    source = "hr_payroll"
    action = "INSERT"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    data = @{
        employeeNumber = "TEST-PS-002"
        firstName = "Jane"
        middleName = "Marie"
        lastName = "Doe"
        suffix = $null
        employeeStatus = "ACTIVE"
        hiredate = "2024-01-15"
        terminationDate = $null
        basicRate = "12000.00"
        position = @{
            positionName = "Conductor"
            department = @{
                departmentName = "Operations"
            }
        }
        attendances = @(
            @{
                date = "2025-01-15"
                status = "PRESENT"
            },
            @{
                date = "2025-01-16"
                status = "PRESENT"
            }
        )
        benefits = @(
            @{
                value = "2000.00"
                frequency = "MONTHLY"
                effectiveDate = "2024-01-15"
                endDate = $null
                isActive = $true
                benefitType = @{
                    name = "Transportation Allowance"
                }
            }
        )
        deductions = @(
            @{
                type = "LOAN"
                value = "500.00"
                frequency = "MONTHLY"
                effectiveDate = "2024-02-01"
                endDate = $null
                isActive = $true
                deductionType = @{
                    name = "Company Loan"
                }
            }
        )
    }
}

if (Send-Webhook -TestName "[4] Payroll INSERT (Complex)" -Endpoint $webhookEndpoint -Payload $payrollPayload) {
    $passedTests++
}
$totalTests++

# 5. Test Bus Trip INSERT
$busTripPayload = @{
    source = "op_bus_trips"
    action = "INSERT"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    data = @{
        assignment_id = 99999
        bus_trip_id = 88888
        bus_route = "Cebu-Manila"
        is_revenue_recorded = $false
        is_expense_recorded = $false
        date_assigned = (Get-Date).ToString("yyyy-MM-dd")
        trip_fuel_expense = "5000.00"
        trip_revenue = "25000.00"
        assignment_type = "BOUNDARY"
        assignment_value = "8000.00"
        payment_method = "CASH"
        driver_name = "PowerShell Driver"
        conductor_name = "PowerShell Conductor"
        bus_plate_number = "ABC-PS-001"
        bus_type = "REGULAR"
        body_number = "BUS-PS-001"
    }
}

if (Send-Webhook -TestName "[5] Bus Trip INSERT" -Endpoint $webhookEndpoint -Payload $busTripPayload) {
    $passedTests++
}
$totalTests++

# 6. Test Bus Trip UPDATE (Mark Revenue Recorded)
$busTripPayload.action = "UPDATE"
$busTripPayload.data.is_revenue_recorded = $true
$busTripPayload.timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

if (Send-Webhook -TestName "[6] Bus Trip UPDATE" -Endpoint $webhookEndpoint -Payload $busTripPayload) {
    $passedTests++
}
$totalTests++

# 7. Test Bulk Sync Employees
$bulkPayload = @{
    source = "hr_employees"
    clearExisting = $false
    data = @(
        @{
            employeeNumber = "BULK-PS-001"
            firstName = "Alice"
            middleName = "Ann"
            lastName = "Anderson"
            phone = "0999-111-1111"
            position = "Driver"
            departmentId = 1
            department = "Operations"
        },
        @{
            employeeNumber = "BULK-PS-002"
            firstName = "Bob"
            middleName = "Bruce"
            lastName = "Brown"
            phone = "0999-222-2222"
            position = "Conductor"
            departmentId = 1
            department = "Operations"
        },
        @{
            employeeNumber = "BULK-PS-003"
            firstName = "Carol"
            middleName = "Claire"
            lastName = "Clark"
            phone = "0999-333-3333"
            position = "Mechanic"
            departmentId = 2
            department = "Maintenance"
        }
    )
}

if (Send-Webhook -TestName "[7] Bulk Sync Employees - 3 records" -Endpoint $bulkSyncEndpoint -Payload $bulkPayload) {
    $passedTests++
}
$totalTests++

# 8. Test DELETE operations
Write-Host "[8] DELETE Operations" -ForegroundColor Cyan

# Delete Employee
$deletePayload = @{
    source = "hr_employees"
    action = "DELETE"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    data = @{
        employeeNumber = "TEST-PS-001"
    }
}
if (Send-Webhook -TestName "  - Delete Employee TEST-PS-001" -Endpoint $webhookEndpoint -Payload $deletePayload) {
    $passedTests++
}
$totalTests++

# Delete Payroll
$deletePayload.source = "hr_payroll"
$deletePayload.data.employeeNumber = "TEST-PS-002"
$deletePayload.timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
if (Send-Webhook -TestName "  - Delete Payroll TEST-PS-002" -Endpoint $webhookEndpoint -Payload $deletePayload) {
    $passedTests++
}
$totalTests++

# Delete Bus Trip
$deletePayload = @{
    source = "op_bus_trips"
    action = "DELETE"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    data = @{
        assignment_id = 99999
    }
}
if (Send-Webhook -TestName "  - Delete Bus Trip 99999" -Endpoint $webhookEndpoint -Payload $deletePayload) {
    $passedTests++
}
$totalTests++

# 9. Error Handling Tests
Write-Host "[9] Error Handling Tests" -ForegroundColor Cyan

# Invalid source
$errorPayload = @{
    source = "invalid_source"
    action = "INSERT"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    data = @{}
}
Write-Host "  Testing: Invalid Source - Expected to fail" -ForegroundColor Yellow
try {
    $body = $errorPayload | ConvertTo-Json -Depth 10
    $response = Invoke-RestMethod -Uri $webhookEndpoint -Method Post -Body $body -ContentType "application/json"
    Write-Host "    ✗ Should have failed" -ForegroundColor Red
}
catch {
    Write-Host "    ✓ Correctly rejected invalid source" -ForegroundColor Green
    $passedTests++
}
$totalTests++
Write-Host ""

# Invalid action
$errorPayload.source = "hr_employees"
$errorPayload.action = "INVALID_ACTION"
Write-Host "  Testing: Invalid Action - Expected to fail" -ForegroundColor Yellow
try {
    $body = $errorPayload | ConvertTo-Json -Depth 10
    $response = Invoke-RestMethod -Uri $webhookEndpoint -Method Post -Body $body -ContentType "application/json"
    Write-Host "    ✗ Should have failed" -ForegroundColor Red
}
catch {
    Write-Host "    ✓ Correctly rejected invalid action" -ForegroundColor Green
    $passedTests++
}
$totalTests++
Write-Host ""

# Summary
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $($totalTests - $passedTests)" -ForegroundColor Red
Write-Host ""

if ($passedTests -eq $totalTests) {
    Write-Host "✓ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "✗ Some tests failed. Please review the output above." -ForegroundColor Red
}

Write-Host ""
Write-Host "CLEANUP INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "Run these SQL commands to cleanup test data:" -ForegroundColor Gray
Write-Host 'DELETE FROM "EmployeeCache" WHERE "employeeNumber" LIKE ''TEST-PS-%'' OR "employeeNumber" LIKE ''BULK-PS-%'';' -ForegroundColor Gray
Write-Host 'DELETE FROM "PayrollCache" WHERE "employeeNumber" LIKE ''TEST-PS-%'' OR "employeeNumber" LIKE ''BULK-PS-%'';' -ForegroundColor Gray
Write-Host 'DELETE FROM "BusTripCache" WHERE "assignmentId" >= 99999;' -ForegroundColor Gray
Write-Host ""
