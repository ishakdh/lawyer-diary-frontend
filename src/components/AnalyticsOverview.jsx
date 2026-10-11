import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function AnalyticsOverview({ cases }) {
    // Process cases by court name for the chart
    const courtCounts = cases.reduce((acc, c) => {
        const court = c.court_name || 'Other Court';
        acc[court] = (acc[court] || 0) + 1;
        return acc;
    }, {});

    const chartData = Object.keys(courtCounts).map(court => ({
        courtName: court,
        caseCount: courtCounts[court]
    }));

    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Caseload by Court Overview</h3>
            {chartData.length === 0 ? (
                <p className="text-slate-500 text-sm">No case data available for analytics yet.</p>
            ) : (
                <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="courtName" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="caseCount" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}