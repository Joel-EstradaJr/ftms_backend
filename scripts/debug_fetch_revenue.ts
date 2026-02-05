
import fetch from 'node-fetch';

async function main() {
    try {
        console.log('Fetching revenue list...');
        const listRes = await fetch('http://localhost:4000/api/v1/admin/bus-trip-revenue?page=1&limit=100');
        const listData = await listRes.json() as any;

        console.log('List data:', JSON.stringify(listData, null, 2));
        if (!listData.success || !listData.data || !listData.data.length) {
            console.log('No revenue data found or invalid structure.');
            return;
        }

        const revenueWithShortage = listData.data.find((r: any) => r.has_receivables || r.shortage > 0);

        if (!revenueWithShortage) {
            console.log('No revenue with shortage/receivables found in first page.');
            return;
        }

        console.log(`Found Revenue ID: ${revenueWithShortage.id} (${revenueWithShortage.code})`);

        console.log('Fetching revenue details...');
        const detailRes = await fetch(`http://localhost:4000/api/v1/admin/bus-trip-revenue/${revenueWithShortage.id}`);
        const detailData = await detailRes.json() as any;

        // Deep inspect driver installments
        if (detailData.success && detailData.data.shortage_details) {
            console.log('Shortage Details Found.');
            if (detailData.data.shortage_details.driver_receivable?.installment_schedules) {
                console.log('Driver Installments Structure:');
                console.log(JSON.stringify(detailData.data.shortage_details.driver_receivable.installment_schedules, null, 2));
            } else {
                console.log('No driver installments in shortage details.');
            }
        } else {
            console.log('No driver installments found or shortage details missing.');
            console.log(JSON.stringify(detailData, null, 2));
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

main();
