export default function Features() {
  const features = [
    {
      title: "Instant AI Analysis",
      description: (
        <>
          Simply upload your financial documents and get <span className="text-green-400 font-semibold">immediate insights</span>. Our AI assistant analyzes your data <span className="text-green-400 font-semibold">in seconds</span>, identifying spending patterns, trends, and opportunities you might have missed.
        </>
      ),
      align: "left" as const,
      imagePlaceholder: "AI Chat Interface"
    },
    {
      title: "Natural Conversation",
      description: (
        <>
          Ask questions about your finances in <span className="text-green-400 font-semibold">plain English</span>. 'Where did I spend the most last month?' 'How can I save more?' Your AI assistant understands and responds with <span className="text-green-400 font-semibold">clear, actionable answers</span>.
        </>
      ),
      align: "right" as const,
      imagePlaceholder: "Chat Conversation"
    },
    {
      title: "Smart Recommendations",
      description: (
        <>
          Receive <span className="text-green-400 font-semibold">personalized advice</span> based on your actual financial data. From budget optimization to saving strategies, your AI assistant provides recommendations <span className="text-green-400 font-semibold">tailored specifically to your situation</span>.
        </>
      ),
      align: "left" as const,
      imagePlaceholder: "AI Insights"
    },
    {
      title: "Secure & Private",
      description: (
        <>
          Your financial data <span className="text-green-400 font-semibold">never leaves your control</span>. Bank-level encryption, secure authentication, and <span className="text-green-400 font-semibold">complete privacy</span> ensure your sensitive information stays confidential and protected.
        </>
      ),
      align: "right" as const,
      imagePlaceholder: "Security Features"
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
                <div className="w-full h-80 bg-gradient-to-br from-foreground/5 to-foreground/10 rounded-2xl border border-border flex items-center justify-center overflow-hidden relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="text-center z-10">
                    <div className="text-foreground/30 text-sm font-medium mb-2">
                      [Image Placeholder]
                    </div>
                    <div className="text-foreground/40 text-lg font-semibold">
                      {feature.imagePlaceholder}
                    </div>
                  </div>
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
