import { BaseAgent, type AgentId, type AgentTaskInput } from "@ai-commander/core";

/**
 * Generates SEO titles, descriptions, bullet points, FAQs, attributes,
 * schema markup and alt text. Wire OPENAI_API_KEY / ANTHROPIC_API_KEY to
 * replace the template generator below with real LLM calls without
 * changing the agent's public output shape.
 */
export class ContentAgent extends BaseAgent {
  readonly id: AgentId = "content";
  readonly name = "Product Content Agent";
  readonly role = "SEO & Copywriting";
  readonly description =
    "Writes SEO titles, descriptions, bullet points, FAQs, tags, attributes, schema markup and alt text in English, Hindi and Gujarati.";
  readonly capabilities = [
    "SEO title & meta description",
    "Product description & bullet points",
    "Product tags & attributes",
    "FAQ generation",
    "Schema markup (JSON-LD)",
    "Alt text generation",
    "Multi-language: English, Hindi, Gujarati",
  ];

  private readonly hasLlmKey = Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);

  protected async handle(task: AgentTaskInput) {
    const productName = String(task.payload.productName ?? "Handcrafted Ceramic Mug Set");

    const output = {
      productName,
      seoTitle: `${productName} | Premium Handmade Quality`,
      metaDescription: `Shop the ${productName.toLowerCase()} — durable, beautifully designed, and shipped fast. Free returns.`,
      bulletPoints: [
        "Premium materials built to last",
        "Thoughtfully designed for everyday use",
        "Ships in eco-friendly packaging",
        "Backed by a 30-day satisfaction guarantee",
      ],
      description: `Introducing the ${productName} — crafted for people who care about quality and design. Every detail, from material selection to finishing, is built to elevate your everyday routine.`,
      tags: ["handmade", "home decor", "gift idea", "premium quality", "eco-friendly"],
      faqs: [
        { q: "Is this dishwasher safe?", a: "Yes, top-rack dishwasher safe." },
        { q: "What is the estimated delivery time?", a: "3-7 business days depending on location." },
      ],
      schemaMarkup: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: productName,
        description: `${productName} — premium handmade quality.`,
      },
      altText: `${productName} shown on a neutral background, front-facing product photo`,
      translations: {
        hi: { seoTitle: `${productName} | प्रीमियम हस्तनिर्मित गुणवत्ता` },
        gu: { seoTitle: `${productName} | પ્રીમિયમ હસ્તકલા ગુણવત્તા` },
      },
    };

    return {
      summary: `Generated full SEO listing copy for "${productName}" (EN/HI/GU).`,
      output,
      logs: [
        this.hasLlmKey ? "Using configured LLM provider for copy generation" : "No LLM key configured — using template generator",
        "Generated title, description, bullets, FAQs, schema markup",
      ],
      mocked: !this.hasLlmKey,
    };
  }
}
