import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Line, Pie, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, ChartDataLabels);

// ── Dark Theme Constants ──
const theme = {
  bg: '#0d1117',
  card: '#161b22',
  border: '#30363d',
  text: '#e6edf3',
  muted: '#8b949e',
  green: '#2ea043',
  blue: '#58a6ff',
  purple: '#bc8cff',
  orange: '#d29922',
  red: '#f85149',
};

function Card({ title, total, target, unit, color }) {
  const pct = Math.min(100, Math.round((total / target) * 100));
  const over = total > target;
  return (
    <div style={{
      background: theme.card, border: `1px solid ${theme.border}`,
      borderRadius: 16, padding: 20, margin: 10, minWidth: 200, flex: 1,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <div style={{ color: theme.muted, fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: theme.text, margin: '8px 0 4px' }}>
        {total}
        <span style={{ fontSize: 16, fontWeight: 400, color: theme.muted }}> / {target} {unit}</span>
      </div>
      <div style={{ height: 8, background: '#21262d', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min(pct, 100)}%`, height: '100%',
          background: over ? `linear-gradient(90deg, ${color}, ${theme.orange})` : color,
          borderRadius: 4,
        }} />
      </div>
      <div style={{ color: theme.muted, fontSize: 12, marginTop: 6, textAlign: 'right' }}>
        {over ? `⚠️ ${pct}% exceeded` : `${pct}%`}
      </div>
    </div>
  );
}

function LineChart({ title, labels, data, color, yLabel }) {
  return (
    <div style={{
      background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16,
      padding: 20, margin: 10, flex: 1, minWidth: 300,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <h3 style={{ margin: '0 0 12px', color: theme.text, fontSize: 15, fontWeight: 600 }}>{title}</h3>
      <Line data={{
        labels,
        datasets: [{ label: yLabel, data, borderColor: color, backgroundColor: color + '44', tension: 0.3, pointRadius: 4, pointHoverRadius: 6 }]
      }} options={{
        responsive: true,
        color: theme.text,
        plugins: {
          legend: { display: false },
          datalabels: {
            color: '#fff', anchor: 'end', align: 'left', offset: 4,
            font: { weight: 'bold', size: 10 },
            formatter: v => v || ''
          }
        },
        scales: { x: { ticks: { display: false, color: theme.muted }, grid: { color: theme.border } }, y: { afterFit: (a) => a.width = 20, ticks: { display: false, color: theme.muted }, grid: { color: theme.border } } }
      }} />
    </div>
  );
}

function PieChart({ title, labels, data }) {
  const colors = [theme.green, theme.orange, theme.red];
  const totalGrams = data.reduce((a, b) => a + b, 0);
  const percentages = data.map(v => totalGrams > 0 ? ((v / totalGrams) * 100).toFixed(1) : 0);

  return (
    <div style={{
      background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16,
      padding: 20, margin: 10, flex: 1, minWidth: 300,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <h3 style={{ margin: '0 0 12px', color: theme.text, fontSize: 15, fontWeight: 600 }}>{title}</h3>
      <Pie data={{
        labels: labels.map((l, i) => `${l}: ${data[i].toFixed(1)}g (${percentages[i]}%)`),
        datasets: [{
          data, backgroundColor: colors, borderWidth: 1, borderColor: theme.bg,
        }]
      }} options={{
        responsive: true,
        color: theme.text,
        plugins: {
          legend: { display: false },
          datalabels: {
            color: '#fff', fontWeight: 'bold', fontSize: 12,
            formatter: (v, ctx) => {
              const pct = percentages[ctx.dataIndex];
              return pct > 5 ? `${pct}%` : '';
            },
            font: { weight: 'bold' },
          }
        }
      }} />
      {totalGrams > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
          {labels.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: colors[i] }} />
              <span style={{ color: theme.muted, fontSize: 12 }}>{l}: <strong style={{ color: theme.text }}>{data[i].toFixed(1)}g</strong></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeficitChart({ title, deficit }) {
  const colors = deficit.values.map(v => v >= 0 ? '#2ea043' : '#f85149');
  return (
    <div style={{
      background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16,
      padding: 20, margin: 10, flex: 1, minWidth: 300,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <h3 style={{ margin: '0 0 4px', color: theme.text, fontSize: 15, fontWeight: 600 }}>{title}</h3>
      <div style={{ color: theme.muted, fontSize: 12, marginBottom: 12 }}>
        TDEE: {deficit.tdee} kcal &mdash; Target defisit: 500 kcal/hari
      </div>
      <Bar data={{
        labels: deficit.labels,
        datasets: [{ label: 'Defisit (%)', data: deficit.pcts, backgroundColor: colors, borderRadius: 4 }]
      }} options={{
        responsive: true, color: theme.text,
        plugins: {
          legend: { display: false },
          datalabels: {
            color: '#fff', anchor: 'end', align: 'end', offset: 2,
            font: { weight: 'bold', size: 10 },
            formatter: v => v > 0 ? v + '%' : ''
          }
        },
        scales: {
          x: { ticks: { display: false, color: theme.muted }, grid: { display: false } },
          y: { afterFit: (a) => a.width = 20, ticks: { display: false }, grid: { color: theme.border }, suggestedMax: 100 }
        }
      }} />
    </div>
  );
}

function WeightChart({ title, wbf7 }) {
  return (
    <div style={{
      background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16,
      padding: 20, margin: 10, flex: 1, minWidth: 300,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <h3 style={{ margin: '0 0 12px', color: theme.text, fontSize: 15, fontWeight: 600 }}>{title}</h3>
      <Line data={{
        labels: wbf7.labels,
        datasets: [
          { label: 'Weight (kg)', data: wbf7.weight, borderColor: theme.blue, backgroundColor: theme.blue + '44', tension: 0.3, pointRadius: 4 },
          { label: 'Body Fat %', data: wbf7.body_fat, borderColor: theme.orange, backgroundColor: theme.orange + '44', tension: 0.3, pointRadius: 4, borderDash: [5, 5] }
        ]
      }} options={{
        responsive: true,
        color: theme.text,
        plugins: {
          legend: { display: false },
          datalabels: {
            color: '#fff', anchor: 'end', align: 'left', offset: 4,
            font: { weight: 'bold', size: 10 },
            formatter: v => v || ''
          }
        },
        scales: {
          y: { ticks: { display: false }, grid: { color: theme.border } },
          x: { ticks: { display: false, color: theme.muted }, grid: { color: theme.border } }
        }
      }} />
    </div>
  );
}

export default function App() {
  const [today, setToday] = useState(null);
  const [cal7, setCal7] = useState({ labels: [], values: [] });
  const [prot7, setProt7] = useState({ labels: [], values: [] });
  const [wbf7, setWbf7] = useState({ labels: [], weight: [], body_fat: [] });
  const [macros, setMacros] = useState({ labels: [], values: [] });
  const [deficit, setDeficit] = useState({ labels: [], values: [], pcts: [], tdee: 2035 });
  const [todayFoods, setTodayFoods] = useState([]);
  const [proteinTips, setProteinTips] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const [dailyFacts, setDailyFacts] = useState([]);

  useEffect(() => {
    axios.get('/today').then(r => setToday(r.data));
    axios.get('/calories-7d').then(r => setCal7(r.data));
    axios.get('/protein-7d').then(r => setProt7(r.data));
    axios.get('/weight-bf-7d').then(r => setWbf7(r.data));
    axios.get('/macros-today').then(r => setMacros(r.data));
    axios.get('/deficit-7d').then(r => setDeficit(r.data));
    axios.get('/today-foods').then(r => setTodayFoods(r.data.items || []));
    axios.get('/daily-facts').then(r => setDailyFacts(r.data.facts || []));
  }, []);

  return (
    <div style={{
      background: theme.bg, minHeight: '100vh', padding: 24,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: theme.text,
    }}>
      <h1 style={{ textAlign: 'center', margin: '0 0 24px', fontSize: 24, fontWeight: 700 }}>
        🍽️ Diet Tracker Dashboard
      </h1>

      {/* Cards */}
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', maxWidth: 900, margin: '0 auto 12px' }}>
        {today && <Card title="Today Calories" total={today.calories.total} target={today.calories.target} unit="kcal" color={theme.green} />}
        {today && (
          <div style={{
            background: theme.card, border: `1px solid ${theme.border}`,
            borderRadius: 16, padding: 20, margin: 10, minWidth: 200, flex: 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', cursor: 'pointer'
            }} onClick={() => {
            if (showTips) { setShowTips(false); setProteinTips(null); }
            else { setShowTips(true); axios.get('/protein-tips').then(r => setProteinTips(r.data)); }
            }}>
            <div style={{ color: theme.muted, fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Today Protein
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: theme.text, margin: '8px 0 4px' }}>
                {today.protein.total}
                <span style={{ fontSize: 16, fontWeight: 400, color: theme.muted }}> / {today.protein.target} g</span>
              </div>
              <div style={{ fontSize: 20 }}>💡</div>
            </div>
            <div style={{ height: 8, background: '#21262d', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(Math.round((today.protein.total/today.protein.target)*100),100)}%`, height: '100%', background: theme.blue, borderRadius: 4 }} />
            </div>
            <div style={{ color: theme.muted, fontSize: 12, marginTop: 6, textAlign: 'right' }}>
              {Math.round((today.protein.total/today.protein.target)*100)}%
            </div>
            {showTips && proteinTips && (
              <div style={{ background: '#21262d', borderRadius: 10, padding: 10, marginTop: 10, color: theme.muted, fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 6, color: theme.orange }}>Protein tips</div>
                {proteinTips.suggestions.map((s, i) => (
                  <div key={i} style={{ padding: '2px 0', borderBottom: `1px solid ${theme.border}33`, color: theme.text }}>
                    <strong style={{ color: theme.green }}>{s.food}</strong> {s.portion_g}g → <span style={{ color: theme.blue }}>+{s.protein_gain}g protein</span> / +{s.kcal_gain} kcal
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {deficit.values.length > 0 && (() => {
          const v = deficit.values[deficit.values.length - 1];
          const pct = deficit.pcts[deficit.pcts.length - 1];
          const good = v >= 0;
          return (
            <div style={{
              background: theme.card, border: `1px solid ${theme.border}`,
              borderRadius: 16, padding: 20, margin: 10, minWidth: 200, flex: 1,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}>
              <div style={{ color: theme.muted, fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Today Deficit
              </div>
              <div style={{ fontSize: 40, fontWeight: 700, color: good ? theme.green : theme.red, margin: '4px 0' }}>
                {pct}%
              </div>
              <div style={{ color: theme.muted, fontSize: 13 }}>
                🔥 {Math.abs(v)}/{deficit.tdee} kcal deficit
              </div>
            </div>
          );
        })()}
      </div>

      {/* Line graphs row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1000, margin: '0 auto' }}>
        <LineChart title="Daily Calories (7d)" labels={cal7.labels} data={cal7.values} color={theme.green} yLabel="kcal" />
        <LineChart title="Daily Protein (7d)" labels={prot7.labels} data={prot7.values} color={theme.blue} yLabel="g" />
      </div>

      {/* Middle row: Weight + Deficit */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1000, margin: '0 auto' }}>
        <WeightChart title="Weight & Body Fat (7d)" wbf7={wbf7} />
        <DeficitChart title="Daily Defisit (7d)" deficit={deficit} />
      </div>

      {/* Pie chart + Daily Facts */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', maxWidth: 1000, margin: '0 auto 12px' }}>
        <div style={{ flex: 1, minWidth: 200, maxWidth: 340 }}>
          {macros.values.length > 0 && <PieChart title="Macros Today" labels={macros.labels} data={macros.values} />}
        </div>
        {dailyFacts.length > 0 && (
          <div style={{ flex: 1, minWidth: 200, maxWidth: 340, background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 12px', color: theme.text, fontSize: 15, fontWeight: 600 }}>📊 1 Day 1 Fact</h3>
            <div style={{ color: theme.muted, fontSize: 13, lineHeight: 1.8 }}>
              {dailyFacts.map((f, i) => (
                <div key={i} style={{ padding: '2px 0' }}>{f}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Food Detail Table */}
      {todayFoods.length > 0 && (
        <div style={{ maxWidth: 1000, margin: '12px auto', background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          <h3 style={{ margin: '0 0 12px', color: theme.text, fontSize: 15, fontWeight: 600 }}>Today's Food Detail</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.border}`, color: theme.muted, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>
                  <th style={{ textAlign: 'left', padding: '8px 6px' }}>Food</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px' }}>g</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px' }}>kcal</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px' }}>Kcal%</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px' }}>Protein%</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px' }}>Carbs%</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px' }}>Fat%</th>
                </tr>
              </thead>
              <tbody>
                {todayFoods.map((it, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${theme.border}33`, color: theme.text }}>
                    <td style={{ padding: '8px 6px', fontWeight: 500 }}>{it.food}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', color: theme.muted }}>{it.grams}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px' }}>{it.kcal}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', color: theme.blue }}>{it.kcal_pct}%</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', color: theme.green }}>{it.protein_pct}%</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', color: theme.orange }}>{it.carbs_pct}%</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', color: theme.red }}>{it.fat_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Macro Composition Table */}
      {todayFoods.length > 0 && (
        <div style={{ maxWidth: 1000, margin: '12px auto', background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          <h3 style={{ margin: '0 0 12px', color: theme.text, fontSize: 15, fontWeight: 600 }}>Macro Composition per Food</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.border}`, color: theme.muted, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>
                  <th style={{ textAlign: 'left', padding: '8px 6px' }}>Food</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px' }}>g</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px' }}>Protein</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px' }}>P%</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px' }}>Carbs</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px' }}>C%</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px' }}>Fat</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px' }}>F%</th>
                </tr>
              </thead>
              <tbody>
                {todayFoods.map((it, i) => {
                  const pPct = it.grams > 0 ? (it.protein / it.grams * 100).toFixed(1) : 0;
                  const cPct = it.grams > 0 ? (it.carbs / it.grams * 100).toFixed(1) : 0;
                  const fPct = it.grams > 0 ? (it.fat / it.grams * 100).toFixed(1) : 0;
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${theme.border}33`, color: theme.text }}>
                      <td style={{ padding: '8px 6px', fontWeight: 500 }}>{it.food}</td>
                      <td style={{ textAlign: 'right', padding: '8px 6px', color: theme.muted }}>{it.grams}</td>
                      <td style={{ textAlign: 'right', padding: '8px 6px', color: theme.green }}>{it.protein}g</td>
                      <td style={{ textAlign: 'right', padding: '8px 6px', color: theme.green }}>{pPct}%</td>
                      <td style={{ textAlign: 'right', padding: '8px 6px', color: theme.orange }}>{it.carbs}g</td>
                      <td style={{ textAlign: 'right', padding: '8px 6px', color: theme.orange }}>{cPct}%</td>
                      <td style={{ textAlign: 'right', padding: '8px 6px', color: theme.red }}>{it.fat}g</td>
                      <td style={{ textAlign: 'right', padding: '8px 6px', color: theme.red }}>{fPct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', color: theme.muted, fontSize: 11, marginTop: 32 }}>
        Diet Tracker v1.0 &mdash; auto-deploy from GitHub
      </div>
    </div>
  );
}
