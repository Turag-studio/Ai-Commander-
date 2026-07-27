import { BaseAgent, type AgentId, type AgentTaskInput, type ModelManager } from "@ai-commander/core";

interface SeoListing {
  seoTitle: string;
  metaDescription: string;
  bulletPoints: string[];
  description: string;
  tags: string[];
  faqs: Array<{ q: string; a: string }>;
  altText: string;
  schemaMarkup: Record<string, unknown>;
  translations: {
    hi: { seoTitle: string; description: string };
    gu: { seoTitle: string; description: string };
  };
}

function templateListing(productName: string): SeoListing {
  return {
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
    altText: `${productName} shown on a neutral background, front-facing product photo`,
    schemaMarkup: { "@context": "https://schema.org", "@type": "Product", name: productName, description: `${productName} — premium handmade quality.` },
    translations: {
      hi: { seoTitle: `${productName} | प्रीमियम हस्तनिर्मित गुणवत्ता`, description: `${productName} — रोज़ाना उपयोग के लिए डिज़ाइन किया गया प्रीमियम उत्पाद।` },
      gu: { seoTitle: `${productName} | પ્રીમિયમ હસ્તકલા ગુણવત્તા`, description: `${productName} — રોજિંદા ઉપયોગ માટે બનાવેલ પ્રીમિયમ પ્રોડક્ટ.` },
    },
  };
}

const PROMPT_SYSTEM =
  "You are an ecommerce SEO copywriter. Reply with ONLY valid JSON (no markdown fences) matching this exact shape: " +
  '{"seoTitle": string, "metaDescription": string, "bulletPoints": string[4], "description": string, "tags": string[5], ' +
  '"faqs": [{"q": string, "a": string}][2], "altText": string, ' +
  '"translations": {"hi": {"seoTitle": string, "description": string}, "gu": {"seoTitle": string, "description": string}}}. ' +
  "Hindi and Gujarati fields must be written in that language's native script.";

/**
 * Generates SEO titles, descriptions, bullet points, FAQs, attributes,
 * schema markup and alt text in English, Hindi and Gujarati. Uses the AI
 * Model Manager (local Ollama first, cloud providers as optional fallback)
 * when available; falls back to a deterministic template otherwise so the
 * agent always returns a complete listing.
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

  private readonly modelManager?: ModelManager;

  constructor(modelManager?: ModelManager) {
    super();
    this.modelManager = modelManager;
  }

  protected async handle(task: AgentTaskInput) {
    const productName = String(task.payload.productName ?? "Handcrafted Ceramic Mug Set");
    const template = templateListing(productName);

    if (this.modelManager) {
      const result = await this.modelManager.generate(
        `Write a full SEO listing for this product: "${productName}". ${
          task.payload.notes ? `Additional context: ${task.payload.notes}` : ""
        }`,
        { system: PROMPT_SYSTEM, json: true }
      );

      if (result) {
        try {
          const parsed = JSON.parse(extractJson(result.text)) as Partial<SeoListing>;
          const listing: SeoListing = {
            ...template,
            ...parsed,
            schemaMarkup: template.schemaMarkup,
            translations: { ...template.translations, ...parsed.translations },
          };
          return {
            summary: `Generated SEO listing for "${productName}" via ${result.provider}/${result.model}.`,
            output: { productName, ...listing },
            logs: [`Model-backed generation via ${result.provider} (${result.model})`],
            mocked: false,
          };
        } catch {
          // model returned invalid JSON — fall through to the template
        }
      }
    }

    return {
      summary: `Generated full SEO listing copy for "${productName}" (EN/HI/GU) from template.`,
      output: { productName, ...template },
      logs: [
        this.modelManager ? "No AI model available — using template generator" : "No Model Manager configured — using template generator",
        "Generated title, description, bullets, FAQs, schema markup",
      ],
      mocked: true,
    };
  }
}

/** Strips markdown code fences some local models wrap JSON in despite instructions. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}
