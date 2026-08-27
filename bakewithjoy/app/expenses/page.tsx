"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [category, setCategory] = useState("Groceries");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "expenses"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const saveExpense = async (e: any) => {
    e.preventDefault();
    if (!amount) return;
    setIsUploading(true);

    let receiptUrl = "";

    if (file) {
      const response = await fetch(`/api/upload?filename=${file.name}`, {
        method: 'POST',
        body: file,
      });
      const blob = await response.json();
      receiptUrl = blob.url;
    }

    await addDoc(collection(db, "expenses"), {
      category,
      amount: parseFloat(amount),
      note,
      receiptUrl,
      date: new Date().toISOString()
    });

    setAmount("");
    setNote("");
    setFile(null);
    setIsUploading(false);
  };

  // Quick report math: Sum up everything
  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="p-6 max-w-md mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-6 text-pink-600">Expenses</h1>

      {/* Reports Dashboard */}
      <div className="bg-gray-900 text-white p-5 rounded-xl mb-6 shadow-md">
        <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Total Business Spend</p>
        <p className="text-4xl font-bold text-pink-400 mt-1">Rs. {totalSpent.toFixed(2)}</p>
      </div>
      
      {/* Logger Form */}
      <form onSubmit={saveExpense} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1 text-gray-700">Amount (Rs.)</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg bg-white" required />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1 text-gray-700">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg bg-white">
              <option value="Groceries">Groceries</option>
              <option value="Packaging">Packaging</option>
              <option value="Marketing">Marketing</option>
              <option value="Utilities">Utilities</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1 text-gray-700">Note / Store</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg bg-white" placeholder="e.g., Keells Supermarket" />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold mb-1 text-gray-700">📸 Snap Receipt</label>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" // Opens back camera on mobile
            onChange={(e) => setFile(e.target.files?.[0] || null)} 
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-600 hover:file:bg-pink-100" 
          />
        </div>

        <button type="submit" disabled={isUploading} className="w-full bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-lg font-bold transition-colors">
          {isUploading ? "Uploading Receipt..." : "Log Expense"}
        </button>
      </form>

      {/* Expense History */}
      <div>
        <h2 className="text-xl font-bold mb-3 text-gray-800">Recent Transactions</h2>
        <ul className="space-y-4 pb-8">
          {expenses.map((exp: any) => (
            <li key={exp.id} className="border p-4 rounded-xl bg-white shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-800">{exp.category}</h3>
                  <p className="text-xs text-gray-500">{exp.note} - {new Date(exp.date).toLocaleDateString()}</p>
                </div>
                <span className="font-bold text-red-500">- Rs. {exp.amount.toFixed(2)}</span>
              </div>
              {exp.receiptUrl && (
                <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-2 bg-blue-50 w-fit px-2 py-1 rounded">
                  📎 View Receipt
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}