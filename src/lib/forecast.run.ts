import { readFileSync } from 'fs';
import { forecast, monthEndFactor, Department, HistoryDay } from './forecast';

const dept: Department = 'HR';

const lines = readFileSync('ml/data/daily_counts.csv', 'utf8').trim().split('\n');
const header = lines[0].split(',');
const deptCol = header.indexOf(dept);
const dayCol = header.indexOf('day');
const periodCol = header.indexOf('period');

const history: HistoryDay[] = lines
  .slice(1)
  .map((l) => l.split(','))
  .filter((c) => c[periodCol] !== 'gap')
  .map((c) => ({ date: c[dayCol].slice(0, 10), tickets: Number(c[deptCol]) }));

const result = forecast(dept, history);
console.log('history days:', history.length, 'last:', history[history.length - 1].date);
console.log('monthEndFactor:', monthEndFactor(history).toFixed(2));
for (const d of result.days) console.log(d.date, d.expected);

const again = forecast(dept, history);
console.log('days:', result.days.length);
console.log('identical on rerun:', JSON.stringify(result.days) === JSON.stringify(again.days));