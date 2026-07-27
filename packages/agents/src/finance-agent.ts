import { BaseAgent, type AgentId, type AgentTaskInput } from "@ai-commander/core";

/**
 * Tracks expenses, revenue, profit, GST/tax, invoices, purchase orders and
 * vendor payments, and rolls up monthly finance reports.
 */
export class FinanceAgent extends BaseAgent {
  readonly id: AgentId = "finance";
  readonly name = "Finance Agent";
  readonly role = "Finance & Compliance";
  readonly description =
    "Tracks expenses, revenue, profit, GST/taxes, invoices, purchase orders and vendor payments, and produces monthly reports.";
  readonly capabilities = [
    "Expense & revenue tracking",
    "Profit calculation",
    "GST / tax tracking",
    "Invoice & purchase order management",
    "Vendor payment tracking",
    "Monthly financial reports",
  ];

  protected async handle(_task: AgentTaskInput) {
    const output = {
      period: "Current month",
      revenue: 34210.9,
      expenses: 18940.1,
      profit: 15270.8,
      profitMargin: 44.6,
      gstCollected: 6157.96,
      pendingInvoices: 4,
      pendingVendorPayments: 2,
    };

    return {
      summary: `Monthly profit: $${output.profit.toFixed(2)} (${output.profitMargin}% margin).`,
      output,
      logs: ["No accounting integration configured — using representative sample figures"],
      mocked: true,
    };
  }
}
