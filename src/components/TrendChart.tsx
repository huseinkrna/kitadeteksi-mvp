import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ScreeningResult, Journal } from "../types";

interface TrendChartProps {
  screenings: ScreeningResult[];
  journals: Journal[];
}

export default function TrendChart({ screenings, journals }: TrendChartProps) {
  // We want to combine screenings and journals by date for trend rendering
  // Let's create a map of dates to values
  const dataMap: { [date: string]: { date: string; dep?: number; anx?: number; str?: number; mood?: number } } = {};

  // Formatter for dates to look nice on XAxis (e.g. DD/MM)
  const formatDateString = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    } catch {
      return isoString;
    }
  };

  // Add screenings to map (only DASS-21 results, or latest from other tests)
  screenings.forEach((s) => {
    const rawDate = new Date(s.created_at).toISOString().split("T")[0];
    const displayDate = formatDateString(s.created_at);
    if (!dataMap[rawDate]) {
      dataMap[rawDate] = { date: displayDate };
    }
    
    if (s.test_type === "dass21") {
      dataMap[rawDate].dep = s.raw_scores.dep;
      dataMap[rawDate].anx = s.raw_scores.anx;
      dataMap[rawDate].str = s.raw_scores.str;
    } else if (s.test_type === "phq9") {
      dataMap[rawDate].dep = s.raw_scores.total;
    } else if (s.test_type === "gad7") {
      dataMap[rawDate].anx = s.raw_scores.total;
    }
  });

  // Add journals to map
  journals.forEach((j) => {
    const rawDate = new Date(j.created_at).toISOString().split("T")[0];
    const displayDate = formatDateString(j.created_at);
    if (!dataMap[rawDate]) {
      dataMap[rawDate] = { date: displayDate };
    }
    dataMap[rawDate].mood = j.mood_scale;
  });

  // Convert map to sorted array by key (raw date)
  const chartData = Object.keys(dataMap)
    .sort()
    .map((key) => ({
      rawDate: key,
      ...dataMap[key]
    }))
    .slice(-7); // Keep only the last 7 active days to make it readable

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-sm">
        <p>Belum ada riwayat jurnal atau kuesioner</p>
        <p className="text-xs text-slate-400 mt-1">Isi kuesioner DASS-21 atau jurnal harian untuk melacak perkembangan Anda</p>
      </div>
    );
  }

  return (
    <div className="w-full h-80 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="font-display text-sm font-semibold text-slate-800 mb-4 tracking-tight flex items-center justify-between">
        <span>Grafik Tren Mood & Penapisan Klinis</span>
        <span className="text-xs text-slate-500 font-normal">Sumbu Kiri: Skor (0-42) | Sumbu Kanan: Mood (1-10)</span>
      </h3>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            tick={{ fill: "#64748b", fontSize: 11 }} 
            stroke="#cbd5e1"
          />
          <YAxis 
            yAxisId="left"
            tick={{ fill: "#2563eb", fontSize: 11 }} 
            stroke="#93c5fd"
            domain={[0, 42]}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            tick={{ fill: "#16a34a", fontSize: 11 }} 
            stroke="#86efac"
            domain={[1, 10]}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "#ffffff", 
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              color: "#0f172a"
            }} 
          />
          <Legend 
            wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
            iconSize={8}
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="dep" 
            name="Depresi" 
            stroke="#2563eb" 
            strokeWidth={2.5}
            dot={{ r: 4, stroke: "#ffffff", strokeWidth: 1 }}
            activeDot={{ r: 6 }} 
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="anx" 
            name="Kecemasan" 
            stroke="#0d9488" 
            strokeWidth={2}
            dot={{ r: 4, stroke: "#ffffff", strokeWidth: 1 }}
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="str" 
            name="Stres" 
            stroke="#f97316" 
            strokeWidth={1.5}
            dot={{ r: 3, stroke: "#ffffff", strokeWidth: 1 }}
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="mood" 
            name="Mood Harian" 
            stroke="#16a34a" 
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 5, fill: "#16a34a" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
