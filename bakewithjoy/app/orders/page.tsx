"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function OrdersPage() {
  // We added <any[]> here so TypeScript knows this will hold data
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  
  const [laborHours, setLaborHours] = useState("");
  const [laborRate, setLaborRate] = useState("1000"); 
  const [packagingCost, setPackagingCost] = useState("");
  const [profitMargin, setProfitMargin] = useState("40"); 

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "recipes"), (snapshot) => {
      setSavedRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Added (r: any) to satisfy TypeScript
  const activeRecipe = savedRecipes.find((r: any) => r.id === selectedRecipeId);
  const baseRecipeCost = activeRecipe ? activeRecipe.totalCost : 0;

  const calcLabor = (parseFloat(laborHours) || 0) * (parseFloat(laborRate) || 0);
  const calcPackaging = parseFloat(packagingCost) || 0;
  
  const totalCost = baseRecipeCost + calcLabor + calcPackaging;
  const markupMultiplier = 1 + ((parseFloat(profitMargin) || 0) / 100);
  const finalRetailPrice = totalCost * markupMultiplier;
  const totalProfit = finalRetailPrice - totalCost;

  // Added (e: any) and a safety check for activeRecipe
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

  return (
    <div className="p-6 max-w-md mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-6 text-pink-600">Price Calculator</h1>
      
      <form onSubmit={saveOrder} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6">
        
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

        {/* The Live Calculation Box */}
        <div className="bg-pink-50 p-4 rounded-lg mb-6 border border-pink-100">
          <div className="flex justify-between text-sm mb-1 text-gray-600"><span>Raw Materials:</span> <span>Rs. {baseRecipeCost.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm mb-1 text-gray-600"><span>Labor:</span> <span>Rs. {calcLabor.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm mb-1 text-gray-600"><span>Packaging:</span> <span>Rs. {calcPackaging.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-gray-800 border-t pt-2 mt-2 border-gray-200">
            <span>Total Cost to Make:</span> <span>Rs. {totalCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-xl text-pink-600 mt-2">
            <span>Price for Customer:</span> <span>Rs. {finalRetailPrice.toFixed(2)}</span>
          </div>
          <div className="text-right text-sm text-green-600 font-semibold mt-1">
            Est. Profit: Rs. {totalProfit.toFixed(2)}
          </div>
        </div>

        <button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-lg font-bold transition-colors">
          Save Order Calculation
        </button>
      </form>
    </div>
  );
}