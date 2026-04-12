import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function DetectionTable() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/detections`)
      .then(res => res.json())
      .then(detections => {
        if (!Array.isArray(detections)) return;

        const sorted = [...detections].sort(
          (a, b) =>
            new Date(b.detected_at || 0) -
            new Date(a.detected_at || 0)
        );

        setData(sorted.slice(0, 5));
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  if (!data.length)
    return (
      <div className="text-cyan-300">
        No detections available.
      </div>
    );

  return (
    <div className="bg-black/80 border border-cyan-400 p-4 text-cyan-200 rounded shadow-lg">
      <h2 className="text-lg font-bold mb-3 text-cyan-300">Latest Detections</h2>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cyan-600">
            <th className="text-left py-1">Detected Object</th>
            <th className="text-right py-1">Time Detected</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr
              key={d.detection_id}
              className="border-b border-cyan-900 hover:bg-cyan-900/30 transition"
            >
              <td className="py-1">{d.label}</td>
              <td className="py-1 text-right text-cyan-400">
                {formatDate(d.detected_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
