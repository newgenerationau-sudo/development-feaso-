"use client";

import { useEffect, useState } from "react";

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address: string;
  notes?: string;
  status: "new" | "in_progress" | "completed";
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-emerald-100 text-emerald-700",
};

export default function AdminCRMPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/inquiries");
    if (res.ok) {
      const data = await res.json();
      setInquiries(data);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await fetch(`/api/admin/inquiries?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    setUpdating(null);
  }

  const filtered = filter === "all" ? inquiries : inquiries.filter(i => i.status === filter);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">CRM</h1>
          <p className="text-sm text-gray-500 mt-1">{inquiries.length} total inquiries</p>
        </div>
        <div className="flex gap-2">
          {["all", "new", "in_progress", "completed"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === s ? "bg-emerald-700 text-white" : "bg-white border border-gray-200 text-gray-600"
              }`}>
              {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400">No inquiries yet.</p>
          <p className="text-xs text-gray-300 mt-1">Customer quote requests will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inq => (
            <div key={inq.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: "#007a6e" }}>
                      {(inq.name ?? "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{inq.name}</p>
                      <p className="text-xs text-gray-400">{new Date(inq.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[inq.status]}`}>
                      {inq.status === "in_progress" ? "In Progress" : inq.status.charAt(0).toUpperCase() + inq.status.slice(1)}
                    </span>
                  </div>

                  <div className="ml-11 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div>
                      <span className="text-gray-400 text-xs">Email</span>
                      <p className="text-gray-700">{inq.email}</p>
                    </div>
                    {inq.phone && (
                      <div>
                        <span className="text-gray-400 text-xs">Phone</span>
                        <p className="text-gray-700">{inq.phone}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-gray-400 text-xs">Property</span>
                      <p className="text-gray-700">{inq.address}</p>
                    </div>
                    {inq.notes && (
                      <div className="col-span-2">
                        <span className="text-gray-400 text-xs">Notes</span>
                        <p className="text-gray-600 text-sm">{inq.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1 flex-shrink-0">
                  {["new", "in_progress", "completed"].map(s => (
                    <button key={s} onClick={() => updateStatus(inq.id, s)}
                      disabled={inq.status === s || updating === inq.id}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-40 ${
                        inq.status === s
                          ? `${STATUS_STYLES[s]} cursor-default`
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}>
                      {s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                  <a href={`mailto:${inq.email}`}
                    className="px-3 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-center mt-1">
                    Email
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
