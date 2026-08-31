import type { CSSProperties, DetailedHTMLProps, HTMLAttributes } from 'react';

declare global {
  interface WebMcpToolDefinition {
    name: string;
    title: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations: { readOnlyHint: boolean };
    execute: (input: unknown) => unknown | Promise<unknown>;
  }

  interface WebMcpModelContext {
    registerTool: (definition: WebMcpToolDefinition) => void;
  }

  interface Document {
    modelContext?: WebMcpModelContext;
  }

  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        poster?: string;
        alt?: string;
        ar?: boolean;
        'ar-modes'?: string;
        'camera-controls'?: boolean;
        'touch-action'?: string;
        'shadow-intensity'?: string;
        'environment-image'?: string;
        'ios-src'?: string;
        loading?: 'auto' | 'lazy' | 'eager';
        reveal?: 'auto' | 'interaction' | 'manual';
        style?: CSSProperties;
      };
    }
  }
}

export {};
