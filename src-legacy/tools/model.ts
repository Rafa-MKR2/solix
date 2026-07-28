export interface DevelopmentTool {
  name: string;
  description?: string;
  suggestedCommand?: string;
}

export const developmentTools = [
  {
    name: "git",
    description: "Distributed version control",
    suggestedCommand: "linux-post-install install git",
  },
  {
    name: "curl",
    description: "Command line data transfer",
    suggestedCommand: "linux-post-install install curl",
  },
  {
    name: "wget",
    description: "Command line file downloader",
    suggestedCommand: "linux-post-install install wget",
  },
  {
    name: "docker",
    description: "Container platform",
    suggestedCommand: "linux-post-install install docker",
  },
  {
    name: "node",
    description: "JavaScript runtime",
    suggestedCommand: "linux-post-install install node",
  },
  {
    name: "java",
    description: "Java runtime",
    suggestedCommand: "linux-post-install install java",
  },
] as const satisfies readonly DevelopmentTool[];

export type DevelopmentToolName = (typeof developmentTools)[number]["name"];

export interface DevelopmentToolStatus {
  name: DevelopmentToolName;
  available: boolean;
  executable?: string;
  description?: string;
  suggestedCommand?: string;
}
