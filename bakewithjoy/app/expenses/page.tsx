"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { Trash2 } from "lucide-react";

export default function FinancePage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [type, setType] = useState("Expense");
  const [category, setCategory] = useState("Groceries");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // We are creating a new "transactions" database collection for this
    const q = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const saveTransaction = async (e: any) => {
    e.preventDefault();
    if (!amount || !category) return;
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

    await addDoc(collection(db, "transactions"), {
      type,
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

  const deleteTransaction = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      await deleteDoc(doc(db, "transactions", id));
    }
  };

  // Dashboard Math
  const totalIncome = transactions.filter(t => t.type === "Income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  // Dynamic categories based on transaction type
  const incomeCategories = ["Cake Sale", "Consulting", "Other Income"];
  const expenseCategories = ["Groceries", "Packaging", "Marketing", "Utilities", "Other Expense"];
  const currentCategories = type === "Income" ? incomeCategories : expenseCategories;

  return (
    <div className="p-6 max-w-md mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-6 text-pink-600">Finance</h1>

      {/* The Live Dashboard */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm">
          <p className="text-green-600 text-xs font-bold uppercase tracking-wider">Income</p>
          <p className="text-xl font-bold text-green-700 mt-1">Rs. {totalIncome.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
          <p className="text-red-600 text-xs font-bold uppercase tracking-wider">Expenses</p>
          <p className="text-xl font-bold text-red-700 mt-1">Rs. {totalExpense.toFixed(2)}</p>
        </div>
        <div className="col-span-2 bg-gray-900 p-5 rounded-xl shadow-md">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Net Profit</p>
          <p className={`text-4xl font-bold mt-1 ${netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
            Rs. {netProfit.toFixed(2)}
          </p>
        </div>
      </div>
      
      {/* Transaction Logger */}
      <form onSubmit={saveTransaction} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-8">
        
        {/* Income / Expense Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
          <button 
            type="button" 
            onClick={() => { setType("Income"); setCategory("Cake Sale"); }} 
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${type === "Income" ? "bg-white shadow text-green-600" : "text-gray-500"}`}
          >
            + Income
          </button>
          <button 
            type="button" 
            onClick={() => { setType("Expense"); setCategory("Groceries"); }} 
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${type === "Expense" ? "bg-white shadow text-red-600" : "text-gray-500"}`}
          >
            - Expense
          </button>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1 text-gray-700">Amount (Rs.)</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg bg-white" required />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1 text-gray-700">Category</label>
            <input 
              list="category-list"
              type="text" 
              value={category} 
              onChange={(e) => setCategory(e.target.value)} 
              className="w-full border border-gray-300 p-2 rounded-lg bg-white" 
              required 
            />
            <datalist id="category-list">
              {currentCategories.map(cat => <option key={cat} value={cat} />)}
            </datalist>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1 text-gray-700">Note / Details</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg bg-white" placeholder="e.g., Birthday Cake Order" />
        </div>

        {/* Only show receipt scanner for expenses to keep it clean */}
        {type === "Expense" && (
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-1 text-gray-700">📸 Snap Receipt (Optional)</label>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-600 hover:file:bg-pink-100" 
            />
          </div>
        )}

        <button type="submit" disabled={isUploading} className={`w-full text-white p-3 rounded-lg font-bold transition-colors ${type === "Income" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}>
          {isUploading ? "Uploading..." : `Log ${type}`}
        </button>
      </form>

      {/* Transaction History */}
      <div>
        <h2 className="text-xl font-bold mb-3 text-gray-800">Ledger</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500 italic">No transactions logged yet.</p>
        ) : (
          <ul className="space-y-4 pb-8">
            {transactions.map((t: any) => (
              <li key={t.id} className="border p-4 rounded-xl bg-white shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-800">{t.category}</h3>
                    <p className="text-xs text-gray-500">{t.note} • {new Date(t.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-lg ${t.type === 'Income' ? 'text-green-600' : 'text-red-500'}`}>
                      {t.type === 'Income' ? '+' : '-'} Rs. {t.amount.toFixed(2)}
                    </span>
                    <button 
                      onClick={() => deleteTransaction(t.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Delete transaction"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                {t.receiptUrl && (
                  <a href={t.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 flex items-center gap-1 bg-blue-50 w-fit px-2 py-1 rounded">
                    📎 View Receipt
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}