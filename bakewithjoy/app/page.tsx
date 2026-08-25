"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("g");

  // This function listens to your Firebase database and loads your saved items
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "ingredients"), (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setIngredients(items);
    });
    return () => unsubscribe();
  }, []);

  // This function saves a new ingredient to the database and does the math
  const addIngredient = async (e) => {
    e.preventDefault();
    if (!name || !price || !qty) return;

    // Calculate how much 1 gram or 1 ml costs
    const costPerUnit = parseFloat(price) / parseFloat(qty);

    await addDoc(collection(db, "ingredients"), {
      name: name,
      purchasePrice: parseFloat(price),
      purchaseQty: parseFloat(qty),
      unit: unit,
      costPerUnit: costPerUnit
    });

    // Clear the form after saving
    setName("");
    setPrice("");
    setQty("");
  };

  return (
    <div className="p-6 max-w-md mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-6 text-pink-600">My Ingredients</h1>
      
      {/* The Form to add items */}
      <form onSubmit={addIngredient} className="mb-8 bg-pink-50 p-4 rounded-xl shadow-sm border border-pink-100">
        <div className="mb-3">
          <label className="block text-sm font-semibold mb-1 text-gray-700">Ingredient Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg" placeholder="e.g. Flour" required />
        </div>
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1 text-gray-700">Price (Rs.)</label>
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg" placeholder="300" required />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1 text-gray-700">Total Amount</label>
            <input type="number" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg" placeholder="1000" required />
          </div>
          <div className="w-20">
            <label className="block text-sm font-semibold mb-1 text-gray-700">Unit</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg bg-white">
              <option value="g">g</option>
              <option value="ml">ml</option>
              <option value="pcs">pcs</option>
            </select>
          </div>
        </div>
        <button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-lg font-bold transition-colors">
          Add to Pantry
        </button>
      </form>

      {/* The List of saved items */}
      <div>
        <h2 className="text-xl font-bold mb-3 text-gray-800">Saved in Pantry</h2>
        {ingredients.length === 0 ? (
          <p className="text-gray-500 italic">No ingredients added yet. Add your first one above!</p>
        ) : (
          <ul className="space-y-2">
            {ingredients.map((item) => (
              <li key={item.id} className="border p-3 rounded-lg flex justify-between items-center bg-white shadow-sm">
                <div>
                  <p className="font-bold text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-500">Bought: {item.purchaseQty}{item.unit} for Rs. {item.purchasePrice}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-pink-600">Rs. {item.costPerUnit.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">per {item.unit}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}