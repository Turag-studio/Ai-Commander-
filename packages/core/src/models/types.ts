export interface GenerateOptions {
  model?: string;
  system?: string;
  json?: boolean;
  temperature?: number;
}

export interface GenerateResult {
  text: string;
  provider: string;
  model: string;
}

/** A single AI backend the Model Manager can route generation requests to. */
export interface ModelProvider {
  readonly id: string;
  readonly displayName: string;
  readonly isLocal: boolean;
  isAvailable(): Promise<boolean>;
  generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;
}
