import { BaseAgent, type AgentId, type AgentTaskInput } from "@ai-commander/core";

interface RenderJob {
  type: string;
  status: "queued" | "completed" | "failed";
  label: string;
  imageBase64?: string;
}

/** Automatic1111 / ComfyUI-compatible txt2img call. Returns a base64 PNG, or null when unconfigured/unreachable. */
async function generateImage(prompt: string): Promise<string | null> {
  const baseUrl = process.env.IMAGE_GEN_API_URL;
  if (!baseUrl) return null;
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        negative_prompt: "blurry, low quality, watermark, text, deformed",
        steps: 20,
        width: 768,
        height: 768,
        cfg_scale: 7,
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { images?: string[] };
    return data.images?.[0] ?? null;
  } catch {
    return null;
  }
}

/** Any rembg-compatible background removal service — POST an image, get a transparent PNG back. */
async function removeBackgroundRemote(imageBase64: string): Promise<string | null> {
  const url = process.env.BACKGROUND_REMOVAL_API_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64 }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = (await res.json()) as { image?: string };
      return data.image ?? null;
    }
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch {
    return null;
  }
}

/** Automatic1111-compatible upscale/enhance endpoint (extras API). */
async function enhanceImageRemote(imageBase64: string, upscale = 2): Promise<string | null> {
  const baseUrl = process.env.IMAGE_GEN_API_URL;
  if (!baseUrl) return null;
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/sdapi/v1/extra-single-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64, upscaling_resize: upscale, upscaler_1: "ESRGAN_4x" }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { image?: string };
    return data.image ?? null;
  } catch {
    return null;
  }
}

/**
 * Produces product, lifestyle, marketplace and marketing imagery, plus
 * background removal, enhancement and print-ready artwork. Connects to any
 * Automatic1111/ComfyUI-compatible local instance via IMAGE_GEN_API_URL for
 * real generation, and any rembg-compatible service via
 * BACKGROUND_REMOVAL_API_URL — both optional, with the job queue falling
 * back to a labeled mock plan when neither is configured.
 */
export class DesignAgent extends BaseAgent {
  readonly id: AgentId = "design";
  readonly name = "Design Agent";
  readonly role = "Visual Production";
  readonly description =
    "Generates product, lifestyle, marketplace and marketing imagery, and handles background removal, upscaling and print-ready artwork.";
  readonly capabilities = [
    "Product & lifestyle images",
    "White background / marketplace images",
    "Infographics & comparison images",
    "Packaging design & banners",
    "Background removal & AI enhancement",
    "Image upscaling & watermark removal",
    "Transparent PNG & print-ready artwork",
  ];

  protected async handle(task: AgentTaskInput) {
    switch (task.type) {
      case "design.remove_background":
        return this.removeBackground(task);
      case "design.enhance_image":
        return this.enhanceImage(task);
      case "design.generate_product_images":
      default:
        return this.generateProductImages(task);
    }
  }

  private async generateProductImages(task: AgentTaskInput) {
    const productName = String(task.payload.productName ?? "Product");
    const configured = Boolean(process.env.IMAGE_GEN_API_URL);

    const jobSpecs: Array<{ type: string; label: string; prompt: string }> = [
      {
        type: "white_background",
        label: `${productName} — white background`,
        prompt: `${productName}, product photography, pure white background, studio lighting, centered, high detail`,
      },
      {
        type: "lifestyle",
        label: `${productName} — lifestyle scene`,
        prompt: `${productName} in a lifestyle setting, natural light, cozy home interior, photorealistic`,
      },
      {
        type: "infographic",
        label: `${productName} — feature infographic`,
        prompt: `${productName}, clean product infographic layout, minimal background, callout space`,
      },
      {
        type: "marketplace_grid",
        label: `${productName} — marketplace image grid`,
        prompt: `${productName}, marketplace listing photo, multiple angles, e-commerce style`,
      },
    ];

    const jobs: RenderJob[] = [];
    let anyReal = false;

    for (const spec of jobSpecs) {
      if (configured) {
        const image = await generateImage(spec.prompt);
        if (image) {
          jobs.push({ type: spec.type, label: spec.label, status: "completed", imageBase64: image });
          anyReal = true;
          continue;
        }
        jobs.push({ type: spec.type, label: spec.label, status: "failed" });
      } else {
        jobs.push({ type: spec.type, label: spec.label, status: "queued" });
      }
    }

    const output = {
      productName,
      renderJobs: jobs.map((j) => ({ ...j, imageBase64: j.imageBase64 ? `data:image/png;base64,${j.imageBase64}` : undefined })),
      pipeline: ["background_removal", "ai_enhancement", "upscale_4x", "watermark_check", "export_variants"],
      exportFormats: ["PNG (transparent)", "JPEG (marketplace)", "Print-ready PDF"],
    };

    return {
      summary: anyReal
        ? `Generated ${jobs.filter((j) => j.status === "completed").length}/${jobs.length} images via local Stable Diffusion.`
        : `Queued ${jobs.length} image generation jobs for "${productName}" (set IMAGE_GEN_API_URL for real generation).`,
      output,
      logs: [
        configured ? "IMAGE_GEN_API_URL configured — attempted live generation" : "No image generation provider configured — jobs queued as mock",
      ],
      mocked: !anyReal,
    };
  }

  private async removeBackground(task: AgentTaskInput) {
    const imageBase64 = String(task.payload.imageBase64 ?? "");
    if (!imageBase64) {
      return {
        summary: "No source image provided for background removal.",
        output: { error: "Missing imageBase64 in task payload" },
        logs: ["design.remove_background requires payload.imageBase64"],
        mocked: true,
      };
    }

    const result = await removeBackgroundRemote(imageBase64);
    if (result) {
      return {
        summary: "Background removed via local removal service.",
        output: { imageBase64: `data:image/png;base64,${result}` },
        logs: ["BACKGROUND_REMOVAL_API_URL call succeeded"],
        mocked: false,
      };
    }

    return {
      summary: "Background removal service not configured or unreachable.",
      output: { imageBase64: `data:image/png;base64,${imageBase64}`, note: "Returned original image unmodified" },
      logs: [
        process.env.BACKGROUND_REMOVAL_API_URL
          ? "BACKGROUND_REMOVAL_API_URL call failed"
          : "BACKGROUND_REMOVAL_API_URL not configured",
      ],
      mocked: true,
    };
  }

  private async enhanceImage(task: AgentTaskInput) {
    const imageBase64 = String(task.payload.imageBase64 ?? "");
    const upscale = Number(task.payload.upscale ?? 2);
    if (!imageBase64) {
      return {
        summary: "No source image provided for enhancement.",
        output: { error: "Missing imageBase64 in task payload" },
        logs: ["design.enhance_image requires payload.imageBase64"],
        mocked: true,
      };
    }

    const result = await enhanceImageRemote(imageBase64, upscale);
    if (result) {
      return {
        summary: `Enhanced and upscaled ${upscale}x via local Stable Diffusion.`,
        output: { imageBase64: `data:image/png;base64,${result}` },
        logs: ["IMAGE_GEN_API_URL extras call succeeded"],
        mocked: false,
      };
    }

    return {
      summary: "Image enhancement provider not configured or unreachable.",
      output: { imageBase64: `data:image/png;base64,${imageBase64}`, note: "Returned original image unmodified" },
      logs: [process.env.IMAGE_GEN_API_URL ? "IMAGE_GEN_API_URL extras call failed" : "IMAGE_GEN_API_URL not configured"],
      mocked: true,
    };
  }
}
