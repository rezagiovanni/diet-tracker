import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend);

function Card({ title, total, target, unit, color }) {
  const pct = Math.min(100, Math.round((total / target) * 100));
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, margin: 8, width: 220 }}>
      <h3 style={{ margin: 0, color: '#666', fontSize: 14 }}>{title}</h3>
      <div style={{ fontSize: 28, fontWeight: 'bold', margin: '8px 0' }}>
        {total}<span style={{ fontSize: 16, color: '#999' }}> / {target} {unit}</span>
      </div>
      <div style={{ height: 8, background: '#eee', borderRadius: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

function LineChart({ title, labels, data, color, yLabel }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, margin: 8, flex: 1, minWidth: 300 }}>
      <h3 style={{ margin: 0, color: '#333', fontSize: 16 }}>{title}</h3>
      <Line data={{
        labels,
        datasets: [{ label: yLabel, data, borderColor: color, backgroundColor: color + '33', tension: 0.3 }]
      }} options={{ responsive: true }} />
    </div>
  );
}

function PieChart({ title, labels, data }) {
  const colors = ['#4caf50', '#ff9800', '#f44336'];
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, margin: 8, width: 300 }}>
      <h3 style={{ margin: 0, color: '#333', fontSize: 16 }}>{title}</h3>
      <Pie data={{
        labels, datasets: [{ data, backgroundColor: colors, borderWidth: 1 }]
      }} options={{ responsive: true }} />
    </div>
  );
}

export default function App() {
  const [today, setToday] = useState(null);
  const [cal7, setCal7] = useState({ labels: [], values: [] });
  const [prot7, setProt7] = useState({ labels: [], values: [] });
  const [wbf7, setWbf7] = useState({ labels: [], weight: [], body_fat: [] });
  const [macros, setMacros] = useState({ labels: [], values: [] });

  useEffect(() => {
    axios.get('/today').then(r => setToday(r.data));
    axios.get('/calories-7d').then(r => setCal7(r.data));
    axios.get('/protein-7d').then(r => setProt7(r.data));
    axios.get('/weight-bf-7d').then(r => setWbf7(r.data));
    axios.get('/macros-today').then(r => setMacros(r.data));
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1 style={{ textAlign: 'center' }}>🍽️ Diet Tracker Dashboard</h1>

      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
        {today && <Card title="Today Calories" total={today.calories.total} target={today.calories.target} unit="kcal" color="#4caf50" />}
        {today && <Card title="Today Protein" total={today.protein.total} target={today.protein.target} unit="g" color="#2196f3" />}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        <LineChart title="Daily Calories (7d)" labels={cal7.labels} data={cal7.values} color="#4caf50" yLabel="kcal" />
        <LineChart title="Daily Protein (7d)" labels={prot7.labels} data={prot7.values} color="#2196f3" yLabel="g" />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, margin: 8, flex: 1, minWidth: 300 }}>
          <h3 style={{ margin: 0, color: '#333', fontSize: 16 }}>Weight & Body Fat (7d)</h3>
          <Line data={{
            labels: wbf7.labels,
            datasets: [
              { label: 'Weight (kg)', data: wbf7.weight, borderColor: '#9c27b0', backgroundColor: '#9c27b033', yAxisID: 'y', tension: 0.3 },
              { label: 'Body Fat %', data: wbf7.body_fat, borderColor: '#ff9800', backgroundColor: '#ff980033', yAxisID: 'y1', tension: 0.3 }
            ]
          }} options={{
            responsive: true,
            scales: { y: { type: 'linear', position: 'left' }, y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false } } }
          }} />
        </div>
        {macros.values.length > 0 && <PieChart title="Macros Today (g)" labels={macros.labels} data={macros.values} />}
      </div>
    </div>
  );
}
