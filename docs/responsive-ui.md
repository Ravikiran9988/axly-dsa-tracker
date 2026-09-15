# Axly DSA Tracker — Responsive UI Audit

## Breakpoints (Tailwind Defaults)

| Prefix | Min-width | Usage |
|--------|-----------|-------|
| Default | 0px | Mobile first |
| `sm:` | 640px | Mobile → small desktop |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Desktop |

---

## Layout Responsiveness

### MainLayout (Primary)
| Element | Mobile (<640px) | Tablet (640-1024px) | Desktop (>1024px) |
|---------|-----------------|---------------------|-------------------|
| Sidebar | Fixed overlay + backdrop | Relative, collapsible | Relative, collapsible |
| Navbar | Hamburger + brand | Full title + actions | Full title + actions |
| Content | `p-4` | `p-6` | `p-8` |

### StudentSidebar/AdminSidebar
| Element | Mobile | Desktop |
|---------|--------|---------|
| Container | `relative` (no overlay) | `relative` |
| Width | 256px expanded / 80px collapsed | Same |
| **Issue** | Consumes space permanently | Works correctly |

### Navbar (MainLayout)
| Element | Mobile | Desktop |
|---------|--------|---------|
| Brand | "AXLY" text | Full brand |
| Navigation | Hidden (sidebar) | Page title |
| Actions | Hamburger menu | Full action bar |
| Theme toggle | In drawer | Always visible |

---

## Component Responsiveness

### ProblemWorkspace
| Element | Mobile | Desktop |
|---------|--------|---------|
| Layout | Stacked (editor → tests) | Side-by-side |
| Editor | Full width | 60% width |
| Test panel | Full width | 40% width |
| Buttons | Full width | Auto width |

### DailyChallenge
| Element | Mobile | Desktop |
|---------|--------|---------|
| Challenge card | Stacked | Horizontal |
| Action button | Full width | Auto width |
| Points badge | Inline | Inline |

### QuestionCard
| Element | Mobile | Desktop |
|---------|--------|---------|
| Layout | Stacked | Horizontal |
| Title | Full width | Truncated |
| Badges | Wrap | Inline |

### DsaAiCoachPanel
| Element | Mobile | Desktop |
|---------|--------|---------|
| Chat area | Full height | 85vh max |
| Input | Full width | Full width |
| Actions | Scrollable row | Scrollable row |

### AdminTables
| Element | Mobile | Desktop |
|---------|--------|---------|
| Table | Horizontal scroll | Full width |
| Actions | Stacked | Inline |
| Pagination | Full width | Auto |

---

## Touch Targets

### Enforced
- All buttons: `min-h-[44px]`
- All inputs: `min-h-[44px]`
- All selects: `min-h-[44px]`
- `sm:min-h-0` for desktop

### Assessment
- **Good:** Touch targets meet 44px minimum
- **Issue:** Some interactive elements may be too close together on mobile

---

## Known Responsive Issues

### 1. StudentSidebar/AdminSidebar No Mobile Overlay
- **Component:** `StudentSidebar.jsx`, `AdminSidebar.jsx`
- **Issue:** Always `relative`, no off-canvas behavior
- **Impact:** Consumes 64-256px permanently on small screens
- **Comparison:** `Sidebar.jsx` (MainLayout version) has full mobile support

### 2. StudentNavbar Mobile Drawer Limited
- **Component:** `StudentNavbar.jsx`
- **Issue:** Mobile drawer only shows profile + logout (no navigation items)
- **Impact:** Students cannot navigate without sidebar

### 3. No Multi-Column Layouts at Large Screens
- **Issue:** No `lg:` breakpoint usage beyond padding
- **Impact:** Content doesn't utilize wide screens

### 4. Admin Tables on Mobile
- **Issue:** Tables use horizontal scroll (not responsive cards)
- **Impact:** Poor mobile experience for data-heavy pages

### 5. Modal Responsiveness
- **Issue:** Some modals have fixed widths (e.g., `max-w-3xl`)
- **Impact:** May overflow on small screens

---

## CSS-Level Responsive Features

### Safe Areas
```css
body {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

### Full Viewport Height
```css
#root {
  min-height: 100dvh; /* Dynamic browser chrome */
}
```

### Custom Scrollbar
```css
::-webkit-scrollbar { width: 4px; }
```

### Text Truncation
```css
.truncate-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
```

### Skeleton Loading
- Light/dark variants via CSS variables
- Shimmer animation

---

## Assessment Summary

| Area | Mobile | Tablet | Desktop | Notes |
|------|:------:|:------:|:-------:|-------|
| MainLayout | Good | Good | Good | Full responsive support |
| StudentSidebar | Poor | Fair | Good | No mobile overlay |
| AdminSidebar | Poor | Fair | Good | No mobile overlay |
| ProblemWorkspace | Good | Good | Good | Stacked → side-by-side |
| DailyChallenge | Good | Good | Good | Responsive cards |
| Admin Tables | Fair | Good | Good | Horizontal scroll |
| Modals | Fair | Good | Good | Fixed width issues |
| Touch Targets | Good | Good | Good | 44px enforced |
| Theme Toggle | Good | Good | Good | Works everywhere |

### Overall Assessment
- **Desktop:** Fully functional
- **Tablet:** Good with minor issues
- **Mobile:** Functional but sidebar issues degrade experience
