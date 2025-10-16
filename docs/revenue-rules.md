# Revenue AR and Payments Rules

This document summarizes business rules and constraints enforced for Revenues, AR installments, and Loans.

- Revenue to BusTrip mapping:
  - `RevenueRecord.assignment_id` → `BusTripCache.assignment_id`
  - `RevenueRecord.bus_trip_id` → `BusTripCache.bus_trip_id`
  - Both relations are optional and use `ON UPDATE CASCADE` / `ON DELETE SET NULL`.

- Payment Method requirement:
  - App-level: `payment_method_id` is required when:
    - Revenue `payment_status` is Paid, or
    - Non-AR revenue (`is_receivable = false`) has `total_amount > 0`.
  - DB-level: A trigger enforces the non-AR remitted condition on INSERT/UPDATE of `RevenueRecord`.
  - Each `RevenuePayment` line with `amount > 0` must have a `payment_method_id`.

- Outstanding balance consistency:
  - DB triggers recalc `RevenueRecord.outstanding_balance` on any change to `RevenuePayment` or when `total_amount` changes.
  - A backfill runs in migration to initialize balances for existing data.

- AR Installments and scheduling:
  - If installments are provided and count > 1, a schedule type is required (either legacy enum `schedule_type` or FK `schedule_type_id`).
  - `due_date >= collection_date` enforced for AR records.

- Loans vs Outstanding Balance:
  - The sum of Loans for a revenue cannot exceed its outstanding balance.
  - On updates, loans are proportionally scaled down to fit the new outstanding; if outstanding is zero, loans are deleted.

- Naming conventions:
  - Installment status relation is `RevenueInstallment.installmentStatus` linking to `GlobalInstallmentStatus` via `installment_status_id`.

## Migration notes
If `npx prisma migrate dev` fails with a shadow database error or complains a migration was modified after apply, reset the dev database:

```powershell
npx prisma migrate reset -f
```

This will re-apply all migrations and run seeders.
