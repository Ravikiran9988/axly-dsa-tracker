# Axly DSA Tracker — Theme System

## Architecture

### ThemeContext (`context/ThemeContext.jsx`)
- React Context + Provider
- `localStorage` key: `axly-theme`
- Default: `light`
- Toggle: adds/removes `dark` class on `<html>`

### Hook (`hooks/useTheme.js`)
- Re-exports `useContext(ThemeContext)`
- Graceful fallback: reads localStorage if used outside Provider

---

## CSS Variables

### Light Mode (`:root`)
| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#F8FAFC` | Page background |
| `--surface` | `#FFFFFF` | Card background |
| `--surface-2` | `#F1F5F9` | Secondary surface |
| `--surface-3` | `#E8EFF7` | Tertiary surface |
| `--border-subtle` | `#E2E8F0` | Borders |
| `--text-1` | `#0F172A` | Primary text |
| `--text-2` | `#64748B` | Secondary text |
| `--text-3` | `#94A3B8` | Tertiary text |
| `--cyan` | `#0891B2` | Accent (primary) |
| `--indigo` | `#4F46E5` | Accent (secondary) |
| `--success` | `#059669` | Success states |
| `--amber` | `#D97706` | Warning states |
| `--rose` | `#E11D48` | Error/danger states |

### Dark Mode (`.dark`)
| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#070B14` | Page background |
| `--surface` | `#0D1320` | Card background |
| `--surface-2` | `#111827` | Secondary surface |
| `--surface-3` | `#1A2332` | Tertiary surface |
| `--border-subtle` | `#1F2937` | Borders |
| `--text-1` | `#F8FAFC` | Primary text |
| `--text-2` | `#94A3B8` | Secondary text |
| `--text-3` | `#64748B` | Tertiary text |
| `--cyan` | `#22D3EE` | Accent (primary) |
| `--indigo` | `#818CF8` | Accent (secondary) |
| `--success` | `#34D399` | Success states |
| `--amber` | `#FBBF24` | Warning states |
| `--rose` | `#FB7185` | Error/danger states |

---

## Tailwind Integration

### Configuration (`tailwind.config.js`)
```js
darkMode: 'class'
theme: {
  extend: {
    colors: {
      'theme-bg': 'var(--bg)',
      'theme-surface': 'var(--surface)',
      'theme-surface2': 'var(--surface-2)',
      'theme-surface3': 'var(--surface-3)',
      'theme-border': 'var(--border-subtle)',
      'theme-text1': 'var(--text-1)',
      'theme-text2': 'var(--text-2)',
      'theme-text3': 'var(--text-3)',
      'theme-cyan': 'var(--cyan)',
      'theme-indigo': 'var(--indigo)',
    }
  }
}
```

### Usage in Components
```jsx
<div className="bg-theme-surface text-theme-text1 border-theme-border">
  <p className="text-theme-text2">Secondary text</p>
  <button className="bg-theme-cyan">Action</button>
</div>
```

---

## Theme Toggle Location

### Desktop
- `Navbar.jsx` line 108-115
- Sun/Moon icon button
- Always visible

### Mobile
- `Navbar.jsx` line 169-175
- Sun/Moon icon button
- In hamburger menu drawer

---

## Component Theme Support

### Well-Themed Components
- `Sidebar.jsx` — Uses CSS variables throughout
- `Navbar.jsx` — Theme-aware backgrounds and text
- `QuestionCard.jsx` — Theme-aware surfaces
- `DailyQuestionCard.jsx` — Theme-aware surfaces
- `DsaAiCoachPanel.jsx` — Theme-aware chat interface
- `AdminQuestionModal.jsx` — Theme-aware form
- All shadcn/ui components — Theme-aware

### Components with Hardcoded Colors
| Component | Issue |
|-----------|-------|
| `DsaAiModal.jsx` | `bg-[#080d1a]` hardcoded dark background |
| Some admin pages | Inline `style` attributes with hex colors |

---

## FOUC Prevention

### Implementation
```jsx
// ThemeContext.jsx
const [theme, setTheme] = useState(() => {
  applyTheme(savedTheme); // Called synchronously during init
  return savedTheme;
});
```

### Assessment
- **Effective:** Prevents flash of unstyled content
- **Approach:** Synchronous class application during React init

---

## Accessibility

### Color Contrast
- Light mode: `#0F172A` on `#F8FAFC` → ratio ~15:1 (AAA)
- Dark mode: `#F8FAFC` on `#070B14` → ratio ~15:1 (AAA)
- Cyan accent: `#0891B2` on white → ratio ~4.5:1 (AA)

### Focus Indicators
- Uses Tailwind's `focus:ring` utilities
- Visible focus states on interactive elements

---

## Known Theme Issues

### 1. Hardcoded Colors in DsaAiModal
- **Component:** `DsaAiModal.jsx`
- **Issue:** `bg-[#080d1a]` doesn't respond to theme
- **Impact:** Always dark regardless of theme setting

### 2. Legacy Color Scales
- **Issue:** `axly.*` and `dark.*` color scales defined but may be unused
- **Impact:** CSS bloat, potential confusion

### 3. Inconsistent Theme Application
- **Issue:** Some components use CSS variables, others use Tailwind theme colors
- **Impact:** May cause visual inconsistencies

### 4. No System Preference Detection
- **Issue:** No `prefers-color-scheme` media query support
- **Impact:** Users must manually toggle theme
