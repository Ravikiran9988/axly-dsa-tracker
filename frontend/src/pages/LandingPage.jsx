import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from '../hooks/useTheme'

// ── Icons ──────────────────────────────────────────────────────────────────
const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)
const CheckIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
)
const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)
const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const BotIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/>
    <path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>
  </svg>
)
const ZapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)
const TrendingUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
)
const BookIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
)
const FlameIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
)
const TargetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
)
const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
)
const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const AxlyLogo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)

// ── Shared code strings ────────────────────────────────────────────────────
const HERO_CODE = `<span style="color:#C792EA">def</span> <span style="color:#82AAFF">twoSum</span>(self, numbers, target):
  left, right = <span style="color:#F78C6C">0</span>, len(numbers) - <span style="color:#F78C6C">1</span>
  <span style="color:#C792EA">while</span> left &lt; right:
    s = numbers[left] + numbers[right]
    <span style="color:#C792EA">if</span> s == target:
      <span style="color:#C792EA">return</span> [left+<span style="color:#F78C6C">1</span>, right+<span style="color:#F78C6C">1</span>]
    <span style="color:#C792EA">elif</span> s &lt; target: left += <span style="color:#F78C6C">1</span>
    <span style="color:#C792EA">else</span>: right -= <span style="color:#F78C6C">1</span>`

const WORKSPACE_CODE = `<span style="color:#C792EA">class</span> <span style="color:#FFCB6B">Solution</span>:
  <span style="color:#C792EA">def</span> <span style="color:#82AAFF">twoSum</span>(self, numbers, target):
    left, right = <span style="color:#F78C6C">0</span>, len(numbers)-<span style="color:#F78C6C">1</span>
    <span style="color:#C792EA">while</span> left &lt; right:
      current = numbers[left] + numbers[right]
      <span style="color:#C792EA">if</span> current == target:
        <span style="color:#C792EA">return</span> [left+<span style="color:#F78C6C">1</span>, right+<span style="color:#F78C6C">1</span>]
      <span style="color:#C792EA">elif</span> current &lt; target: left += <span style="color:#F78C6C">1</span>
      <span style="color:#C792EA">else</span>: right -= <span style="color:#F78C6C">1</span>`

// ── Component ──────────────────────────────────────────────────────────────
export default function LandingPage({ onNavigateToLogin }) {
  // Use the global theme — shared with the entire app
  const { isDark, toggleTheme } = useTheme();
  const toggle = toggleTheme;
  const [mobileOpen, setMobileOpen] = useState(false)

  // Style shorthand tokens
  const T = {
    bg:       { background: "var(--bg)" },
    surface:  { background: "var(--surface)" },
    s2:       { background: "var(--surface-2)" },
    s3:       { background: "var(--surface-3)" },
    border:   { borderColor: "var(--border)" },
    t1:       { color: "var(--text-1)" },
    t2:       { color: "var(--text-2)" },
    t3:       { color: "var(--text-3)" },
    cyan:     { color: "var(--cyan)" },
    indigo:   { color: "var(--indigo)" },
    cyanBg:   { background: "var(--cyan-dim)", color: "var(--cyan)" },
    indigoBg: { background: "var(--indigo-dim)", color: "var(--indigo)" },
    successBg:{ background: "var(--success-dim)", color: "var(--success)" },
    amberBg:  { background: "var(--amber-dim)", color: "var(--amber)" },
    roseBg:   { background: "var(--rose-dim)", color: "var(--rose)" },
  }

  // ── Primitives ─────────────────────────────────────────────────────────
  const Card = ({ children, className = "", style = {} }) => (
    <div className={`rounded-xl border ${className}`} style={{ ...T.surface, ...T.border, ...style }}>
      {children}
    </div>
  )

  const Badge = ({ children, color = "cyan" }) => {
    const map = {
      cyan: T.cyanBg, indigo: T.indigoBg, green: T.successBg, amber: T.amberBg, rose: T.roseBg,
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={map[color]}>
        {children}
      </span>
    )
  }

  const SectionHeader = ({ tag, headline, sub, center = true }) => (
    <div className={`mb-14 ${center ? "text-center" : ""}`}>
      {tag && <div className={`mb-4 ${center ? "flex justify-center" : ""}`}>{tag}</div>}
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" style={T.t1}>{headline}</h2>
      {sub && <p className={`text-base leading-relaxed ${center ? "max-w-lg mx-auto" : "max-w-md"}`} style={T.t2}>{sub}</p>}
    </div>
  )

  const ProgressBar = ({ pct, color = "var(--cyan)" }) => (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  )

  const CheckRow = ({ text, color = "cyan" }) => (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={color === "cyan" ? T.cyanBg : color === "indigo" ? T.indigoBg : T.successBg}>
        <CheckIcon size={10} />
      </div>
      <span className="text-sm" style={T.t2}>{text}</span>
    </div>
  )

  const diffColor = (d) => d === "Easy" ? "green" : d === "Medium" ? "amber" : "rose"

  const navLinks = ["Features", "How It Works", "Curriculum", "Practice", "Challenges"]

  // ── Dark editor chrome (always dark regardless of page theme) ────────────
  const EditorChrome = ({ url }) => (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ background: "#161B22", borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="flex gap-1.5" aria-hidden="true">
        <div className="w-3 h-3 rounded-full bg-red-500 opacity-70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-70" />
        <div className="w-3 h-3 rounded-full bg-green-500 opacity-70" />
      </div>
      <div className="flex-1 flex justify-center">
        <div className="bg-theme-surface2 rounded px-3 py-0.5 text-[11px] text-theme-text2 font-mono">{url}</div>
      </div>
    </div>
  )

  return (
    <div style={T.bg} className="min-h-screen font-sans">

      {/* ══ NAVBAR ══════════════════════════════════════════════════════════ */}
      <header>
        <nav
          className="sticky top-0 z-50 border-b"
          style={{ borderColor: "var(--border)", backdropFilter: "blur(12px)", background: isDark ? "rgba(7,11,20,0.93)" : "rgba(255,255,255,0.93)" }}
          aria-label="Main navigation"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">

              {/* Logo */}
              <a href="#" className="flex items-center gap-2.5" aria-label="Axly DSA Tracker home">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, var(--cyan-bright), var(--indigo-bright))" }}>
                  <AxlyLogo />
                </div>
                <span className="font-bold text-sm tracking-tight font-mono" style={T.t1}>
                  AXLY <span style={T.t3} className="font-normal font-sans">DSA TRACKER</span>
                </span>
              </a>

              {/* Desktop nav */}
              <nav className="hidden md:flex items-center gap-6" aria-label="Site sections">
                {navLinks.map(l => (
                  <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`}
                    className="text-sm font-semibold transition-colors"
                    style={{ ...T.t2, textDecoration: "none" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-2)")}
                  >{l}</a>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggle}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ ...T.s2, ...T.t2 }}
                  onMouseEnter={e => ((e.currentTarget).style.color = "var(--text-1)")}
                  onMouseLeave={e => ((e.currentTarget).style.color = "var(--text-2)")}
                  aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {isDark ? <SunIcon /> : <MoonIcon />}
                </button>
                <div className="hidden md:flex items-center gap-2">
                  <button onClick={() => onNavigateToLogin('login')} className="text-sm px-4 py-1.5 rounded-lg transition-colors font-semibold" style={T.t2}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-2)")}
                  >Sign In</button>
                  <button onClick={() => onNavigateToLogin('login')} className="text-sm px-4 py-1.5 rounded-lg text-white font-bold transition-all shadow hover:opacity-90 active:scale-95"
                    style={{ background: "linear-gradient(135deg, var(--cyan-bright), var(--indigo-bright))" }}>
                    Get Started
                  </button>
                </div>
                <button className="md:hidden w-8 h-8 flex items-center justify-center" style={T.t2}
                  onClick={() => setMobileOpen(o => !o)}
                  aria-expanded={mobileOpen}
                  aria-controls="mobile-menu"
                  aria-label={mobileOpen ? "Close menu" : "Open menu"}
                >
                  {mobileOpen ? <XIcon /> : <MenuIcon />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div id="mobile-menu" className="md:hidden border-t px-4 py-4 flex flex-col gap-4" style={{ ...T.surface, borderColor: "var(--border)" }}>
              {navLinks.map(l => (
                <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`}
                  className="text-sm py-1 font-semibold" style={{ ...T.t2, textDecoration: "none" }}
                  onClick={() => setMobileOpen(false)}>{l}</a>
              ))}
              <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <button onClick={() => onNavigateToLogin('login')} className="flex-1 text-sm py-2 rounded-lg font-semibold" style={{ ...T.s2, ...T.t2 }}>Sign In</button>
                <button onClick={() => onNavigateToLogin('login')} className="flex-1 text-sm py-2 rounded-lg text-white font-bold"
                  style={{ background: "linear-gradient(135deg, var(--cyan-bright), var(--indigo-bright))" }}>
                  Get Started
                </button>
              </div>
            </div>
          )}
        </nav>
      </header>

      <main>
        {/* ══ HERO ════════════════════════════════════════════════════════ */}
        <section id="features" className="relative overflow-hidden" aria-labelledby="hero-heading">
          {/* Ambient */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/4 w-[500px] h-[400px] rounded-full blur-3xl" style={{ background: "var(--cyan-bright)", opacity: isDark ? 0.08 : 0.06 }} />
            <div className="absolute top-20 right-1/4 w-96 h-80 rounded-full blur-3xl" style={{ background: "var(--indigo-bright)", opacity: isDark ? 0.07 : 0.05 }} />
          </div>
          {/* Grid texture */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{
            backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
            backgroundSize: "48px 48px", opacity: isDark ? 0.4 : 0.6,
          }} />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-16 lg:pt-11 lg:pb-24">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

              {/* Left: copy */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-6 text-xs font-semibold"
                  style={{ ...T.border, ...T.cyanBg }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  Pattern-First DSA Practice
                </div>

                <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold leading-[1.1] tracking-tight mb-5" style={T.t1}>
                  Master DSA.<br />
                  <span style={{ background: "linear-gradient(135deg, var(--cyan-bright), var(--indigo-bright))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Build Problem-Solving
                  </span>
                  <br />Instincts.
                </h1>

                <p className="text-base leading-relaxed mb-8 max-w-[440px]" style={T.t2}>
                  Learn patterns, practice curated problems, code in a real workspace, get AI coaching when stuck, tackle daily challenges, and track your progress — all in one place.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button onClick={() => onNavigateToLogin('login')} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-lg hover:opacity-90 active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, var(--cyan-bright), var(--indigo-bright))" }}>
                    Start Practicing <ArrowRight />
                  </button>
                  <button onClick={() => document.getElementById('curriculum').scrollIntoView({behavior:'smooth'})} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border transition-all hover:bg-theme-surface2 active:scale-[0.98]"
                    style={{ ...T.border, ...T.t1, background: "transparent" }}>
                    Explore Problems
                  </button>
                </div>

                <div className="flex items-center gap-8 mt-10 pt-8 border-t" style={{ borderColor: "var(--border)" }}>
                  {[["80+", "Curated Problems"], ["15+", "DSA Patterns"], ["Daily", "Challenges"]].map(([val, label]) => (
                    <div key={label}>
                      <div className="text-xl font-extrabold" style={T.t1}>{val}</div>
                      <div className="text-xs mt-0.5 font-medium" style={T.t3}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: product preview — always dark */}
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl border" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)", background: "#0D1117" }}
                  role="img" aria-label="Axly coding workspace showing Two Sum II problem with code editor and AI Coach panel">
                  <EditorChrome url="app.axly.dev/workspace/two-sum-ii" />

                  <div className="grid grid-cols-5 text-xs" style={{ minHeight: 360 }}>
                    {/* Problem */}
                    <div className="col-span-2 border-r p-4" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0D1117" }}>
                      <p className="text-white font-semibold mb-2">Two Sum II</p>
                      <div className="flex gap-1.5 mb-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Medium</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium border border-cyan-500/20" style={{ background: "rgba(34,211,238,0.1)", color: "#22D3EE" }}>Two Pointers</span>
                      </div>
                      <p className="text-theme-text2 leading-relaxed mb-3">
                        Given a 1-indexed sorted integer array, return the indices of two numbers that add up to target.
                      </p>
                      <div className="text-theme-text3 space-y-1">
                        <div><span className="text-theme-text2">Input:</span> [2,7,11,15], 9</div>
                        <div><span className="text-theme-text2">Output:</span> [1,2]</div>
                      </div>
                      <div className="mt-4 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center">
                            <svg width="6" height="6" viewBox="0 0 10 10" fill="none" aria-hidden="true"><polyline points="1 5 4 8 9 2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </div>
                          <span className="text-emerald-400 font-medium">All Tests Passed</span>
                        </div>
                        {["[2,7]→[1,2]", "[2,3,4]→[1,3]", "[−1,0]→[1,2]"].map((t, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[10px] text-theme-text3 mb-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                            Case {i + 1}: {t} ✓
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Editor */}
                    <div className="col-span-2 border-r flex flex-col" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0D1117" }}>
                      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#161B22" }}>
                        <span className="text-[10px] text-theme-text2 font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)" }}>solution.py</span>
                        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-theme-text3">
                          <span className="px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)" }}>Python</span>
                        </div>
                      </div>
                      <pre className="flex-1 p-3 text-[11px] leading-[1.65] font-mono overflow-hidden" style={{ color: "#E2E8F0" }}
                        dangerouslySetInnerHTML={{ __html: HERO_CODE }} />
                      <div className="flex gap-2 px-3 pb-3">
                        <button className="px-3 py-1.5 rounded text-xs font-semibold transition-opacity hover:opacity-80 border"
                          style={{ background: "rgba(34,211,238,0.15)", color: "#22D3EE", borderColor: "rgba(34,211,238,0.3)" }}>▶ Run</button>
                        <button className="px-3 py-1.5 rounded text-xs font-bold text-white transition-opacity hover:opacity-80"
                          style={{ background: "linear-gradient(135deg, #06B6D4, #6366F1)" }}>Submit</button>
                      </div>
                    </div>

                    {/* AI Coach */}
                    <div className="col-span-1 p-3 flex flex-col" style={{ background: "#080D18" }}>
                      <div className="flex items-center gap-1.5 mb-3">
                        <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: "rgba(129,140,248,0.2)", color: "#818CF8" }}>
                          <BotIcon size={10} />
                        </div>
                        <span className="text-[10px] font-semibold text-theme-text2">AI Coach</span>
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="rounded-lg p-2 text-[9px] text-theme-text2 leading-relaxed border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}>
                          Your pointer logic is close. What condition tells you the current pair is too large?
                        </div>
                        <p className="text-[9px] leading-relaxed font-medium" style={{ color: "#818CF8" }}>
                          Hint: sorted array → moving right pointer decreases the sum.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <div className="bg-theme-surface2 rounded px-2 py-1">
                          <span className="text-[9px] text-theme-text3 font-medium">Ask a question...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg text-xs font-semibold whitespace-nowrap"
                  style={{ ...T.surface, borderColor: "var(--border)", ...T.t1 }}>
                  <div className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
                  Real product workspace — not a mockup
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ CORE FEATURES ════════════════════════════════════════════════ */}
        <section id="features-detail" className="py-20 lg:py-28" aria-labelledby="features-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHeader
              headline={<span id="features-heading">Everything You Need to Master DSA</span>}
              sub="Built to maximize pattern recognition, conceptual clarity, and problem-solving speed — not to pad a problem count."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {([
                { icon: <TargetIcon />, color: "cyan", title: "Pattern-First Learning", desc: "Problems organized around recognizable algorithmic patterns. You learn strategies that transfer, not solutions to memorize." },
                { icon: <BookIcon />, color: "indigo", title: "Curated Practice", desc: "80 hand-picked problems across essential DSA topics. Every problem is there for a reason — filtered by pattern and difficulty." },
                { icon: <BotIcon />, color: "indigo", title: "DSA AI Coach", desc: "Stuck? Get progressive hints, pattern guidance, and debugging help — without the answer being handed to you." },
                { icon: <FlameIcon />, color: "amber", title: "Daily Challenge", desc: "One focused problem every day. Build the habit, maintain your streak, earn points, and develop real consistency." },
              ]).map(f => (
                <Card key={f.title} className="p-6 transition-transform hover:-translate-y-1 hover:shadow-md cursor-pointer">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 shadow-sm"
                    style={f.color === "cyan" ? T.cyanBg : f.color === "indigo" ? T.indigoBg : T.amberBg}>
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-base mb-2" style={T.t1}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={T.t2}>{f.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ══ HOW IT WORKS ═════════════════════════════════════════════════ */}
        <section id="how-it-works" className="py-20 lg:py-28 border-y" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }} aria-labelledby="hiw-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHeader
              headline={<span id="hiw-heading">The Axly Learning Loop</span>}
              sub="A deliberate system for building real algorithmic instincts — not shortcuts for memorizing solutions."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
              {[
                { n: "01", icon: <TargetIcon />, title: "Learn the Pattern", desc: "Understand the algorithmic pattern — Two Pointers, Sliding Window, BFS, DP — before writing a single line of code." },
                { n: "02", icon: <BookIcon />, title: "Practice Curated Problems", desc: "Work through problems selected specifically for that pattern. Deliberate practice beats volume every time." },
                { n: "03", icon: <BotIcon />, title: "Get AI Guidance When Stuck", desc: "The AI Coach provides targeted hints and reasoning frameworks — guiding your thinking, not revealing the answer." },
                { n: "04", icon: <FlameIcon />, title: "Build Consistency Daily", desc: "One Daily Challenge every day keeps the habit alive. Streaks, points, and pattern exposure compound over time." },
              ].map((step, i) => (
                <div key={step.n} className="flex lg:flex-col items-start gap-5 lg:gap-4 group">
                  <div className="flex-shrink-0 relative">
                    <div className="w-14 h-14 rounded-2xl border flex items-center justify-center transition-colors group-hover:border-cyan-500/50" style={{ ...T.surface, borderColor: "var(--border)" }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={T.cyanBg}>{step.icon}</div>
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm" style={{...T.cyanBg, background: "linear-gradient(135deg, var(--cyan-bright), var(--indigo-bright))", color: "white"}}>
                      {i + 1}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-base mb-1.5" style={T.t1}>{step.title}</h3>
                    <p className="text-sm leading-relaxed" style={T.t2}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ AI COACH ═════════════════════════════════════════════════════ */}
        <section id="ai-coach" className="py-20 lg:py-28" aria-labelledby="coach-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

              <div>
                <Badge color="indigo"><BotIcon /> DSA AI Coach</Badge>
                <h2 id="coach-heading" className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4 mb-4" style={T.t1}>
                  Stuck? Learn the next step —<br />don&apos;t just see the answer.
                </h2>
                <p className="text-lg leading-relaxed mb-6" style={T.t2}>
                  The Axly AI Coach is a DSA mentor, not a solution dispenser. It helps you understand why an approach works — through progressive hints, pattern guidance, and Socratic reasoning.
                </p>
                <div className="space-y-4 mb-8">
                  {[
                    "Progressive hints — revealed one layer at a time",
                    "Pattern guidance to point you toward the right approach",
                    "Debugging assistance with targeted questions",
                    "Complexity and trade-off explanations",
                    "Concept clarification without spoiling the solve",
                  ].map(f => <CheckRow key={f} text={f} color="indigo" />)}
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border shadow-sm" style={{ ...T.border, ...T.t2 }}>
                  <div className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
                  Your DSA Problem-Solving Coach
                </div>
              </div>

              {/* AI Coach chat mockup */}
              <Card className="overflow-hidden shadow-xl">
                <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)", ...T.s2 }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={T.indigoBg}><BotIcon /></div>
                  <div>
                    <p className="text-sm font-bold" style={T.t1}>Axly AI Coach</p>
                    <p className="text-[11px] font-medium" style={T.t3}>Two Sum II · Two Pointers</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--success)" }}>
                    <div className="w-2 h-2 rounded-full bg-current" aria-hidden="true" /> Online
                  </div>
                </div>

                <div className="p-4 space-y-4" style={{ minHeight: 320 }}>
                  {/* Student message */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-sm"
                      style={{ background: "linear-gradient(135deg, var(--cyan-bright), var(--indigo-bright))" }}>S</div>
                    <div className="rounded-2xl rounded-tl-none px-4 py-3 text-sm max-w-xs shadow-sm" style={{ ...T.s2, ...T.t1 }}>
                      I&apos;m stuck after finding the left and right pointers. I don&apos;t know which one to move.
                    </div>
                  </div>

                  {/* Coach response */}
                  <div className="flex gap-3 justify-end">
                    <div className="rounded-2xl rounded-tr-none px-4 py-3 text-sm max-w-xs shadow-sm" style={{ ...T.t1, border: "1px solid var(--indigo-dim)", background: isDark ? "rgba(129,140,248,0.07)" : "rgba(79,70,229,0.04)" }}>
                      <p>You&apos;re close. Before moving a pointer, ask yourself: <span style={T.indigo} className="font-semibold">what condition tells you the current pair sum is too large or too small?</span></p>
                      <p className="mt-2" style={T.t2}>Because the array is sorted, what happens to the sum when you move the left pointer right?</p>
                    </div>
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center flex-shrink-0 shadow-sm" style={T.indigoBg}><BotIcon /></div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pl-11 pt-2">
                    {["Think about it", "Give me another hint", "Explain the pattern"].map(a => (
                      <button key={a} className="text-xs px-3.5 py-2 rounded-xl border transition-all hover:bg-theme-surface2 font-medium"
                        style={{ ...T.border, ...T.t2, background: "transparent" }}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 border-t" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border" style={{ ...T.surface, borderColor: "var(--border)" }}>
                    <span className="flex-1 text-sm font-medium" style={T.t3}>Ask the coach...</span>
                    <div style={T.indigo} className="bg-indigo-500/10 p-1.5 rounded-md"><ArrowRight /></div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ══ PRACTICE LIBRARY ═════════════════════════════════════════════ */}
        <section id="practice" className="py-20 lg:py-28 border-y" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }} aria-labelledby="library-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

              {/* Library mockup */}
              <Card className="overflow-hidden shadow-xl">
                <div className="p-4 border-b" style={{ borderColor: "var(--border)", ...T.surface }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm shadow-sm" style={{ ...T.border, ...T.surface, ...T.t3 }}>
                      <SearchIcon /> Search problems...
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(["All", "Easy", "Medium", "Hard"]).map((l, i) => (
                      <Badge key={l} color={(["cyan", "green", "amber", "rose"])[i]}>{l}</Badge>
                    ))}
                    <button className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold" style={{ ...T.border, ...T.t2, ...T.surface }}>
                      Pattern <ChevronDown />
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold" style={{ ...T.border, ...T.t2, ...T.surface }}>
                      Status <ChevronDown />
                    </button>
                  </div>
                </div>

                <div role="list" className="bg-white dark:bg-theme-surface">
                  {[
                    { title: "Two Sum II", diff: "Medium", pattern: "Two Pointers", status: "Solved", action: "Review" },
                    { title: "Binary Search", diff: "Medium", pattern: "Binary Search", status: "In Progress", action: "Continue" },
                    { title: "Valid Parentheses", diff: "Easy", pattern: "Stack", status: "Solved", action: "Review" },
                    { title: "Longest Substring Without Repeating", diff: "Medium", pattern: "Sliding Window", status: "Not Started", action: "Solve" },
                    { title: "Trapping Rain Water", diff: "Hard", pattern: "Two Pointers", status: "Not Started", action: "Solve" },
                  ].map((p, i) => {
                    const statusDot = p.status === "Solved" ? "bg-emerald-400" : p.status === "In Progress" ? "bg-yellow-400" : "bg-slate-500"
                    const actionStyle = p.action === "Continue"
                      ? T.cyanBg
                      : p.action === "Review"
                      ? T.indigoBg
                      : { ...T.s3, color: "var(--text-2)" }
                    return (
                      <div key={p.title} role="listitem" className="flex items-center gap-3 px-5 py-4 border-b text-sm transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-theme-surface2"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} aria-label={p.status} />
                        <span className="flex-1 font-bold truncate" style={T.t1}>{p.title}</span>
                        <Badge color={diffColor(p.diff)}>{p.diff}</Badge>
                        <span className="hidden sm:block px-2.5 py-1 rounded-md text-[11px] font-medium" style={T.cyanBg}>{p.pattern}</span>
                        <button className="px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-opacity hover:opacity-80 shadow-sm" style={actionStyle}>
                          {p.action}
                        </button>
                      </div>
                    )
                  })}
                </div>

                <div className="px-5 py-4 flex items-center justify-between text-xs font-medium" style={{...T.t3, ...T.surface}}>
                  <span>Showing 5 of 80 problems</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map(n => (
                      <button key={n} className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold shadow-sm"
                        style={n === 1 ? T.cyanBg : { ...T.s2, ...T.t3 }}>{n}</button>
                    ))}
                  </div>
                </div>
              </Card>

              <div>
                <Badge color="cyan"><BookIcon /> Practice Library</Badge>
                <h2 id="library-heading" className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4 mb-4" style={T.t1}>
                  80 problems.<br />Every one earns its place.
                </h2>
                <p className="text-lg leading-relaxed mb-8" style={T.t2}>
                  Not a dump of every LeetCode problem. A curated set designed to cover every essential pattern — filterable by topic, difficulty, pattern, and your own progress.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[["80+", "Curated Problems"], ["15+", "Pattern Groups"], ["3", "Difficulty Levels"], ["Per-problem", "Status Tracking"]].map(([val, label]) => (
                    <Card key={label} className="p-5 shadow-sm">
                      <div className="text-2xl font-black mb-1" style={T.cyan}>{val}</div>
                      <div className="text-sm font-medium" style={T.t2}>{label}</div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ CODING WORKSPACE ═════════════════════════════════════════════ */}
        <section id="workspace" className="py-20 lg:py-28" aria-labelledby="workspace-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <Badge color="cyan"><ZapIcon /> Coding Workspace</Badge>
                <h2 id="workspace-heading" className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4 mb-4" style={T.t1}>
                  Practice Like You Code.
                </h2>
                <p className="text-lg leading-relaxed mb-6" style={T.t2}>
                  A full coding environment with a Monaco-style editor, language selector, instant test execution, and line-by-line results. The loop is: Problem → Think → Code → Test → Guidance → Submit.
                </p>
                <div className="space-y-4">
                  {[
                    "Monaco-style editor with syntax highlighting",
                    "Python, JavaScript, Java — pick your language",
                    "Run against visible and hidden test cases",
                    "Instant per-case feedback with runtime and memory",
                    "Previous submissions saved and reviewable",
                  ].map(f => <CheckRow key={f} text={f} color="cyan" />)}
                </div>
              </div>

              {/* Always-dark workspace */}
              <div className="rounded-2xl overflow-hidden border shadow-2xl" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)", background: "#0D1117" }}
                role="img" aria-label="Axly Monaco-style code editor with test results panel">
                <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ background: "#161B22", borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-4">
                    {["Problem", "Solution", "Notes"].map((t, i) => (
                      <span key={t} className="text-xs font-medium px-3 py-1"
                        style={{ color: i === 1 ? "#E2E8F0" : "#64748B", borderBottom: i === 1 ? "2px solid #22D3EE" : "2px solid transparent" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="ml-auto flex gap-2">
                    <span className="text-[11px] px-2.5 py-1 rounded font-mono font-semibold" style={{ background: "rgba(255,255,255,0.06)", color: "#94A3B8" }}>Python 3</span>
                    <button className="px-4 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80 border" style={{ background: "rgba(34,211,238,0.15)", color: "#22D3EE", borderColor:"rgba(34,211,238,0.3)" }}>▶ Run</button>
                    <button className="px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-80 shadow-md" style={{ background: "linear-gradient(135deg, #06B6D4, #6366F1)" }}>Submit</button>
                  </div>
                </div>

                <div className="flex font-mono text-sm" style={{ minHeight: 220 }}>
                  <div className="px-3 pt-5 select-none text-right leading-6 w-12 flex-shrink-0" style={{ color: "#374151" }}>
                    {Array.from({ length: 9 }, (_, i) => <div key={i}>{i + 1}</div>)}
                  </div>
                  <pre className="flex-1 px-4 pt-5 text-sm leading-6 overflow-auto" style={{ color: "#E2E8F0" }}
                    dangerouslySetInnerHTML={{ __html: WORKSPACE_CODE }} />
                </div>

                <div className="border-t p-5" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#080D18" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-400 text-sm font-bold">All Tests Passed · 3/3 · Runtime: 87ms · Memory: 17.2 MB</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[["Case 1", "[2,7,11,15], 9", "[1,2]"], ["Case 2", "[2,3,4], 6", "[1,3]"], ["Case 3", "[-1,0], -1", "[1,2]"]].map(([label, inp, out]) => (
                      <div key={label} className="rounded-xl p-3" style={{ background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.14)" }}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                          <span className="text-emerald-400 text-[11px] font-bold uppercase tracking-wider">{label}</span>
                        </div>
                        <div className="text-[11px] text-theme-text2 space-y-1 font-mono">
                          <div>in: {inp}</div>
                          <div>out: {out}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ PRACTICE VS CHALLENGE ════════════════════════════════════════ */}
        <section id="challenges" className="py-20 lg:py-28 border-y" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }} aria-labelledby="pvc-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHeader
              headline={<span id="pvc-heading">Practice Deep. Challenge Daily.</span>}
              sub="Two complementary modes that cover different parts of what it takes to get good at DSA."
            />
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card className="p-8 relative overflow-hidden shadow-lg transition-transform hover:-translate-y-1">
                <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, var(--cyan-bright), transparent)" }} aria-hidden="true" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-sm" style={T.cyanBg}><BookIcon /></div>
                <h3 className="text-xl font-extrabold mb-3" style={T.t1}>Self-Paced Practice</h3>
                <p className="text-base mb-6 leading-relaxed" style={T.t2}>Go deep on patterns without a clock. Real understanding, not memorized solutions.</p>
                <ul className="space-y-3.5">
                  {["Pattern mastery — not random grinding", "Curated problems for each topic", "Learn at your own pace", "Review and revisit mistakes", "Build genuine conceptual understanding"].map(f => (
                    <li key={f} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={T.cyanBg}><CheckIcon size={10} /></div>
                      <span className="text-sm font-medium" style={T.t2}>{f}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-8 relative overflow-hidden shadow-lg transition-transform hover:-translate-y-1">
                <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, var(--indigo-bright), transparent)" }} aria-hidden="true" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-sm" style={T.indigoBg}><FlameIcon /></div>
                <h3 className="text-xl font-extrabold mb-3" style={T.t1}>Daily Challenge</h3>
                <p className="text-base mb-6 leading-relaxed" style={T.t2}>One focused problem every day. The habit compounds — even when motivation doesn&apos;t.</p>
                <ul className="space-y-3.5">
                  {["One focused problem per day", "Daily consistency over binge sessions", "Streak tracking with reset accountability", "Competitive points and leaderboard", "Test your instincts under mild pressure"].map(f => (
                    <li key={f} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={T.indigoBg}><CheckIcon size={10} /></div>
                      <span className="text-sm font-medium" style={T.t2}>{f}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* ══ CURRICULUM ═══════════════════════════════════════════════════ */}
        <section id="curriculum" className="py-20 lg:py-28" aria-labelledby="curriculum-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHeader
              headline={<span id="curriculum-heading">A Structured Path Through DSA</span>}
              sub="Not a random pile of problems. A deliberate curriculum organized by pattern and progression level."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { pattern: "Arrays & Hashing", problems: 12, done: 10, diff: "Beginner", topics: ["Two Sum", "Group Anagrams", "Top K Elements"] },
                { pattern: "Two Pointers", problems: 10, done: 8, diff: "Beginner", topics: ["Valid Palindrome", "Container With Water", "3Sum"] },
                { pattern: "Sliding Window", problems: 8, done: 5, diff: "Intermediate", topics: ["Longest Substring", "Best Time to Buy", "Permutation in String"] },
                { pattern: "Binary Search", problems: 9, done: 4, diff: "Intermediate", topics: ["Search Rotated Array", "Koko Eating Bananas", "Median of Arrays"] },
                { pattern: "Trees & BFS/DFS", problems: 14, done: 6, diff: "Intermediate", topics: ["Invert Binary Tree", "Level Order Traversal", "Max Depth"] },
                { pattern: "Dynamic Programming", problems: 13, done: 2, diff: "Advanced", topics: ["Climbing Stairs", "Coin Change", "Longest Common Subseq"] },
              ].map(c => {
                const diffColor2 = c.diff === "Beginner" ? "green" : c.diff === "Intermediate" ? "amber" : "rose"
                return (
                  <Card key={c.pattern} className="p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer group">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-base" style={T.t1}>{c.pattern}</h3>
                      <Badge color={diffColor2}>{c.diff}</Badge>
                    </div>
                    <p className="text-sm font-medium mb-4" style={T.t3}>{c.done}/{c.problems} problems</p>
                    <div className="space-y-2 mb-5">
                      {c.topics.map(t => (
                        <div key={t} className="flex items-center gap-2.5 text-sm" style={T.t2}>
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--cyan)" }} aria-hidden="true" />
                          {t}
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                      <ProgressBar pct={Math.round((c.done / c.problems) * 100)} color={`linear-gradient(90deg, var(--cyan-bright), var(--indigo-bright))`} />
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* ══ ANALYTICS ════════════════════════════════════════════════════ */}
        <section id="analytics" className="py-20 lg:py-28 border-y" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }} aria-labelledby="analytics-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <Badge color="indigo"><TrendingUp /> Progress Analytics</Badge>
                <h2 id="analytics-heading" className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4 mb-4" style={T.t1}>
                  Know Where You Stand.
                </h2>
                <p className="text-lg leading-relaxed mb-6" style={T.t2}>
                  Surface real weaknesses — not vanity metrics. Know exactly which patterns need more work, where your difficulty ceiling is, and how your consistency is trending.
                </p>
                <div className="space-y-4">
                  {[
                    "Pattern-level progress breakdown",
                    "Difficulty distribution across all solves",
                    "Weak vs. strong area identification",
                    "Streak and daily consistency tracking",
                    "Recent submission history",
                  ].map(f => <CheckRow key={f} text={f} color="indigo" />)}
                </div>
              </div>

              {/* Analytics dashboard mockup */}
              <Card className="overflow-hidden shadow-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)", ...T.s2 }}>
                  <span className="text-base font-bold" style={T.t1}>My Progress</span>
                  <Badge color="amber"><FlameIcon /> 12-day streak</Badge>
                </div>

                <div className="p-6 space-y-6" style={T.surface}>
                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      ["42/80", "Solved", "cyan"],
                      ["12d", "Streak", "amber"],
                      ["8d", "Challenge", "indigo"],
                      ["78%", "Accuracy", "green"],
                    ].map(([val, label, c]) => (
                      <div key={label} className="p-3.5 rounded-xl text-center border shadow-sm" style={{...T.s2, borderColor: "var(--border)"}}>
                        <div className="text-xl font-black mb-1" style={{ color: `var(--${c})` }}>{val}</div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider" style={T.t3}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Topics mastered */}
                  <div>
                    <p className="text-sm font-bold mb-4" style={T.t2}>Topics Mastered</p>
                    <div className="space-y-3.5">
                      {[
                        ["Arrays", 90, "cyan"],
                        ["Strings", 80, "indigo"],
                        ["Trees", 55, "amber"],
                        ["Graphs", 30, "rose"],
                        ["Dynamic Programming", 15, "rose"],
                      ].map(([label, pct, c]) => (
                        <div key={label}>
                          <div className="flex justify-between text-xs font-semibold mb-1.5" style={T.t2}>
                            <span>{label}</span>
                            <span style={T.t3}>{pct}%</span>
                          </div>
                          <ProgressBar pct={pct} color={`var(--${c})`} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div className="pt-2">
                    <p className="text-sm font-bold mb-4" style={T.t2}>Difficulty Breakdown</p>
                    <div className="flex gap-3">
                      {[["Easy", 18, "green"], ["Medium", 20, "amber"], ["Hard", 4, "rose"]].map(([label, n, c]) => (
                        <div key={label} className="flex-1 p-4 rounded-xl border shadow-sm" style={{ borderColor: "var(--border)", ...T.s2 }}>
                          <div className="text-xl font-black mb-1" style={{ color: `var(--${c})` }}>{n}</div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider" style={T.t3}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ══ DAILY CHALLENGE ══════════════════════════════════════════════ */}
        <section id="daily-challenge" className="py-20 lg:py-28" aria-labelledby="challenge-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

              {/* Challenge card */}
              <Card className="overflow-hidden relative shadow-xl">
                <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, var(--indigo-bright), var(--cyan-bright))" }} aria-hidden="true" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "var(--border)", ...T.s2 }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={T.indigoBg}><FlameIcon /></div>
                    <div>
                      <p className="text-sm font-bold" style={T.t1}>Daily Challenge</p>
                      <p className="text-[11px] font-medium" style={T.t3}>Day 24 · Resets in 6h 18m</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border border-amber-500/20" style={T.amberBg}>
                    <ZapIcon /> +50 XP
                  </div>
                </div>

                <div className="p-6" style={T.surface}>
                  <h3 className="text-xl font-extrabold mb-3" style={T.t1}>Longest Substring Without Repeating Characters</h3>
                  <div className="flex flex-wrap gap-2.5 mb-5">
                    <Badge color="amber">Medium</Badge>
                    <Badge color="cyan">Sliding Window</Badge>
                  </div>
                  <p className="text-sm leading-relaxed mb-6 font-medium" style={T.t2}>
                    Given a string s, find the length of the longest substring without repeating characters.
                  </p>

                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { label: "Est. Time", value: "25 min", icon: <ClockIcon /> },
                      { label: "Your Streak", value: "🔥 12 days", icon: null },
                      { label: "Progress", value: "Not Started", icon: null },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 rounded-xl border shadow-sm" style={{...T.s2, borderColor: "var(--border)"}}>
                        <p className="text-[11px] mb-1 font-semibold uppercase tracking-wider" style={T.t3}>{label}</p>
                        <p className="text-sm font-bold" style={label === "Your Streak" ? { color: "var(--amber)" } : T.t1}>{value}</p>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => onNavigateToLogin('login')} className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-lg"
                    style={{ background: "linear-gradient(135deg, var(--indigo-bright), var(--cyan-bright))" }}>
                    Start Challenge →
                  </button>
                </div>

                {/* Previous challenge */}
                <div className="px-6 pb-5 pt-0" style={T.surface}>
                  <div className="rounded-xl p-4 border shadow-sm" style={{ borderColor: "var(--border)", ...T.s2 }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold mb-0.5" style={T.t1}>Yesterday: Valid Anagram</p>
                        <p className="text-[11px] font-medium" style={T.t3}>Easy · Hash Map · Solved in 18 min</p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm text-white">
                        <CheckIcon size={12} />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <div>
                <Badge color="indigo"><FlameIcon /> Daily Challenge</Badge>
                <h2 id="challenge-heading" className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4 mb-4" style={T.t1}>
                  One Problem.<br />Every Day.<br />Build the Habit.
                </h2>
                <p className="text-lg leading-relaxed mb-8" style={T.t2}>
                  The most effective DSA preparation isn&apos;t grinding 500 problems over a weekend — it&apos;s showing up consistently. The Daily Challenge makes that automatic.
                </p>
                <div className="space-y-6">
                  {[
                    { icon: <FlameIcon />, title: "Streak System", desc: "Miss a day, your streak resets. Simple, honest accountability that keeps you showing up." },
                    { icon: <ZapIcon />, title: "XP & Points", desc: "Earn experience points per solve. Hard problems reward more. Your score reflects real effort." },
                    { icon: <TrendingUp />, title: "Leaderboard", desc: "Compare consistency with other learners — not speed, not tricks, just showing up." },
                  ].map(f => (
                    <div key={f.title} className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={T.indigoBg}>{f.icon}</div>
                      <div>
                        <p className="text-base font-bold mb-1.5" style={T.t1}>{f.title}</p>
                        <p className="text-sm leading-relaxed" style={T.t2}>{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ FINAL CTA ════════════════════════════════════════════════════ */}
        <section className="py-24 lg:py-32 border-t relative overflow-hidden" style={{ borderColor: "var(--border)" }} aria-labelledby="cta-heading">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-3xl" style={{ background: "var(--cyan-bright)", opacity: isDark ? 0.07 : 0.04 }} />
            <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-72 rounded-full blur-3xl" style={{ background: "var(--indigo-bright)", opacity: isDark ? 0.06 : 0.04 }} />
          </div>
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 id="cta-heading" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6" style={T.t1}>
              Stop Memorizing Solutions.<br />
              <span style={{ background: "linear-gradient(135deg, var(--cyan-bright), var(--indigo-bright))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Start Recognizing Patterns.
              </span>
            </h2>
            <p className="text-lg mb-10 max-w-xl mx-auto leading-relaxed font-medium" style={T.t2}>
              Build the problem-solving instincts that make DSA easier to understand, practice, and apply.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => onNavigateToLogin('login')} className="flex items-center justify-center gap-2 px-10 py-4 rounded-xl text-sm font-bold text-white transition-all shadow-lg hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, var(--cyan-bright), var(--indigo-bright))" }}>
                Start Practicing <ArrowRight />
              </button>
              <button onClick={() => document.getElementById('curriculum').scrollIntoView({behavior:'smooth'})} className="flex items-center justify-center gap-2 px-10 py-4 rounded-xl text-sm font-bold border transition-all hover:bg-theme-surface2 active:scale-[0.98]"
                style={{ ...T.border, ...T.t1, background: "transparent" }}>
                Explore Curriculum
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════ */}
      <footer className="border-t py-12" style={{ borderColor: "var(--border)", ...T.surface }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, var(--cyan-bright), var(--indigo-bright))" }}>
                  <AxlyLogo />
                </div>
                <span className="font-bold text-base tracking-tight font-mono" style={T.t1}>Axly DSA Tracker</span>
              </div>
              <p className="text-sm font-medium" style={T.t3}>Pattern-first DSA practice for serious learners.</p>
            </div>
            <nav className="flex flex-wrap gap-x-8 gap-y-4" aria-label="Footer navigation">
              {["Features", "How It Works", "Curriculum", "Practice", "Challenges", "Sign In"].map(l => (
                <a key={l} href="#" className="text-sm font-semibold transition-colors hover:text-cyan-500" style={{ ...T.t2, textDecoration: "none" }}>{l}</a>
              ))}
            </nav>
          </div>
          <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm font-medium" style={T.t3}>© 2026 Axly. All rights reserved.</p>
            <button onClick={toggle}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:bg-theme-surface2 active:scale-95"
              style={{ ...T.border, ...T.t2 }}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <><SunIcon /> Light mode</> : <><MoonIcon /> Dark mode</>}
            </button>
          </div>
        </div>
      </footer>

    </div>
  )
}
