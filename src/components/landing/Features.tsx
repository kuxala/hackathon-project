import Image from "next/image"

export default function Features() {
  const features = [
    {
      title: "Upload XLSX, Get Categorized Insights",
      description: (
        <>
          Drag in your bank or expense spreadsheets and our AI <span className="text-green-400 font-semibold">ingests every row automatically</span>. It parses the XLSX, classifies transactions, and <span className="text-green-400 font-semibold">persists structured records</span> so you can explore clean, categorized data without manual sorting.
        </>
      ),
      align: "left" as const,
      image: "/section-1.png",
      imageAlt: "AI dashboard displaying instant financial analysis"
    },
    {
      title: "Visual Dashboards You Can Trust",
      description: (
        <>
          Instantly explore the categorized data in a <span className="text-green-400 font-semibold">beautiful analytics workspace</span>. Interactive charts highlight spending trends, category breakdowns, and cash flow so you can <span className="text-green-400 font-semibold">see the story behind every upload</span>.
        </>
      ),
      align: "right" as const,
      image: "/section-2.png",
      imageAlt: "Financial dashboard with charts summarizing categorized data"
    },
    {
      title: "AI-Powered Forecasting",
      description: (
        <>
          Move from hindsight to foresight as the AI <span className="text-green-400 font-semibold">studies last month&apos;s patterns</span> and projects your upcoming income and expenses. See predicted cash flow, anticipate shortfalls, and <span className="text-green-400 font-semibold">plan with confidence before the month begins</span>.
        </>
      ),
      align: "left" as const,
      image: "/section-3.png",
      imageAlt: "AI prediction dashboard projecting next month finances"
    },
    {
      title: "Insightful Perspectives",
      description: (
        <>
          Unlock new angles on your finances as the AI delivers <span className="text-green-400 font-semibold">unique narratives for your income and spending</span>. Discover hidden drivers, spotlight unusual activity, and <span className="text-green-400 font-semibold">understand the &ldquo;why&rdquo; behind every trend</span> with story-driven insights.
        </>
      ),
      align: "right" as const,
      image: "/section-4.png",
      imageAlt: "AI insights page describing income and spending trends"
    }
  ]

  return (
    <section id="features" className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Your personal AI finance expert
          </h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Powerful AI that <span className="text-green-400 font-semibold">understands your finances</span> and helps you make <span className="text-green-400 font-semibold">smarter money decisions</span>
          </p>
        </div>

        <div className="space-y-32">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`flex flex-col ${
                feature.align === "left" ? "md:flex-row" : "md:flex-row-reverse"
              } gap-12 items-center`}
            >
              <div className="flex-1">
                <div className="group relative h-auto w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-foreground/5 to-foreground/10">
                  <Image
                    src={feature.image}
                    alt={feature.imageAlt}
                    width={960}
                    height={640}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority={index === 0}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <h3 className="text-3xl md:text-4xl font-bold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-lg text-foreground/60 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
