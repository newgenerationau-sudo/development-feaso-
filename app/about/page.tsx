export default function AboutPage() {
  const team = [
    { role: "Licensed Real Estate Agent", icon: "🏠", desc: "Market expertise across metropolitan and growth corridors — helping you buy smarter and sell at the right time." },
    { role: "Registered Architect", icon: "📐", desc: "Unlocking every block's development potential with zoning analysis, concept design and council know-how." },
    { role: "Finance Broker & Banker", icon: "💰", desc: "Access to 30+ lenders. We structure loans that save you thousands over the life of your mortgage." },
    { role: "Property Lawyer", icon: "⚖️", desc: "Contracts, due diligence, conveyancing — protecting your interests at every step of the transaction." },
    { role: "Licensed Builder", icon: "🏗️", desc: "Trusted construction partners who deliver on budget and on time, from renovation to full development." },
    { role: "Town Planner", icon: "🗺️", desc: "Navigating planning permits, overlays and council requirements so your development vision becomes reality." },
    { role: "Building Surveyor", icon: "📋", desc: "Ensuring every project meets building regulations and safety standards — from permit to occupancy certificate." },
  ];

  const stats = [
    { value: "15+", label: "Years in property" },
    { value: "100+", label: "Properties transacted" },
    { value: "100 yrs", label: "Combined experience" },
    { value: "7", label: "Disciplines under one roof" },
  ];

  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-emerald-800 to-emerald-950 py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative max-w-3xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 bg-emerald-700 text-emerald-200 text-xs font-bold rounded-full mb-6 tracking-widest uppercase">Our Story</span>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
            Make Your Block<br />Work Hard for You.
          </h1>
          <p className="text-emerald-200 text-lg max-w-2xl mx-auto leading-relaxed">
            Now we put that knowledge to work for you — so you can buy better, build smarter, and invest with confidence.
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="bg-emerald-700 py-8 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <p className="text-3xl font-black text-white">{s.value}</p>
              <p className="text-emerald-300 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Story */}
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <h2 className="text-3xl font-black text-gray-900 mb-2">Who We Are</h2>
          <p className="text-gray-500 text-sm uppercase tracking-widest font-semibold mb-8">Development Feaso — Built by Property People, for Property People</p>

          <p>
            Development Feaso was founded on a simple frustration: too many buyers walk into one of the biggest financial decisions of their lives without the full picture. They overpay for a block with no development upside, miss a rezoning opportunity that could double their return, or end up with a loan that costs them tens of thousands more than it should.
          </p>

          <p>
            We know, because we&apos;ve spent over 15 years in the trenches. Our team has collectively transacted more than 100 properties — houses, townhouse sites, multi-unit developments, commercial conversions, and everything in between. That&apos;s not theory. That&apos;s hard-won, deal-by-deal experience across Melbourne&apos;s growth corridors, inner suburbs, and regional pockets.
          </p>

          <p>
            What makes us different is that we didn&apos;t build a team of generalists. We assembled a circle of licensed specialists — each operating at the top of their field — and brought them together under one roof:
          </p>

          <blockquote className="border-l-4 border-emerald-500 pl-6 py-2 my-8 bg-emerald-50 rounded-r-xl">
            <p className="text-emerald-900 font-semibold text-lg italic leading-relaxed">
              &ldquo;A great property decision is never just about the block. It&apos;s about the zoning, the loan structure, the legal protection, the builder you trust, and the agent who knows the market. We built a team that covers all of it.&rdquo;
            </p>
          </blockquote>

          <p>
            Together, our team brings over <strong>100 years of combined professional experience</strong> across real estate, architecture, finance, law, and construction. That depth of knowledge is what powers every report we produce — and every conversation we have with our clients.
          </p>

          <p>
            Whether you&apos;re a first-home buyer trying to understand if a block is worth the asking price, an investor weighing up development yield against land cost, or a homeowner wondering what you could build — we are here to give you clarity, not jargon.
          </p>
        </div>

        {/* Mission statement */}
        <div className="mt-14 bg-gray-50 rounded-2xl p-8 border border-gray-200">
          <h3 className="text-xl font-extrabold text-gray-900 mb-4">What We&apos;re Here to Do</h3>
          <ul className="space-y-4">
            {[
              { icon: "🔍", text: "Help you discover the true potential of any block before you commit." },
              { icon: "🏆", text: "Help you buy better — with data, professional insight and the right advice at the right time." },
              { icon: "💸", text: "Help you secure a cheaper loan through smart structuring and access to a wide lending panel." },
              { icon: "⚖️", text: "Protect you legally — with proper due diligence, contract review and conveyancing support." },
              { icon: "🏗️", text: "Connect you with reliable builders who deliver what they promise." },
            ].map(item => (
              <li key={item.text} className="flex items-start gap-4">
                <span className="text-2xl mt-0.5">{item.icon}</span>
                <p className="text-gray-700 text-sm leading-relaxed">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Team grid */}
      <div className="bg-gray-50 border-t border-gray-200 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3">The Team Behind Every Report</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Seven disciplines. One team. Every angle of your property decision covered.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {team.map(member => (
              <div key={member.role} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-4">{member.icon}</div>
                <h3 className="font-extrabold text-gray-900 text-base mb-2">{member.role}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{member.desc}</p>
              </div>
            ))}
            {/* Final card — CTA */}
            <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="text-3xl mb-4">🤝</div>
                <h3 className="font-extrabold text-white text-base mb-2">All Working Together for You</h3>
                <p className="text-emerald-200 text-sm leading-relaxed">One free consultation. The whole team in your corner.</p>
              </div>
              <a href="/order"
                className="mt-6 inline-block text-center bg-white text-emerald-700 font-bold text-sm px-5 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                Book a Free Consultation →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Closing statement */}
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-2xl font-extrabold text-gray-900 mb-4 leading-snug">
          Property is the biggest investment most people will ever make.<br />
          <span style={{ color: "#007a6e" }}>We think you deserve expert help — not guesswork.</span>
        </p>
        <p className="text-gray-500 max-w-xl mx-auto mb-8">
          That&apos;s why we built Development Feaso. Start with a free property report — no sign-up, no obligation — and see exactly what your block is worth.
        </p>
        <a href="/"
          className="inline-block px-8 py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#007a6e" }}>
          Check Any Block for Free →
        </a>
      </div>

    </div>
  );
}
