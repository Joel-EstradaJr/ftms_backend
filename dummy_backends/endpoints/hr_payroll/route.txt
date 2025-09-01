// endpoints\clean\hr_payroll\route.txt

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/client";
import { withCors } from "@/lib/withcors";
import { authenticateRequest } from "@/lib/auth";

export const GET = withCors(async (request: NextRequest) => {
  // Temporarily disable auth for testing - uncomment for production
  // const { error, user, status } = await authenticateRequest(request);
  // if (error) {
  //   return NextResponse.json({ error }, { status });
  // }

  try {
    // Optional query param to fetch specific employee
    const { searchParams } = new URL(request.url);
    const employeeNumber = searchParams.get("employeeNumber");

    const employees = await prisma.employee.findMany({
      where: {
        ...(employeeNumber ? { employeeNumber } : {}),
      },
      select: {
        employeeNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,
        employeeStatus: true,
        hiredate: true,
        terminationDate: true,
        basicRate: true,
        position: {
          select: {
            positionName: true,
            department: {
              select: {
                departmentName: true,
              },
            },
          },
        },
        attendances: {
          select: {
            date: true,
            status: true,
          },
        },
        benefits: {
          where: {
            isActive: true,
          },
          select: {
            value: true,
            frequency: true,
            effectiveDate: true,
            endDate: true,
            isActive: true,
            benefitType: {
              select: {
                name: true,
              },
            },
          },
        },
        deductions: {
          where: {
            isActive: true,
          },
          select: {
            type: true,
            value: true,
            frequency: true,
            effectiveDate: true,
            endDate: true,
            isActive: true,
            deductionType: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Transform the data to match expected output format - convert Decimal values to strings
    const transformedEmployees = employees.map((employee: any) => ({
      ...employee,
      basicRate: employee.basicRate.toString(),
      benefits: employee.benefits.map((benefit: any) => ({
        ...benefit,
        value: benefit.value.toString(),
      })),
      deductions: employee.deductions.map((deduction: any) => ({
        ...deduction,
        value: deduction.value.toString(),
      })),
    }));

    return NextResponse.json(transformedEmployees, { status: 200 });
  } catch (err) {
    console.error("PAYROLL_ENDPOINT_ERROR", err);
    return NextResponse.json(
      { error: "Failed to fetch payroll data" },
      { status: 500 }
    );
  }
});

export const OPTIONS = withCors(() =>
  Promise.resolve(new NextResponse(null, { status: 204 }))
);
