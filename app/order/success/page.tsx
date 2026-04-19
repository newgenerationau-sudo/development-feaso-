"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const file = params.get("file");

  const downloadUrl = sessionId && file
    ? `/api/download?session_id=${sessionId}&file=${encodeURIComponent(file)}`
    : null;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-lg">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: "#e6f4f2" }}>
          <svg className="w-10 h-10 text-[#007a6e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Payment Successful!</h1>

        {downloadUrl ? (
          <>
            <p className="text-gray-500 text-lg mb-8">
              Your feasibility report is ready. You can download it now, and a copy has also been emailed to you.
            </p>

            {/* Email confirmation notice */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-6 py-4 mb-6 text-left flex gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-blue-700 text-sm">
                A download link has been sent to your email address. Check your inbox (and spam folder) if you don&apos;t see it.
              </p>
            </div>

            {/* Download button */}
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-white font-bold text-lg mb-4 transition-colors"
              style={{ backgroundColor: "#007a6e" }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Your Report (PDF)
            </a>
          </>
        ) : (
          <>
            <p className="text-gray-500 text-lg mb-8">
              Thank you for your order! Our team will prepare your custom feasibility report and email it to you within <strong>2–5 business days</strong>.
            </p>

            {/* Email confirmation notice */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-6 py-4 mb-6 text-left flex gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-blue-700 text-sm">
                A confirmation email has been sent. Your report will be delivered to the same address when ready.
              </p>
            </div>

            {/* What's next */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 mb-8 text-left">
              <h3 className="font-bold text-gray-900 mb-3">What happens next?</h3>
              <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
                <li>Our designers review your property address</li>
                <li>We assess zoning, overlays, and development potential</li>
                <li>Report is compiled, quality-checked, and emailed to you</li>
                <li>Delivered within 2–5 business days</li>
              </ol>
            </div>
          </>
        )}

        <Link href="/projects"
          className="inline-block px-6 py-3 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">
          Browse More Projects
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
