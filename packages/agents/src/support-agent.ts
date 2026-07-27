import { BaseAgent, type AgentId, type AgentTaskInput } from "@ai-commander/core";

/**
 * Handles FAQs, order tracking, returns/refunds, product recommendations,
 * ticket generation and escalation to the human owner.
 */
export class SupportAgent extends BaseAgent {
  readonly id: AgentId = "support";
  readonly name = "Customer Support Agent";
  readonly role = "Customer Experience";
  readonly description =
    "Answers FAQs, handles order tracking, returns and refunds, recommends products, and escalates tickets that need a human.";
  readonly capabilities = [
    "FAQ handling",
    "Order tracking",
    "Returns & refunds",
    "Product recommendations",
    "Ticket generation",
    "Escalation to human owner",
  ];

  protected async handle(_task: AgentTaskInput) {
    const output = {
      openTickets: 7,
      resolvedToday: 12,
      avgResponseTime: "2m 14s",
      escalations: 1,
      tickets: [
        { id: "TCK-1042", subject: "Where is my order?", status: "resolved", channel: "chat" },
        { id: "TCK-1043", subject: "Refund request — damaged item", status: "escalated", channel: "email" },
        { id: "TCK-1044", subject: "Product recommendation", status: "resolved", channel: "chat" },
      ],
    };

    return {
      summary: `Triaged support queue: ${output.openTickets} open, ${output.escalations} escalated to the owner.`,
      output,
      logs: ["No support inbox integration configured — using representative sample tickets"],
      mocked: true,
    };
  }
}
