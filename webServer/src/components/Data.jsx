import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function ArtifactsTablePage({ onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // fetch("http://127.0.0.1:8000/api/artifacts/table")
    fetch("http://dyciblueoceantx26.onrender.com/api/artifacts/table") // RENDER
      .then(res => res.json())
      .then(data => {
        setRows(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  // ✅ PDF Export Function
  const exportPDF = () => {
    const doc = new jsPDF("landscape"); // better for many columns

    doc.text("T.U.K.L.A.S. Database - Registered Artifacts", 14, 15);

    autoTable(doc, {
      startY: 20,
      head: [[
        "ID",
        "Title",
        "Period",
        "Date Range",
        "Category",
        "Museum",
        "Location"
      ]],
      body: rows.map(r => [
        r.id,
        r.title,
        r.period,
        r.date_range,
        r.category,
        r.museum,
        r.location
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] } // dark theme header
    });

    doc.save("TUKLAS_Artifacts.pdf");
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-slate-200">

      {/* BACK */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-20 text-cyan-300 border border-cyan-300 px-3 py-1 rounded hover:bg-cyan-300 hover:text-black"
      >
        ← Back
      </button>

      {/* HEADER */}
      <div className="absolute top-4 right-6 z-20 text-right">
        <h1 className="text-lg text-cyan-300 tracking-wide">
          T.U.K.L.A.S. Database
        </h1>
        <p className="text-xs text-slate-400">
          Archaeological Records
        </p>
      </div>

      {/* CONTENT */}
      <div className="pt-20 px-6 pb-10">
        <div className="w-full max-w-7xl mx-auto bg-slate-900/90 border border-cyan-500/30 rounded-lg backdrop-blur">

          {/* PANEL HEADER WITH BUTTON */}
          <div className="px-6 py-4 border-b border-cyan-500/20 flex justify-between items-center">
            <span className="text-cyan-400 text-sm tracking-wider">
              REGISTERED ARTIFACTS
            </span>

            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400">
                {rows.length} entries
              </span>

              {/* ✅ EXPORT BUTTON */}
              <button
                onClick={exportPDF}
                className="text-xs text-cyan-300 border border-cyan-300 px-3 py-1 rounded hover:bg-cyan-300 hover:text-black"
              >
                Export PDF
              </button>
            </div>
          </div>

          {/* TABLE */}
          {loading ? (
            <div className="p-6 text-slate-400">Loading…</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-800 text-cyan-300">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Title</th>
                  <th className="p-3 text-left">Period</th>
                  <th className="p-3 text-left">Date Range</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Museum</th>
                  <th className="p-3 text-left">Location</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-800 hover:bg-slate-800/70"
                  >
                    <td className="p-3 font-mono">{r.id}</td>
                    <td className="p-3">{r.title}</td>
                    <td className="p-3">{r.period}</td>
                    <td className="p-3">{r.date_range}</td>
                    <td className="p-3">{r.category}</td>
                    <td className="p-3">{r.museum}</td>
                    <td className="p-3 text-xs text-slate-400">
                      {r.location}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </div>
      </div>

    </div>
  );
}