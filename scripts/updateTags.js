const fs = require('fs');

// Update admin.docs.ts
let adminContent = fs.readFileSync('src/docs/admin.docs.ts', 'utf8');

// Replace tags based on endpoint paths
adminContent = adminContent.replace(
  /\/api\/v1\/admin\/chart-of-accounts[\s\S]*?tags:\s*\n\s*-\s*Admin(?!\s*\|)/g,
  (match) => match.replace(/tags:\s*\n\s*-\s*Admin/, 'tags:\n *       - Admin | Chart of Accounts')
);

// Simpler approach - just do line-by-line replacements
const lines = adminContent.split('\n');
let currentEndpoint = '';
const result = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Track which endpoint we're in
  if (line.includes('/api/v1/admin/chart-of-accounts')) {
    currentEndpoint = 'chart-of-accounts';
  } else if (line.includes('/api/v1/admin/account-types')) {
    currentEndpoint = 'account-types';
  } else if (line.includes('/api/v1/admin/payroll-periods')) {
    currentEndpoint = 'payroll-periods';
  } else if (line.includes('/api/v1/admin/journal-entries')) {
    currentEndpoint = 'journal-entries';
  } else if (line.includes('* @swagger')) {
    // Reset at the start of a new swagger block
    currentEndpoint = '';
  }
  
  // Replace the tag if we're in a known endpoint section
  if (line.match(/^\s*\*\s*-\s*Admin\s*$/) && currentEndpoint) {
    const tagMap = {
      'chart-of-accounts': 'Admin | Chart of Accounts',
      'account-types': 'Admin | Account Types',
      'payroll-periods': 'Admin | Payroll Periods',
      'journal-entries': 'Admin | Journal Entries'
    };
    result.push(line.replace(/Admin\s*$/, tagMap[currentEndpoint]));
  } else {
    result.push(line);
  }
}

fs.writeFileSync('src/docs/admin.docs.ts', result.join('\n'));
console.log('Updated admin.docs.ts');

// Update staff.docs.ts
let staffContent = fs.readFileSync('src/docs/staff.docs.ts', 'utf8');
staffContent = staffContent.replace(/\*\s*-\s*Staff\s*$/gm, '*       - Staff | Journal Entries');
fs.writeFileSync('src/docs/staff.docs.ts', staffContent);
console.log('Updated staff.docs.ts');

// Update integration.docs.ts
let integrationContent = fs.readFileSync('src/docs/integration.docs.ts', 'utf8');
const integrationLines = integrationContent.split('\n');
let currentIntegration = '';
const integrationResult = [];

for (let i = 0; i < integrationLines.length; i++) {
  const line = integrationLines[i];
  
  // Track which integration endpoint we're in
  if (line.includes('/api/integration/hr/') && !line.includes('hr_payroll')) {
    currentIntegration = 'hr';
  } else if (line.includes('/api/integration/hr_payroll')) {
    currentIntegration = 'hr_payroll';
  } else if (line.includes('/api/integration/operations')) {
    currentIntegration = 'operations';
  } else if (line.includes('* @swagger')) {
    currentIntegration = '';
  }
  
  // Replace the tag if we're in a known integration section
  if (line.match(/^\s*\*\s*-\s*Admin\s*$/) && currentIntegration) {
    const tagMap = {
      'hr': 'Admin | Integration – HR',
      'hr_payroll': 'Admin | Integration – HR Payroll',
      'operations': 'Admin | Integration – Operations'
    };
    integrationResult.push(line.replace(/Admin\s*$/, tagMap[currentIntegration]));
  } else {
    integrationResult.push(line);
  }
}

fs.writeFileSync('src/docs/integration.docs.ts', integrationResult.join('\n'));
console.log('Updated integration.docs.ts');

// Update operationalTripExpense.docs.ts
let expenseContent = fs.readFileSync('src/docs/operationalTripExpense.docs.ts', 'utf8');
const expenseLines = expenseContent.split('\n');
let currentExpenseSection = '';
const expenseResult = [];

for (let i = 0; i < expenseLines.length; i++) {
  const line = expenseLines[i];
  
  // Track which expense section we're in
  if (line.includes('/api/operational-trip-expenses/expense-types') ||
      line.includes('/api/operational-trip-expenses/payment-methods') ||
      line.includes('/api/operational-trip-expenses/chart-of-accounts') ||
      line.includes('/api/operational-trip-expenses/operational-trips') ||
      line.includes('/api/operational-trip-expenses/rental-trips') ||
      line.includes('/api/operational-trip-expenses/employees')) {
    currentExpenseSection = 'reference';
  } else if (line.includes('/api/operational-trip-expenses')) {
    currentExpenseSection = 'expenses';
  } else if (line.includes('* @swagger')) {
    currentExpenseSection = '';
  }
  
  // Replace the tag if we're in a known section
  if (line.match(/^\s*\*\s*-\s*Admin\s*$/) && currentExpenseSection) {
    const tagMap = {
      'expenses': 'Admin | Operational Trip Expenses',
      'reference': 'Admin | Expense Reference Data'
    };
    expenseResult.push(line.replace(/Admin\s*$/, tagMap[currentExpenseSection]));
  } else {
    expenseResult.push(line);
  }
}

fs.writeFileSync('src/docs/operationalTripExpense.docs.ts', expenseResult.join('\n'));
console.log('Updated operationalTripExpense.docs.ts');

console.log('All files updated!');
