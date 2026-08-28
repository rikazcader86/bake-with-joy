"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, addDoc, onSnapshot, orderBy, query, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  Trash2, 
  Plus, 
  Search, 
  FileText, 
  Share2, 
  Check, 
  Sparkles, 
  Package, 
  Calendar
} from "lucide-react";
import { ConfirmDialog } from "../../components/Modal";

interface RecipeOption {
  id: string;
  name: string;
  totalCost: number;
}

export type OrderStatus = "Pending" | "Baking" | "Ready" | "Completed";

interface OrderRecord {
  id: string;
  customerName: string;
  recipeName: string;
  baseRecipeCost: number;
  laborCost: number;
  packagingCost: number;
  totalCost: number;
  profitMargin: number;
  finalPrice: number;
  date: string;
  status?: OrderStatus;
  notes?: string;
}

const PROFIT_MARGIN_PRESETS = [20, 30, 40, 50, 60];
const LABOR_HOUR_PRESETS = [1, 1.5, 2, 2.5, 3, 4];
const PACKAGING_PRESETS = [100, 150, 200, 300, 500];

export default function OrdersPage() {
  const [savedRecipes, setSavedRecipes] = useState<RecipeOption[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderRecord[]>([]);
  
  // Calculator Form State
  const [customerName, setCustomerName] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [laborHours, setLaborHours] = useState("2");
  const [laborRate, setLaborRate] = useState("1000"); 
  const [packagingCost, setPackagingCost] = useState("150");
  const [profitMargin, setProfitMargin] = useState("40"); 
  const [notes, setNotes] = useState("");

  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Deletion
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubRecipes = onSnapshot(collection(db, "recipes"), (snapshot) => {
      const recipes = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RecipeOption));
      recipes.sort((a, b) => a.name.localeCompare(b.name));
      setSavedRecipes(recipes);
    });
    
    const q = query(collection(db, "orders"), orderBy("date", "desc"));
    const unsubOrders = onSnapshot(q, (snapshot) => {
      setOrderHistory(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OrderRecord)));
    });
    
    return () => { unsubRecipes(); unsubOrders(); };
  }, []);

  const activeRecipe = savedRecipes.find((r) => r.id === selectedRecipeId);
  const baseRecipeCost = activeRecipe ? activeRecipe.totalCost : 0;

  const numLaborHours = parseFloat(laborHours) || 0;
  const numLaborRate = parseFloat(laborRate) || 0;
  const calcLabor = numLaborHours * numLaborRate;
  const calcPackaging = parseFloat(packagingCost) || 0;
  
  const totalCost = baseRecipeCost + calcLabor + calcPackaging;
  const numProfitMargin = parseFloat(profitMargin) || 0;
  const markupMultiplier = 1 + (numProfitMargin / 100);
  const finalRetailPrice = totalCost * markupMultiplier;
  const totalProfit = finalRetailPrice - totalCost;

  const saveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !selectedRecipeId || !activeRecipe) return;

    await addDoc(collection(db, "orders"), {
      customerName: customerName.trim(),
      recipeName: activeRecipe.name,
      baseRecipeCost,
      laborCost: calcLabor,
      packagingCost: calcPackaging,
      totalCost,
      profitMargin: numProfitMargin,
      finalPrice: finalRetailPrice,
      status: "Pending",
      notes: notes.trim(),
      date: new Date().toISOString()
    });

    setCustomerName("");
    setSelectedRecipeId("");
    setLaborHours("2");
    setPackagingCost("150");
    setNotes("");
    setIsCalculatorOpen(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    await updateDoc(doc(db, "orders", orderId), { status: newStatus });
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteDoc(doc(db, "orders", deletingId));
      setDeletingId(null);
    }
  };

  const copyOrderSummary = (order: OrderRecord) => {
    const summary = `🎂 *Bake With Joy - Order Summary*
👤 *Customer:* ${order.customerName}
🍰 *Cake:* ${order.recipeName}
💰 *Total Price:* Rs. ${order.finalPrice.toFixed(2)}
📅 *Date:* ${new Date(order.date).toLocaleDateString()}
${order.notes ? `📝 *Notes:* ${order.notes}\n` : ""}
Thank you for ordering with us!`;

    navigator.clipboard.writeText(summary);
    setCopiedId(order.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const generateInvoice = (order: OrderRecord) => {
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(219, 39, 119); 
    doc.text("Bake With Joy", 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text("Artisan Bakery & Cake Studio", 14, 27);
    doc.text("Official Customer Invoice", 14, 33);
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.text(`Customer Name: ${order.customerName}`, 14, 45);
    doc.text(`Order Date: ${new Date(order.date).toLocaleDateString()}`, 14, 52);
    if (order.status) {
      doc.text(`Status: ${order.status}`, 14, 59);
    }
    
    autoTable(doc, {
      startY: 66,
      headStyles: { fillColor: [219, 39, 119] },
      head: [['Description', 'Amount (Rs.)']],
      body: [
        [`Custom Cake Base: ${order.recipeName}`, order.baseRecipeCost.toFixed(2)],
        ['Baking & Preparation Labor', order.laborCost.toFixed(2)],
        ['Cake Box, Board & Packaging', order.packagingCost.toFixed(2)],
      ],
      foot: [['Total Amount Due', `Rs. ${order.finalPrice.toFixed(2)}`]],
      footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    
    const lastTable = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
    const finalY = lastTable?.finalY || 110;
    
    if (order.notes) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Notes: ${order.notes}`, 14, finalY + 12);
    }

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for choosing Bake With Joy!", 14, finalY + 22);
    
    const safeName = order.customerName.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Invoice_${safeName}.pdf`);
  };

  const filteredOrders = useMemo(() => {
    return orderHistory.filter(order => {
      const matchesSearch = 
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.recipeName.toLowerCase().includes(searchQuery.toLowerCase());
      const orderStatus = order.status || "Pending";
      const matchesStatus = statusFilter === "All" || orderStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orderHistory, searchQuery, statusFilter]);

  const getStatusBadge = (status?: OrderStatus) => {
    switch (status) {
      case "Baking":
        return <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">🟠 Baking</span>;
      case "Ready":
        return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">🟢 Ready for Pickup</span>;
      case "Completed":
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">✅ Delivered & Paid</span>;
      default:
        return <span className="bg-pink-50 text-pink-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">🟡 Order Placed</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span>Orders & Pricing</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Calculate pricing with materials, labor, and margins, then generate instant invoices.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
          className="flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 active:scale-98 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm shadow-pink-200 transition-all w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isCalculatorOpen ? "Close Calculator" : "Calculate New Order"}</span>
        </button>
      </div>

      {/* Calculator Form */}
      {isCalculatorOpen && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-pink-200 shadow-sm animate-in fade-in zoom-in-98 duration-150 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span>Order Price Calculator</span>
            </h2>
            <span className="text-xs text-pink-600 bg-pink-50 font-bold px-2.5 py-1 rounded-full">
              Automated Profit Margin
            </span>
          </div>

          <form onSubmit={saveOrder} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Customer / Event Name
                </label>
                <input 
                  type="text" 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)} 
                  className="w-full border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 p-2.5 rounded-xl text-sm font-semibold bg-white text-gray-900" 
                  placeholder="e.g. Sarah's Birthday Cake, John Wedding" 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Base Cake Recipe
                </label>
                <select 
                  value={selectedRecipeId} 
                  onChange={(e) => setSelectedRecipeId(e.target.value)} 
                  className="w-full border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 p-2.5 rounded-xl text-sm font-semibold bg-white text-gray-900" 
                  required
                >
                  <option value="">Select recipe formula...</option>
                  {savedRecipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.name} (Materials: Rs. {recipe.totalCost.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Labor row with presets */}
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200/80 space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Labor & Time ({laborHours || 0} hrs @ Rs. {laborRate}/hr = Rs. {calcLabor.toFixed(2)})
                </label>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {LABOR_HOUR_PRESETS.map((hrs) => (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() => setLaborHours(hrs.toString())}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      laborHours === hrs.toString()
                        ? "bg-gray-900 text-white"
                        : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {hrs}h
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[11px] text-gray-500 font-semibold">Custom Hours</span>
                  <input 
                    type="number" 
                    step="0.25" 
                    min="0"
                    value={laborHours} 
                    onChange={(e) => setLaborHours(e.target.value)} 
                    className="w-full border border-gray-300 focus:border-pink-500 p-2 rounded-lg bg-white text-xs text-gray-900" 
                    placeholder="2.5" 
                  />
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 font-semibold">Hourly Rate (Rs.)</span>
                  <input 
                    type="number" 
                    value={laborRate} 
                    onChange={(e) => setLaborRate(e.target.value)} 
                    className="w-full border border-gray-300 focus:border-pink-500 p-2 rounded-lg bg-white text-xs text-gray-900" 
                  />
                </div>
              </div>
            </div>

            {/* Packaging & Profit Margin Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200/80 space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Box & Packaging (Rs.)
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {PACKAGING_PRESETS.map((pkg) => (
                    <button
                      key={pkg}
                      type="button"
                      onClick={() => setPackagingCost(pkg.toString())}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        packagingCost === pkg.toString()
                          ? "bg-gray-900 text-white"
                          : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {pkg}
                    </button>
                  ))}
                </div>
                <input 
                  type="number" 
                  value={packagingCost} 
                  onChange={(e) => setPackagingCost(e.target.value)} 
                  className="w-full border border-gray-300 focus:border-pink-500 p-2 rounded-lg bg-white text-xs text-gray-900" 
                  placeholder="150" 
                />
              </div>

              <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200/80 space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Profit Margin %
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {PROFIT_MARGIN_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setProfitMargin(m.toString())}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        profitMargin === m.toString()
                          ? "bg-pink-600 text-white"
                          : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {m}%
                    </button>
                  ))}
                </div>
                <input 
                  type="number" 
                  value={profitMargin} 
                  onChange={(e) => setProfitMargin(e.target.value)} 
                  className="w-full border border-gray-300 focus:border-pink-500 p-2 rounded-lg bg-white text-xs text-gray-900" 
                  placeholder="40" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Order Notes / Special Requests (Optional)
              </label>
              <input 
                type="text" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                className="w-full border border-gray-300 focus:border-pink-500 p-2.5 rounded-xl text-xs bg-white text-gray-900" 
                placeholder="e.g. Eggless, Pink roses piping, Deliver by Saturday 4pm" 
              />
            </div>

            {/* Real-time Pricing Summary Card */}
            <div className="bg-pink-50 p-4 sm:p-5 rounded-2xl border border-pink-200/80 space-y-2.5">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Raw Materials Cost:</span>
                <span className="font-semibold text-gray-800">Rs. {baseRecipeCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Labor & Preparation:</span>
                <span className="font-semibold text-gray-800">Rs. {calcLabor.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Packaging & Boxes:</span>
                <span className="font-semibold text-gray-800">Rs. {calcPackaging.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 font-bold border-t border-pink-200/60 pt-1.5">
                <span>Total Direct Cost:</span>
                <span>Rs. {totalCost.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center text-lg sm:text-xl font-black text-pink-600 pt-2 border-t border-pink-200">
                <span>Customer Retail Price:</span>
                <span>Rs. {finalRetailPrice.toFixed(2)}</span>
              </div>
              <div className="text-right text-xs text-emerald-700 font-bold">
                Estimated Net Profit: Rs. {totalProfit.toFixed(2)} ({profitMargin}%)
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button 
                type="submit" 
                disabled={!customerName.trim() || !selectedRecipeId}
                className="flex-1 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white p-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save Order Record</span>
              </button>
              <button 
                type="button"
                onClick={() => setIsCalculatorOpen(false)}
                className="px-4 py-3 border border-gray-300 hover:bg-gray-100 rounded-xl text-sm font-semibold text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name or cake recipe..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all"
            />
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["All", "Pending", "Baking", "Ready", "Completed"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  statusFilter === s
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders List */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {filteredOrders.length} {filteredOrders.length === 1 ? "Order" : "Orders"}
          </p>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-700 font-bold">No orders found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery ? "Try searching for a different customer name" : "Click 'Calculate New Order' above to calculate prices and save orders"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const currentStatus = order.status || "Pending";

              return (
                <div 
                  key={order.id} 
                  className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sm:p-5 transition-all hover:border-pink-200 space-y-4"
                >
                  {/* Top Bar: Customer Name & Price */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg text-gray-900">{order.customerName}</h3>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>{new Date(order.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="font-medium text-gray-700">{order.recipeName}</span>
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-xl font-black text-pink-600">
                        Rs. {order.finalPrice.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-bold">
                        Est. Profit: Rs. {(order.finalPrice - order.totalCost).toFixed(2)} ({order.profitMargin}%)
                      </div>
                    </div>
                  </div>

                  {/* Order Details & Cost Breakdown */}
                  <div className="grid grid-cols-3 gap-2 bg-gray-50/80 p-3 rounded-xl text-xs text-center">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Materials</span>
                      <span className="font-bold text-gray-800">Rs. {order.baseRecipeCost.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Labor</span>
                      <span className="font-bold text-gray-800">Rs. {order.laborCost.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Packaging</span>
                      <span className="font-bold text-gray-800">Rs. {order.packagingCost.toFixed(2)}</span>
                    </div>
                  </div>

                  {order.notes && (
                    <p className="text-xs text-gray-600 bg-amber-50/60 border border-amber-200/50 p-2.5 rounded-xl">
                      <span className="font-bold text-amber-900">Notes:</span> {order.notes}
                    </p>
                  )}

                  {/* Status update buttons */}
                  <div className="flex items-center justify-between gap-2 flex-wrap pt-1 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-gray-500 font-bold mr-1">Status:</span>
                      {(["Pending", "Baking", "Ready", "Completed"] as OrderStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => updateOrderStatus(order.id, st)}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                            currentStatus === st
                              ? "bg-pink-600 text-white shadow-xs"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeletingId(order.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                      title="Delete order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Action Buttons: PDF Invoice & WhatsApp Copy */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                    <button 
                      type="button"
                      onClick={() => generateInvoice(order)}
                      className="w-full bg-gray-900 hover:bg-black text-white p-2.5 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-2 shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-pink-400" />
                      <span>Download PDF Invoice</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => copyOrderSummary(order)}
                      className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 p-2.5 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-2"
                    >
                      {copiedId === order.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copy WhatsApp Summary</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title="Delete Order Record"
        message="Are you sure you want to delete this order? This action cannot be undone."
        confirmText="Delete Order"
      />
    </div>
  );
}
