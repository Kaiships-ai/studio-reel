// What core/render reads from a film page through page.evaluate(): the page contract in TECHNIQUE.md.
interface PageBox { id: string | number; text?: string; kind?: string; caption?: boolean; x0: number; y0: number; x1: number; y1: number }
interface Window {
  DUR: number;
  READY?: boolean;
  EV?: unknown[];
  render(t: number): unknown;
  TEXTS?(t: number): PageBox[] | undefined;
  BOXES?(t: number): PageBox[] | undefined;
}
