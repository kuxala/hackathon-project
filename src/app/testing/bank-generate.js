// npm install xlsx
// Run: node generateRealisticBankStatement.js

const XLSX = require("xlsx");

function generateRealisticStatement(months = 3) {
  const incomeSources = [
    { name: "Salary", day: 1, avg: 3000 },
    { name: "Freelance Project", day: 15, avg: 800 },
  ];

  const fixedExpenses = [
    { name: "Rent", day: 3, avg: 1000 },
    { name: "Internet Bill", day: 10, avg: 50 },
    { name: "Electricity Bill", day: 11, avg: 100 },
    { name: "Phone Bill", day: 12, avg: 40 },
    { name: "Streaming Subscription", day: 20, avg: 15 },
  ];

  const randomExpenses = [
    "Groceries",
    "Dining",
    "Coffee",
    "Transport",
    "Entertainment",
    "Online Shopping",
    "Healthcare",
    "Gift",
    "Gym",
  ];

  const today = new Date();
  const data = [];
  let balance = 2000;

  for (let m = 0; m < months; m++) {
    const dateBase = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const month = dateBase.getMonth() + 1;
    const year = dateBase.getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const formattedDate = date.toISOString().split("T")[0];

      // Incomes on specific days
      incomeSources.forEach((src) => {
        if (day === src.day) {
          const amount = Math.round(src.avg + Math.random() * 300 - 150);
          balance += amount;
          data.push({
            Date: formattedDate,
            Description: src.name,
            Type: "Income",
            Amount: amount,
            Balance: balance.toFixed(2),
          });
        }
      });

      // Fixed expenses on certain days
      fixedExpenses.forEach((exp) => {
        if (day === exp.day) {
          const amount = Math.round(exp.avg + Math.random() * 30 - 15);
          balance -= amount;
          data.push({
            Date: formattedDate,
            Description: exp.name,
            Type: "Expense",
            Amount: amount,
            Balance: balance.toFixed(2),
          });
        }
      });

      // Random daily expenses (simulate daily life)
      if (Math.random() < 0.4) { // 40% chance daily spend
        const count = Math.floor(Math.random() * 2) + 1; // 1–2 transactions
        for (let i = 0; i < count; i++) {
          const category = randomExpenses[Math.floor(Math.random() * randomExpenses.length)];
          const amount = Math.round(Math.random() * 80 + 10);
          balance -= amount;
          data.push({
            Date: formattedDate,
            Description: category,
            Type: "Expense",
            Amount: amount,
            Balance: balance.toFixed(2),
          });
        }
      }
    }
  }

  // Sort by date ascending
  data.sort((a, b) => new Date(a.Date) - new Date(b.Date));

  // Export to Excel
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "BankStatement");

  const fileName = "realistic_bank_statement.xlsx";
  XLSX.writeFile(wb, fileName);

  console.log(`✅ Generated ${months}-month realistic bank statement: ${fileName}`);
  console.table(data.slice(0, 10));
}

generateRealisticStatement(3);
