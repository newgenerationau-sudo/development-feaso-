"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Project } from "@/lib/projects";

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this project?")) return;
    setDeleting(id);
    await fetch(`/api/admin/projects?id=${id}`, { method: "DELETE" });
    await load();
    setDeleting(null);
  }

  const filtered = projects.filter(p =>
    `${p.address} ${p.suburb} ${p.state}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Listings</h1>
          <p className="text-sm text-gray-500 mt-1">{projects.length} total projects</p>
        </div>
        <Link href="/admin/upload"
          className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ backgroundColor: "#007a6e" }}>
          + Add Project
        </Link>
      </div>

      <input
        type="text"
        placeholder="Search by address or suburb..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full mb-4 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Address</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Report</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.address}</p>
                    <p className="text-xs text-gray-400">{p.suburb}, {p.state} {p.postcode}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.type}</td>
                  <td className="px-4 py-3 text-gray-600">${p.price}</td>
                  <td className="px-4 py-3">
                    {p.isReal
                      ? <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">Ready</span>
                      : <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">Draft</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deleting === p.id}
                      className="text-red-400 hover:text-red-600 text-xs disabled:opacity-50">
                      {deleting === p.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">No projects found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
