import Link from "next/link"
import Image from "next/image"
import { BackgroundBeams } from "@/components/magicui/background-beams"
import { Spotlight } from "@/components/magicui/spotlight"
import { AuthDebug } from "@/components/auth-debug"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-foreground/90 selection:text-background">
      {/* NAV */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="pointer-events-auto flex items-center">
            <Image src="/DialZero.svg" alt="DialZero" width={54} height={54} priority className="drop-shadow-sm" />
          </div>
          <nav className="pointer-events-auto hidden items-center gap-10 md:flex">
            {[
              { href: '#about', label: 'How It Works' },
              { href: '#services', label: 'Use Cases' },
              { href: '#testimonials', label: 'Success' },
              { href: '#contact', label: 'Contact' },
            ].map(item => (
              <a key={item.href} href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </a>
            ))}
            <Link href="/dashboard" className="glow-ring rounded-md bg-foreground px-5 py-2 text-sm font-medium text-background shadow-sm transition hover:opacity-90">Launch App</Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative flex flex-col justify-end overflow-hidden pb-24 pt-36 sm:pt-40">
        <div className="hero-mesh" />
        <div className="hero-orb" />
        <BackgroundBeams count={6} />
        <Spotlight />
        <div className="noise-overlay" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_560px] lg:items-center">
            <div className="max-w-xl lg:max-w-2xl">
              <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
                <span className="text-gradient">Automated advocacy</span><br />for complex customer problems
              </h1>
              <p className="mt-6 text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
                A resolution engine that researches, strategizes, escalates and pursues multi‑channel follow‑ups—turning ambiguous service failures into fast, documented outcomes.
              </p>
              <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row">
                <Link href="/dashboard" className="glow-ring inline-flex items-center justify-center rounded-lg bg-foreground px-7 py-3 text-sm font-medium text-background shadow transition hover:opacity-90">Request Access</Link>
                <a href="#about" className="inline-flex items-center justify-center rounded-lg border border-border/70 bg-background/70 px-7 py-3 text-sm font-medium text-foreground/80 backdrop-blur transition hover:bg-secondary/60">How it works →</a>
              </div>
              <div className="mt-14 grid max-w-lg gap-4 sm:grid-cols-3">
                {[
                  { k: '95%', v: 'Resolution efficiency' },
                  { k: '2.3h', v: 'Avg time saved / issue' },
                  { k: '24/7', v: 'Autonomous follow‑up' },
                ].map(s => (
                  <div key={s.v} className="card-frost relative rounded-xl border border-border/60 p-4 text-left shadow-sm">
                    <div className="text-2xl font-semibold tracking-tight">{s.k}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Video Placeholder */}
            <div className="relative hidden h-[480px] w-full items-center justify-center lg:flex">
              <div className="video-shell glow-ring relative aspect-video w-full max-w-[560px] overflow-hidden rounded-2xl">
                <div className="absolute inset-0 shimmer opacity-40" />
                <div className="relative flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
                  <div className="text-sm font-medium tracking-wide text-muted-foreground">Demo video incoming</div>
                  <div className="text-xs text-muted-foreground/70">Drop a .mp4 / .webm later – container + adaptive glass shell already styled.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
  <section id="services" className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">Use Cases</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">We Handle the Calls You Hate</h2>
            <p className="mt-3 text-muted-foreground">From billing disputes to warranty claims, DialZero tackles the customer service nightmares that waste your time.</p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: 'Billing Disputes', desc: 'Pattern detection + policy aware escalation to reclaim overcharges.' },
              { title: 'Subscription Cancellations', desc: 'Negotiate retention wall scripts and remove dark‑pattern friction.' },
              { title: 'Warranty Claims', desc: 'Documentation synthesis + manufacturer escalation surface.' },
              { title: 'Insurance Negotiations', desc: 'Interpret coverage terms and pursue qualifying pathways.' },
              { title: 'Refund Recovery', desc: 'Multi‑channel vendor follow‑through with SLA pressure.' },
              { title: 'Account Restoration', desc: 'Identity + history reconstruction for locked or lost access.' },
            ].map((c, i) => (
              <div key={i} className="group relative rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-medium tracking-tight">{c.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{c.desc}</p>
                  </div>
                  <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-[11px] text-muted-foreground transition group-hover:bg-secondary group-hover:text-foreground">→</span>
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-1 ring-inset ring-border/0 transition group-hover:opacity-100 group-hover:ring-border/60" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
  <section className="">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid items-center gap-6 rounded-2xl border border-border bg-card p-6 sm:p-10 md:grid-cols-2">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight">Ready to Never Wait on Hold Again?</h3>
              <p className="mt-3 text-muted-foreground">Join thousands who've escaped customer service hell. Let our AI handle the frustration while you get on with your life.</p>
              <Link href="/dashboard" className="mt-5 inline-flex rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">Get Your AI Agent Now</Link>
            </div>
            <dl className="grid grid-cols-3 gap-4">
              {[
                { k: "95%", v: "Success Rate" },
                { k: "2.3hrs", v: "Avg Time Saved" },
                { k: "24/7", v: "AI Availability" },
              ].map((s) => (
                <div key={s.v} className="rounded-lg border border-border/60 bg-background/60 p-4 text-center">
                  <dt className="text-2xl font-semibold">{s.k}</dt>
                  <dd className="mt-1 text-xs text-muted-foreground">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Process (details/summary for native disclosure, no JS) */}
  <section id="about" className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">How It Works</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Your AI Agent in Action</h2>
            <p className="mt-3 text-muted-foreground">Simple as texting a friend. Our AI does the heavy lifting while you stay informed.</p>
          </div>
          <div className="mx-auto mt-10 max-w-3xl space-y-3">
            {[
              { n: "01", t: "Intake", c: "Structured natural language capture builds a resolved view of entities, timelines, commitments, and failure points." },
              { n: "02", t: "AI Research & Strategy", c: "We gather facts, policies, and best paths to resolution for your exact case." },
              { n: "03", t: "Automated Contact", c: "Your agent calls, emails, or chats with the right team using the right phrasing." },
              { n: "04", t: "Real-Time Updates", c: "Stay in the loop with concise updates—no need to babysit." },
              { n: "05", t: "Problem Resolved", c: "We confirm the fix and provide documentation if needed." },
            ].map((s, i) => (
              <details key={i} className="group rounded-xl border border-border bg-card p-4 open:bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border font-medium">{s.n}</span>
                    <span className="font-medium">{s.t}</span>
                  </div>
                  <span className="text-xl text-muted-foreground group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="mt-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">{s.c}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials (simple CSS snapping, no JS) */}
  <section id="testimonials">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">Success Stories</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Real People, Real Results</h2>
            <p className="mt-3 text-muted-foreground">See how DialZero has saved time, money, and sanity for people just like you.</p>
          </div>

          <div className="mt-10 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex snap-x snap-mandatory gap-6">
              {[
                {
                  quote: "Billing dispute resolved in 36 hours after four prior manual attempts failed. The escalation packet the agent built was better than what our team could assemble internally.",
                  author: "Sarah Chen",
                  role: "Operations Lead",
                },
                {
                  quote: "We recovered months of SaaS overcharges automatically. The system tracked commitments and re‑opened the case when credits didn’t post on time.",
                  author: "Marcus Rodriguez",
                  role: "Finance Analyst",
                },
                {
                  quote: "Account reinstated with a reconstructed audit trail. Their multi‑channel persistence outperformed our previous vendor’s manual follow‑ups.",
                  author: "Jennifer Walsh",
                  role: "Product Manager",
                },
              ].map((t, i) => (
                <figure key={i} className="snap-center shrink-0 basis-full rounded-xl border border-border bg-card p-6 shadow-sm sm:basis-[48%] lg:basis-[32%]">
                  <blockquote className="text-sm leading-6 text-foreground">“{t.quote}”</blockquote>
                  <figcaption className="mt-4 text-xs text-muted-foreground">
                    <div className="font-medium text-foreground">{t.author}</div>
                    <div>{t.role}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
  <section id="contact" className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid gap-8 rounded-2xl border border-border bg-card p-6 sm:p-10 md:grid-cols-2">
            <div>
              <p className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">Get Started</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">Request Access</h2>
              <form className="mt-6 space-y-4">
                <fieldset className="rounded-lg border border-border p-2">
                  <legend className="px-1 text-xs text-muted-foreground">Intent</legend>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-foreground">
                      <input type="radio" name="intent" defaultChecked className="sr-only" />
                      <span>Try DialZero</span>
                    </label>
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-foreground">
                      <input type="radio" name="intent" className="sr-only" />
                      <span>Learn More</span>
                    </label>
                  </div>
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-muted-foreground">Name</span>
                    <input className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring/50" placeholder="Your name" />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-muted-foreground">Email*</span>
                    <input type="email" required className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring/50" placeholder="your.email@example.com" />
                  </label>
                  <label className="col-span-full text-sm">
                    <span className="mb-1 block text-xs text-muted-foreground">What's your biggest customer service frustration?*</span>
                    <textarea required rows={4} className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring/50" placeholder="Tell us about a recent experience where customer service let you down..." />
                  </label>
                </div>
                <button className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">Submit</button>
              </form>
            </div>
            <div className="">
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-background p-4 text-sm">
                  <div className="font-medium text-foreground">Intake</div>
                  <p className="mt-1 text-muted-foreground">Outage across multiple circuits with missed restoration commitments; prior ticket references attached.</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4 text-sm">
                  <div className="font-medium text-foreground">Strategy</div>
                  <p className="mt-1 text-muted-foreground">Compiled provider SLA excerpts, historical latency data, and escalation path to tier‑2 network engineering.</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4 text-sm">
                  <div className="font-medium text-foreground">Outcome</div>
                  <p className="mt-1 text-muted-foreground">Service restored • Billing credit queued • Automated verification follow‑up scheduled in 48h.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
  <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Image src="/DialZero.svg" alt="DialZero" width={28} height={28} />
                <span className="font-semibold tracking-tight">DialZero</span>
              </div>
              <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <a href="#about" className="hover:text-foreground">How It Works</a>
                <a href="#services" className="hover:text-foreground">Use Cases</a>
                <a href="#testimonials" className="hover:text-foreground">Success Stories</a>
                <a href="#contact" className="hover:text-foreground">Contact</a>
              </nav>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">Contact us:</div>
                <div className="mt-2 text-sm">
                  <p>Email: hello@dialzero.ai</p>
                  <p>Phone: 1-800-DIAL-ZERO</p>
                  <p>123 Innovation Drive, San Francisco, CA 94105</p>
                </div>
              </div>
              <form className="flex items-center gap-2">
                <input type="email" placeholder="Your email" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50" />
                <button className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">Get Updates</button>
              </form>
            </div>
          </div>
          <div className="mt-8 border-t border-border/60 pt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} DialZero. All Rights Reserved.
          </div>
        </div>
      </footer>
      <AuthDebug/>
    </main>
  )
}
