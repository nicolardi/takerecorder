import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Clock, Film, TrendingUp, Search, RefreshCw } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
  getAllTakesWithInfo,
  filterByPeriod,
  filterBySearch,
  calculateSummary,
  prepareLineChartData,
  prepareBarChartData,
  getTrackSummaryTable,
} from '../../utils/statisticsHelpers';

// Registra componenti Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PERIOD_OPTIONS = [
  { value: 'ultimo-mese', label: 'Ultimo mese' },
  { value: 'ultimi-6-mesi', label: 'Ultimi 6 mesi' },
  { value: 'ultimo-anno', label: 'Ultimo anno' },
  { value: 'tutto', label: 'Tutto' },
];

export function StatisticsTab({ isDark = true }) {
  const [allTakes, setAllTakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState('tutto');

  // Carica dati
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const takes = await getAllTakesWithInfo();
        setAllTakes(takes);
      } catch (error) {
        console.error('Errore caricamento statistiche:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filtra dati
  const filteredTakes = useMemo(() => {
    let result = allTakes;
    result = filterByPeriod(result, period);
    result = filterBySearch(result, searchQuery);
    return result;
  }, [allTakes, period, searchQuery]);

  // Calcola statistiche
  const summary = useMemo(() => calculateSummary(filteredTakes), [filteredTakes]);
  const lineChartData = useMemo(() => prepareLineChartData(filteredTakes, period), [filteredTakes, period]);
  const barChartData = useMemo(() => prepareBarChartData(filteredTakes, 10), [filteredTakes]);
  const tableData = useMemo(() => getTrackSummaryTable(filteredTakes), [filteredTakes]);

  // Opzioni grafici
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#fff',
        bodyColor: '#9ca3af',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: '#6b7280', font: { size: 10 } },
        grid: { color: 'rgba(75, 85, 99, 0.3)' },
      },
      y: {
        ticks: { color: '#6b7280', font: { size: 10 } },
        grid: { color: 'rgba(75, 85, 99, 0.3)' },
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950">
        <RefreshCw className="w-8 h-8 text-gray-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col overflow-hidden ${isDark ? 'bg-gray-950' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex-shrink-0 p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Statistiche</h2>
        </div>

        {/* Filtri */}
        <div className="flex gap-2">
          {/* Ricerca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca brano, opera..."
              className="w-full bg-gray-800 text-white pl-9 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Periodo */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PERIOD_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contenuto scrollabile */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Cards riepilogo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800/50 rounded-xl p-3 text-center">
            <Film className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{summary.totalTakes}</p>
            <p className="text-gray-500 text-xs">Take totali</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 text-center">
            <Clock className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{summary.totalFormatted}</p>
            <p className="text-gray-500 text-xs">Ore totali</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 text-center">
            <TrendingUp className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{summary.avgFormatted}</p>
            <p className="text-gray-500 text-xs">Media</p>
          </div>
        </div>

        {filteredTakes.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nessun dato disponibile</p>
            <p className="text-gray-600 text-sm mt-1">
              Registra dei video per vedere le statistiche
            </p>
          </div>
        ) : (
          <>
            {/* Grafico lineare - Ore nel tempo */}
            {lineChartData.labels.length > 0 && (
              <div className="bg-gray-800/30 rounded-xl p-4">
                <h3 className="text-white text-sm font-medium mb-3">Ore di registrazione</h3>
                <div className="h-48">
                  <Line data={lineChartData} options={chartOptions} />
                </div>
              </div>
            )}

            {/* Grafico a barre - Take per brano */}
            {barChartData.labels.length > 0 && (
              <div className="bg-gray-800/30 rounded-xl p-4">
                <h3 className="text-white text-sm font-medium mb-3">Take per brano (Top 10)</h3>
                <div className="h-48">
                  <Bar data={barChartData} options={chartOptions} />
                </div>
              </div>
            )}

            {/* Tabella riepilogo */}
            {tableData.length > 0 && (
              <div className="bg-gray-800/30 rounded-xl overflow-hidden">
                <h3 className="text-white text-sm font-medium p-4 pb-2">Riepilogo per brano</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-gray-500 text-xs border-b border-gray-700">
                        <th className="text-left px-4 py-2">Brano</th>
                        <th className="text-right px-4 py-2">Take</th>
                        <th className="text-right px-4 py-2">Durata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.slice(0, 20).map((row, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-800 last:border-b-0"
                        >
                          <td className="px-4 py-2 text-white text-sm truncate max-w-[150px]">
                            {row.trackName}
                          </td>
                          <td className="px-4 py-2 text-gray-400 text-sm text-right">
                            {row.takes}
                          </td>
                          <td className="px-4 py-2 text-gray-400 text-sm text-right">
                            {row.duration}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {tableData.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-800/50">
                          <td className="px-4 py-2 text-white text-sm font-medium">Totale</td>
                          <td className="px-4 py-2 text-white text-sm text-right font-medium">
                            {summary.totalTakes}
                          </td>
                          <td className="px-4 py-2 text-white text-sm text-right font-medium">
                            {summary.totalFormatted}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default StatisticsTab;
