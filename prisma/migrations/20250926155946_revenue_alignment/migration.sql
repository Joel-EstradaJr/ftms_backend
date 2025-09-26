-- AddForeignKey
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "BusTripCache"("assignment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_bus_trip_id_fkey" FOREIGN KEY ("bus_trip_id") REFERENCES "BusTripCache"("bus_trip_id") ON DELETE SET NULL ON UPDATE CASCADE;
