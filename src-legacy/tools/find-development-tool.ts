import { developmentTools, type DevelopmentTool } from "./model.js";

export function findDevelopmentTool(name: string): DevelopmentTool | undefined {
  return developmentTools.find((tool) => tool.name === name);
}
