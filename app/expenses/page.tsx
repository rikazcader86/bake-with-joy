"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import Image from "next/image";
import { 
  Trash2, 
  Plus, 
  Search, 
  TrendingUp, 
  DollarSign, 
  Camera, 
  Paperclip, 
  Sparkles, 
  Check, 
  ArrowUpRight, 
  ArrowDownLeft,
  ExternalLink
} from "lucide-react";
import { Modal, ConfirmDialog } from "../../components/Modal";

interface Transaction {
  id: string;
  type: "Income" | "Expense" | string;
  category: string;
  amount: number;
  note: string;
  receiptUrl?: string;
  date: string;
}

const INCOME_CATEGORIES = ["Cake Sale", "Cupcake Boxes", "Dessert Table", "Consulting & Classes", "Other Income"];
const EXPENSE_CATEGORIES = ["Groceries & Butter", "Flour & Sugar", "Packaging & Boxes", "Electricity & Gas", "Tools & Molds", "Marketing", "Other Expense"];
const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Form State
  const [type, setType] = useState<"Income" | "Expense">("Expense");
  const [category, setCategory] = useState("Groceries & Butter");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  // Receipt Modal State
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  // Deletion State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    });
    return () => unsubscribe();
  }, []);

  const currentCategories = type === "Income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const saveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !category) return;
    setIsUploading(true);

    let receiptUrl = "";

    if (file) {
      try {
        const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
          method: 'POST',
          body: file,
        });
        const blob = await response.json();
        if (blob.url) receiptUrl = blob.url;
      } catch (err) {
        console.warn("Upload error, proceeding without receipt URL", err);
      }
    }

    await addDoc(collection(db, "transactions"), {
      type,
      category,
      amount: numAmount,
      note: note.trim(),
      receiptUrl,
      date: new Date().toISOString()
    });

    setAmount("");
    setNote("");
    setFile(null);
    setIsUploading(false);
    setIsFormOpen(false);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteDoc(doc(db, "transactions", deletingId));
      setDeletingId(null);
    }
  };

  // Quick Amount Add
  const addQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
  };

  // Dashboard Math
  const totalIncome = transactions.filter(t => t.type === "Income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpense;
  const profitMarginPercent = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : "0";

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.note && t.note.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === "All" || t.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchQuery, typeFilter]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span>Finance & Ledger</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track bakery revenue, grocery expenses, and live net profit.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 active:scale-98 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm shadow-pink-200 transition-all w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isFormOpen ? "Close Logger" : "Log Transaction"}</span>
        </button>
      </div>

      {/* Live Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
              Total Income
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block">
              Rs. {totalIncome.toFixed(2)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
              Total Expenses
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-700 mt-1 block">
              Rs. {totalExpense.toFixed(2)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-gray-900 p-4 sm:p-5 rounded-2xl shadow-sm text-white flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Net Profit ({profitMarginPercent}%)
            </span>
            <span className={`text-xl sm:text-2xl font-black mt-1 block ${netProfit >= 0 ? "text-white" : "text-rose-400"}`}>
              Rs. {netProfit.toFixed(2)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-800 text-pink-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Transaction Logger Form */}
      {isFormOpen && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-pink-200 shadow-sm animate-in fade-in zoom-in-98 duration-150 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span>Log New Transaction</span>
            </h2>
          </div>

          {/* Income vs Expense Selector Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              type="button" 
              onClick={() => { setType("Expense"); setCategory(EXPENSE_CATEGORIES[0]); }} 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                type === "Expense" ? "bg-white shadow-xs text-rose-600 font-black" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>- Expense</span>
            </button>
            <button 
              type="button" 
              onClick={() => { setType("Income"); setCategory(INCOME_CATEGORIES[0]); }} 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                type === "Income" ? "bg-white shadow-xs text-emerald-600 font-black" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>+ Income</span>
            </button>
          </div>

          <form onSubmit={saveTransaction} className="space-y-4">
            
            {/* Quick category chips */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Select Category
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1.5">
                {currentCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      category === cat
                        ? type === "Income" 
                          ? "bg-emerald-600 text-white" 
                          : "bg-rose-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount input & Quick addition buttons */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Amount (Rs.)
              </label>
              <div className="relative mb-2">
                <input 
                  type="number" 
                  step="0.01" 
                  min="0.01"
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  className="w-full border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 p-2.5 rounded-xl text-base font-bold text-gray-900 bg-white" 
                  placeholder="e.g. 1500" 
                  required 
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => addQuickAmount(val)}
                    className="shrink-0 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Note / Description
              </label>
              <input 
                type="text" 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                className="w-full border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 p-2.5 rounded-xl text-sm bg-white text-gray-900" 
                placeholder="e.g. Butter stock from supplier, Cupcake packaging restock" 
              />
            </div>

            {/* Receipt upload for expenses */}
            {type === "Expense" && (
              <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/80">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-pink-500" />
                  <span>Attach Receipt Photo (Optional)</span>
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)} 
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100 cursor-pointer" 
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button 
                type="submit" 
                disabled={isUploading || !amount || !category} 
                className={`flex-1 text-white p-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${
                  type === "Income" 
                    ? "bg-emerald-600 hover:bg-emerald-700" 
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{isUploading ? "Uploading..." : `Record ${type}`}</span>
              </button>
              <button 
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-3 border border-gray-300 hover:bg-gray-100 rounded-xl text-sm font-semibold text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions by category or note..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {["All", "Income", "Expense"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  typeFilter === t
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Ledger */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {filteredTransactions.length} {filteredTransactions.length === 1 ? "Record" : "Records"}
          </p>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-700 font-bold">No transactions found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery ? "Try searching for a different term" : "Click 'Log Transaction' to start tracking your cashflow"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((t) => {
              const isIncome = t.type === "Income";

              return (
                <div 
                  key={t.id} 
                  className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sm:p-4.5 transition-all hover:border-pink-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isIncome ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    }`}>
                      {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-sm">{t.category}</h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isIncome ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          {t.type}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t.note ? `${t.note} • ` : ""}{new Date(t.date).toLocaleDateString()}
                      </p>

                      {t.receiptUrl && (
                        <button
                          type="button"
                          onClick={() => setViewingReceiptUrl(t.receiptUrl!)}
                          className="text-[11px] font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 mt-1.5 bg-pink-50 hover:bg-pink-100 px-2 py-0.5 rounded-lg transition-colors w-fit"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>View Receipt</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    <span className={`font-black text-base sm:text-lg ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>
                      {isIncome ? "+" : "-"} Rs. {t.amount.toFixed(2)}
                    </span>

                    <button 
                      type="button"
                      onClick={() => setDeletingId(t.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Receipt Preview Modal */}
      <Modal
        isOpen={!!viewingReceiptUrl}
        onClose={() => setViewingReceiptUrl(null)}
        title="Attached Receipt Photo"
      >
        {viewingReceiptUrl && (
          <div className="space-y-4">
            <div className="bg-gray-100 rounded-xl overflow-hidden max-h-96 flex items-center justify-center p-2 relative min-h-[220px]">
              <Image 
                src={viewingReceiptUrl} 
                alt="Transaction receipt" 
                width={400}
                height={300}
                unoptimized
                className="max-h-80 w-auto object-contain rounded-lg shadow-xs"
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <a
                href={viewingReceiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open full image in new tab</span>
              </a>
              <button
                type="button"
                onClick={() => setViewingReceiptUrl(null)}
                className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title="Delete Transaction"
        message="Are you sure you want to remove this transaction record from the ledger?"
        confirmText="Delete"
      />
    </div>
  );
}
