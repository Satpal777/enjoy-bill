import { Directive, ElementRef, HostListener, Input, Renderer2, TemplateRef, ViewContainerRef, EmbeddedViewRef } from '@angular/core';

@Directive({
  selector: '[appToolTipCard]',
  standalone: true
})
export class ToolTipCard {
  @Input('appToolTipCard') tooltipTemplate: TemplateRef<any> | null = null;

  @Input() tooltipContext: any;

  private viewRef: EmbeddedViewRef<any> | null = null;
  private tooltipContainer: HTMLElement | null = null;

  constructor(
    private elementRef: ElementRef,
    private viewContainerRef: ViewContainerRef,
    private renderer: Renderer2
  ) { }

  private hideTimeout: any;

  @HostListener('mouseenter') onMouseEnter() {
    this.clearHideTimeout(); // If we come back, stop hiding
    if (!this.tooltipContainer) {
      this.showTooltip();
    }
  }

  @HostListener('mouseleave') onMouseLeave() {
    // Don't hide immediately! Wait 200ms
    this.hideTimeout = setTimeout(() => {
      this.hideTooltip();
    }, 300);
  }

  private clearHideTimeout() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  private showTooltip() {
    // 1. Create the view
    this.viewRef = this.viewContainerRef.createEmbeddedView(
      this.tooltipTemplate!,
      { $implicit: this.tooltipContext }
    );

    this.tooltipContainer = this.renderer.createElement('div');

    this.renderer.listen(this.tooltipContainer, 'mouseenter', () => {
      this.clearHideTimeout();
    });

    this.renderer.listen(this.tooltipContainer, 'mouseleave', () => {
      this.hideTimeout = setTimeout(() => {
        this.hideTooltip();
      }, 300);
    });

    // Setup base styles (fixed, z-index)
    this.renderer.addClass(this.tooltipContainer, 'fixed');
    this.renderer.addClass(this.tooltipContainer, 'z-50');

    // Add content
    this.viewRef.rootNodes.forEach(node => {
      this.renderer.appendChild(this.tooltipContainer, node);
    });

    // 2. Append to body to let the browser calculate dimensions
    this.renderer.appendChild(document.body, this.tooltipContainer);

    // 3. MEASUREMENTS & POSITIONING LOGIC
    const hostRect = this.elementRef.nativeElement.getBoundingClientRect();
    const tooltipRect = this.tooltipContainer!.getBoundingClientRect();
    const spacing = 10; // Gap between element and tooltip

    // Calculate available space
    const windowHeight = window.innerHeight;
    const spaceBelow = windowHeight - hostRect.bottom;

    // DEFAULT: Position Below
    let top = hostRect.bottom + spacing;
    let left = hostRect.left + spacing;

    // CHECK: Does it fit below?
    if (spaceBelow < tooltipRect.height + spacing) {
      // No space below? Flip to TOP
      top = hostRect.top - tooltipRect.height - spacing;
    }

    // CHECK: Does it go off the right edge? (Optional extra safety)
    if (left + tooltipRect.width > window.innerWidth) {
      // Shift left so it doesn't overflow right
      left = window.innerWidth - tooltipRect.width - spacing;
    }

    // 4. Apply final coordinates
    this.renderer.setStyle(this.tooltipContainer, 'top', `${top}px`);
    this.renderer.setStyle(this.tooltipContainer, 'left', `${left}px`);
  }

  private hideTooltip() {
    if (this.viewRef) {
      this.viewRef.destroy();
      this.viewRef = null;
    }
    if (this.tooltipContainer) {
      this.renderer.removeChild(document.body, this.tooltipContainer);
      this.tooltipContainer = null;
    }
  }
}