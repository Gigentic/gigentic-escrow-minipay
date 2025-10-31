Handling tooltips in **mobile-first webapps** requires balancing discoverability, accessibility, and responsive interactivity. Because there’s no hover on touchscreens, the *best practice* today is to adopt an **adaptive tooltip pattern** — hover on desktop, tap (or long-tap) on mobile — implemented in an accessible, consistent way.

---

### ✅ Best-Practice Summary (2025)

1. **Use hover/focus for desktop, tap for mobile**
   - On desktop, a tooltip should appear on `hover` or `focus` (keyboard users).  
   - On mobile, trigger the same tooltip on `tap` or `touchstart`.  
   - The tooltip remains visible until the user taps elsewhere or the trigger loses focus [1][2].

2. **Provide accessible focus behavior**
   - The tooltip must appear when the trigger receives **keyboard focus**, not just hover.  
   - Use `aria-describedby` to link the trigger to the tooltip for screen readers [7].

3. **Keep tooltips short and contextual**
   - Content should be **under 150–200 characters** and offer value in context [3][7].
   - Avoid tooltips that repeat visible information or obscure key UI content [8].

4. **Prioritize touch‑friendly triggers**
   - “i” icons or small SVGs should have at least **44×44 px touch targets** to be reliably tappable [3][8].
   - Add extra `padding` or `cursor-pointer` to the trigger for better ergonomics.

5. **Offer tap‑to‑toggle instead of long‑press**
   - Long‑press isn’t discoverable, and accessibility testing shows users expect *tap to open, tap outside to close* [2].
   - Some designs allow persistent tooltips that the user must dismiss manually.

6. **Use tooltips sparingly on mobile**
   - If the information is essential to performing a task, use **inline text or a small info popover** instead of a tooltip [7][8].
   - Tooltips work best for *contextual explanations*, *definitions*, or *quick clarifications*, not for vital actions.

7. **Accessibility: Meet WCAG 2.1 (1.4.13, 2.1.1, 4.1.2)**
   - Must work with keyboard-only navigation.
   - Tooltip should stay visible until the user dismisses or focus moves.
   - Provide sufficient color contrast and ensure screen readers announce tooltip content [7].

---

### 🧩 Implementation Pattern — “Hybrid Tooltip”

In **React / shadcn + Radix**, a common production approach combines tooltip and popover logic with an input‑type check ([5]):

```tsx
'use client';
import { useEffect, useState } from "react";
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider
} from "@/components/ui/tooltip";
import {
  Popover, PopoverTrigger, PopoverContent
} from "@/components/ui/popover";

const useIsTouch = () => {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => setIsTouch(window.matchMedia("(pointer: coarse)").matches), []);
  return isTouch;
};

export function HybridTooltip({ children, content }: { children: React.ReactNode, content: React.ReactNode }) {
  const isTouch = useIsTouch();

  const Wrapper = isTouch ? Popover : Tooltip;
  const Trigger = isTouch ? PopoverTrigger : TooltipTrigger;
  const Content = isTouch ? PopoverContent : TooltipContent;

  return (
    <TooltipProvider delayDuration={0}>
      <Wrapper>
        <Trigger asChild>{children}</Trigger>
        <Content>{content}</Content>
      </Wrapper>
    </TooltipProvider>
  );
}
```

Usage:
```tsx
<HybridTooltip content="This is free and doesn't send a transaction">
  <InfoIcon className="w-4 h-4" />
</HybridTooltip>
```

✅ Hover on desktop  
✅ Tap on mobile  
✅ Works with keyboard focus for accessibility  

---

### 📐 UX Guidelines Recap

| Goal | Desktop | Mobile |
|------|----------|---------|
| Trigger | Hover / Focus | Tap / Touch |
| Dismiss | Mouse out / Blur | Tap outside or “X” |
| Position | Above or right | Bottom or modal‑like popover |
| Content | Short, contextual | Same text, optimized spacing |
| Accessibility | `aria-describedby` + focusable | Tap‑to‑toggle + escape key handler |

---

### 🔎 References
- [1] *Responsive Tooltip Design Q&A, UX StackExchange* – mobile tooltips should trigger on tap or focus.  
- [2] *Android/iOS long‑press handler pattern for hover simulation*.  
- [3] *Dashboard Design Principles 2025* – touch targets 42‑48 px; context‑sensitive help improves cognitive load.  
- [5] *Stack Overflow (ShadCN Hybrid Tooltip solution)* – tooltip on desktop, popover on mobile.  
- [7] *Flook, “Are Tooltips Accessible? WCAG Tips and Best Practices”*, Apr 2025 – keyboard, focus, dismissibility.  
- [8] *Smashing Magazine, “Designing Better Tooltips for Mobile Interfaces”*, 2025 – context, brevity, placement.

---

**TL;DR:**  
↳ Hover/focus on desktop, tap-to-toggle on mobile.  
↳ Ensure accessibility (focus, ARIA, dismiss).  
↳ Make touch areas large and content concise.  
↳ Prefer hybrid tooltip/popover components for adaptive, mobile-first behavior.