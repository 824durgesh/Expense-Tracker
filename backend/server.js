const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = './data.json';

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}


function calculateDebts(members, expenses) {
  
  const net = {};
  members.forEach(m => {
    net[m] = {};
    members.forEach(n => { if (m !== n) net[m][n] = 0; });
  });

  expenses.forEach(({ paidBy, amount }) => {
    const share = amount / members.length;
    members.forEach(member => {
      if (member !== paidBy) {
        net[member][paidBy] += share; 
      }
    });
  });

 
  const debts = [];
  const seen = new Set();
  members.forEach(a => {
    members.forEach(b => {
      if (a === b) return;
      const key = [a, b].sort().join('|');
      if (seen.has(key)) return;
      seen.add(key);

      const aOwesB = net[a][b] - net[b][a];
      if (aOwesB > 0.001) debts.push({ from: a, to: b, amount: +aOwesB.toFixed(2) });
      else if (aOwesB < -0.001) debts.push({ from: b, to: a, amount: +(-aOwesB).toFixed(2) });
    });
  });

  return debts;
}



app.get('/members', (req, res) => {
  res.json(readData().members);
});

app.post('/members', (req, res) => {
  const { name } = req.body;
  const data = readData();
  if (!name || data.members.includes(name))
    return res.status(400).json({ error: 'Invalid or duplicate name' });
  data.members.push(name);
  writeData(data);
  res.json(data.members);
});

app.get('/expenses', (req, res) => {
  res.json(readData().expenses);
});

app.post('/expenses', (req, res) => {
  const { paidBy, amount, description } = req.body;
  const data = readData();
  if (!paidBy || !amount || !description)
    return res.status(400).json({ error: 'Missing fields' });
  const expense = { id: Date.now(), paidBy, amount: parseFloat(amount), description, date: new Date().toISOString() };
  data.expenses.push(expense);
  writeData(data);
  res.json(expense);
});

app.get('/debts', (req, res) => {
  const data = readData();
  res.json(calculateDebts(data.members, data.expenses));
});

app.get('/transactions', (req, res) => {
  res.json(readData().expenses);
});

app.listen(5000, () => console.log('Server running on port 5000'));