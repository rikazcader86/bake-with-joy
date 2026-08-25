"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function OrdersPage() {
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  
  const [customerName, setCustomerName] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [laborHours, setLaborHours] = useState("");
  const [laborRate, setLaborRate] = useState("1000"); 
  const [packagingCost, setPackagingCost] = useState("");
  const [profitMargin, setProfitMargin] = useState("40"); 

  useEffect(() => {
    // Load recipes
    const unsubRecipes = onSnapshot(collection(db, "recipes"), (snapshot) => {
      setSavedRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    // Load past orders (newest first)
    const q = query(collection(db, "orders"), orderBy("date", "desc"));
    const unsubOrders = onSnapshot(q, (snapshot) => {
      setOrderHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    return () => { unsubRecipes(); unsubOrders(); };
  }, []);

  const activeRecipe = savedRecipes.find((r: any) => r.id === selectedRecipeId);
  const baseRecipeCost = activeRecipe ? activeRecipe.totalCost : 0;

  const calcLabor = (parseFloat(laborHours) || 0) * (parseFloat(laborRate) || 0);
  const calcPackaging = parseFloat(packagingCost) || 0;
  
  const totalCost = baseRecipeCost + calcLabor + calcPackaging;
  const markupMultiplier = 1 + ((parseFloat(profitMargin) || 0) / 100);
  const finalRetailPrice = totalCost * markupMultiplier;
  const totalProfit = finalRetailPrice - totalCost;

  const saveOrder = async (e: any) => {
    e.preventDefault();
    if (!customerName || !selectedRecipeId || !activeRecipe) return;

    await addDoc(collection(db, "orders"), {
      customerName,
      recipeName: activeRecipe.name,
      baseRecipeCost,
      laborCost: calcLabor,
      packagingCost: calcPackaging,
      totalCost,
      profitMargin: parseFloat(profitMargin),
      finalPrice: finalRetailPrice,
      date: new Date().toISOString()
    });

    setCustomerName("");
    setSelectedRecipeId("");
    setLaborHours("");
    setPackagingCost("");
  };

  // --- THIS IS THE NEW PDF GENERATOR FUNCTION ---
  const generateInvoice = (order: any) => {
    const doc = new jsPDF();
    
    // Brand Header
    doc.setFontSize(24);
    doc.setTextColor(219, 39, 119); // Tailwind Pink-600
    doc.text("Bake With Joy", 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Customer Invoice", 14, 28);
    
    // Customer Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Bill To: ${order.customerName}`, 14, 42);
    doc.text(`Date: ${new Date(order.date).toLocaleDateString()}`, 14, 48);
    
    // The Pricing Table
    autoTable(doc, {
      startY: 56,
      headStyles: { fillColor: [219, 39, 119] },
      head: [['Description', 'Amount (Rs.)']],
      body: [
        [`Custom Cake: ${order.recipeName}`, order.baseRecipeCost.toFixed(2)],
        ['Labor & Preparation', order.laborCost.toFixed(2)],
        ['Packaging & Setup', order.packagingCost.toFixed(2)],
      ],
      foot: [['Total Amount Due', order.finalPrice.toFixed(2)]],
      footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    
    // Footer message
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for choosing Bake With Joy!", 14, finalY + 15);
    
    // Save the file cleanly
    const safeName = order.customerName.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Invoice_${safeName}.pdf`);
  };

  return (
    <div className="p-6 max-w-md mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-6 text-pink-600">Price Calculator</h1>
      
      {/* The Calculator Form */}
      <form onSubmit={saveOrder} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1 text-gray-700">Customer / Event Name</label>
          <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg" required placeholder="e.g. Sarah's Birthday" />
        </div>

        <div className="mb-4 border-b pb-4">
          <label className="block text-sm font-semibold mb-1 text-gray-700">Select Base Cake Recipe</label>
          <select value={selectedRecipeId} onChange={(e) => setSelectedRecipeId(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg bg-white" required>
            <option value="">Choose a recipe...</option>
            {savedRecipes.map((recipe: any) => (
              <option key={recipe.id} value={recipe.id}>{recipe.name} (Rs. {recipe.totalCost.toFixed(2)})</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1 text-gray-700">Labor Hours</label>
            <input type="number" step="0.5" value={laborHours} onChange={(e) => setLaborHours(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg" placeholder="2.5" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1 text-gray-700">Rate / Hr (Rs.)</label>
            <input type="number" value={laborRate} onChange={(e) => setLaborRate(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg" />
          </div>
        </div>

        <div className="flex gap-3 mb-4 border-b pb-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1 text-gray-700">Box & Boards (Rs.)</label>
            <input type="number" value={packagingCost} onChange={(e) => setPackagingCost(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg" placeholder="150" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1 text-gray-700">Profit Margin %</label>
            <input type="number" value={profitMargin} onChange={(e) => setProfitMargin(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg" />
          </div>
        </div>

        <div className="bg-pink-50 p-4 rounded-lg mb-6 border border-pink-100">
          <div className="flex justify-between text-sm mb-1 text-gray-600"><span>Raw Materials:</span> <span>Rs. {baseRecipeCost.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm mb-1 text-gray-600"><span>Labor:</span> <span>Rs. {calcLabor.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm mb-1 text-gray-600"><span>Packaging:</span> <span>Rs. {calcPackaging.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-xl text-pink-600 mt-3 border-t pt-2 border-pink-200">
            <span>Customer Price:</span> <span>Rs. {finalRetailPrice.toFixed(2)}</span>
          </div>
          <div className="text-right text-sm text-green-600 font-semibold mt-1">
            Est. Profit: Rs. {totalProfit.toFixed(2)}
          </div>
        </div>

        <button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-lg font-bold transition-colors">
          Save Order
        </button>
      </form>

      {/* The Order History & Invoice Section */}
      <div>
        <h2 className="text-xl font-bold mb-3 text-gray-800">Recent Orders</h2>
        {orderHistory.length === 0 ? (
          <p className="text-gray-500 italic">No orders saved yet.</p>
        ) : (
          <ul className="space-y-4 pb-8">
            {orderHistory.map((order: any) => (
              <li key={order.id} className="border p-4 rounded-xl bg-white shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{order.customerName}</h3>
                    <p className="text-sm text-gray-500">{order.recipeName}</p>
                  </div>
                  <span className="font-bold text-pink-600 text-lg">Rs. {order.finalPrice.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => generateInvoice(order)}
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white p-2 rounded-lg text-sm font-bold transition-colors flex justify-center items-center gap-2"
                >
                  📄 Download PDF Invoice
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}