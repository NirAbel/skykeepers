export interface Screen {
  mount(root: HTMLElement): void;
  unmount(): void;
}

export type ScreenFactory = (nav: Navigator) => Screen;

export interface Navigator {
  go(factory: ScreenFactory): void;
}

export class ScreenManager implements Navigator {
  private current: Screen | null = null;

  constructor(private root: HTMLElement) {}

  go(factory: ScreenFactory): void {
    this.current?.unmount();
    this.root.replaceChildren();
    this.current = factory(this);
    this.current.mount(this.root);
  }
}
