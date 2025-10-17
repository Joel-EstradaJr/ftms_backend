# Rename Script - Update all references from hr-updates to data-sync
# Run this to update all documentation files

$files = @(
    "c:\capstone\ftms\docs\webhook-implementation.md",
    "c:\capstone\ftms\docs\webhook-quick-reference.md",
    "c:\capstone\ftms\docs\webhook-summary.md",
    "c:\capstone\ftms\docs\webhook-checklist.md",
    "c:\capstone\ftms\docs\webhook-test-payloads.http",
    "c:\capstone\ftms\docs\webhook-test-script.ps1"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Updating $file..." -ForegroundColor Yellow
        $content = Get-Content $file -Raw
        
        # Replace all variations
        $content = $content -replace '/api/webhooks/hr-updates', '/api/webhooks/data-sync'
        $content = $content -replace 'HR/Operations', 'External Data'
        $content = $content -replace 'HR and Operations', 'External Systems (HR, Operations, Inventory)'
        $content = $content -replace 'hr-updates', 'data-sync'
        
        Set-Content $file -Value $content -NoNewline
        Write-Host "  Updated" -ForegroundColor Green
    } else {
        Write-Host "  File not found: $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "All files updated!" -ForegroundColor Green
Write-Host "New endpoint: /api/webhooks/data-sync" -ForegroundColor Cyan
