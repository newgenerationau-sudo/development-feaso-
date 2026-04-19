import Link from "next/link";

const steps = [
  {
    num: "01",
    title: "Submit Your Property Address",
    desc: "Use our address search to find any property in Australia. Enter your contact details and any specific questions or goals you have for the site.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Secure $50 Payment",
    desc: "Pay securely via Stripe. Your card details are never stored by us. The $50 fee covers a full feasibility assessment by our qualified team.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Expert Analysis",
    desc: "Our qualified designers and town planners assess zoning, overlays, setbacks, easements, and site constraints to determine what can be built.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    num: "04",
    title: "Receive Your Report",
    desc: "Within 2–5 business days, receive a comprehensive PDF report with development options, risks, council requirements, and our professional recommendations.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const faqs = [
  {
    q: "What is included in the feasibility report?",
    a: "The report covers zoning analysis, overlay identification, development potential (e.g. subdivision, dual occupancy, multi-unit), site constraints, relevant council planning scheme provisions, and our expert recommendations.",
  },
  {
    q: "How long does it take?",
    a: "Most reports are delivered within 2–5 business days from the time of payment.",
  },
  {
    q: "Is the $50 fee per property?",
    a: "Yes, the $50 fee applies to each individual property address submitted.",
  },
  {
    q: "What states do you cover?",
    a: "We cover all states and territories across Australia — VIC, NSW, QLD, SA, WA, TAS, NT, and ACT.",
  },
  {
    q: "Can I use the report for a DA or planning permit application?",
    a: "The feasibility report is a preliminary assessment and is not a formal planning application. It is designed to help you understand development potential before committing to a full planning engagement.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-16 px-4 text-center" style={{ backgroundColor: "#f7f7f7" }}>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">How It Works</h1>
          <p className="text-gray-500 text-xl">
            From address to report in four simple steps.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {steps.map((step, i) => (
            <div key={step.num} className="flex gap-6 items-start">
              <div
                className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: "#007a6e" }}
              >
                {step.icon}
              </div>
              <div className="flex-1 pb-8 border-b border-gray-100 last:border-0">
                <span className="text-xs font-bold text-[#007a6e] uppercase tracking-widest">Step {i + 1}</span>
                <h3 className="text-xl font-bold text-gray-900 mt-1 mb-2">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4" style={{ backgroundColor: "#f7f7f7" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to get started?</h2>
        <p className="text-gray-500 mb-8 text-lg">Order your feasibility report today for just $50.</p>
        <Link
          href="/order"
          className="inline-block px-10 py-4 rounded-lg text-white font-bold text-lg"
          style={{ backgroundColor: "#007a6e" }}
        >
          Order Now — $50
        </Link>
      </section>
    </>
  );
}
