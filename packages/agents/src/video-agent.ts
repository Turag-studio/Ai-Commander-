import { BaseAgent, type AgentId, type AgentTaskInput } from "@ai-commander/core";

/**
 * Produces UGC ads, reels, shorts and product videos: script, voice,
 * captions, music, hooks and CTA. Real rendering (voice synthesis, video
 * assembly) plugs in behind `handle`; today it returns a full creative
 * brief + storyboard the human owner can approve before production.
 */
export class VideoAgent extends BaseAgent {
  readonly id: AgentId = "video";
  readonly name = "Video Agent";
  readonly role = "Video & UGC Production";
  readonly description =
    "Creates UGC ads, Instagram Reels, YouTube Shorts, Facebook ads and product/explainer videos with script, voice, captions and music.";
  readonly capabilities = [
    "UGC ad scripting",
    "Instagram Reels / YouTube Shorts / Story Ads",
    "Voiceover & caption generation",
    "Music & hook selection",
    "CTA optimization",
  ];

  protected async handle(task: AgentTaskInput) {
    const productName = String(task.payload.productName ?? "Product");

    const output = {
      productName,
      format: "UGC Ad — 15s vertical",
      hook: `POV: you finally found the ${productName.toLowerCase()} that actually works.`,
      script: [
        { scene: 1, duration: "0-3s", line: `Okay so I was today years old when I found this ${productName.toLowerCase()}...` },
        { scene: 2, duration: "3-9s", line: "Show product in use, highlight top 2 benefits with on-screen text." },
        { scene: 3, duration: "9-13s", line: "Quick before/after or reaction shot." },
        { scene: 4, duration: "13-15s", line: "CTA: Link in bio — shop now before it sells out." },
      ],
      captions: "auto-generated, burned-in, high-contrast style",
      musicSuggestion: "Upbeat trending audio (rotate weekly based on platform trends)",
      cta: "Shop now — link in bio",
      status: "awaiting_approval",
    };

    return {
      summary: `Drafted a UGC ad script + storyboard for "${productName}", pending owner approval.`,
      output,
      logs: [
        "No video rendering provider configured — returning script + storyboard for approval",
        "Awaiting human approval before render/publish",
      ],
      mocked: true,
    };
  }
}
