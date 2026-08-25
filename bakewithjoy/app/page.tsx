"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const COMMON_INGREDIENTS = [
  "All-Purpose Flour",
  "Cake Flour",
  "White Sugar",
  "Brown Sugar",
  "Icing Sugar",
  "Unsalted Butter",
  "Salted Butter",
  "Margarine",
  "Eggs",
  "Milk",
  "Heavy Cream",
  "Whipping Cream",
  "Cocoa Powder",
  "Baking Powder",
  "Baking Soda",
  "Vanilla Extract",
  "Vanilla Essence",
  "Salt",
  "Vegetable Oil",
  "Dark Chocolate",
  "Milk Chocolate",
  "White Chocolate",
  "Fondant",
  "Food Coloring",
  "Almond Flour",
  "Cream Cheese"
].sort();

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("g");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "ingredients"), (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setIngredients(items);
    });
    return () => unsubscribe();
  }, []);

  const addIngredient = async (e: any) => {
    e.preventDefault();
    if (!name || !price || !qty) return;

    const costPerUnit = parseFloat(price) / parseFloat(qty);

    await addDoc(collection(db, "ingredients"), {
      name: name,
      purchasePrice: parseFloat(price),
      purchaseQty: parseFloat(qty),
      unit: unit,
      costPerUnit: costPerUnit
    });

    setName("");
    setPrice("");
    setQty("");
  };

  return (
    <div className="p-6 max-w-md mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-6 text-pink-600">My Ingredients</h1>
      
      <form onSubmit={addIngredient} className="mb-8 bg-pink-50 p-4 rounded-xl shadow-sm border border-pink-100">
        <div className="mb-3">
          <label className="block text-sm font-semibold mb-1 text-gray-700">Ingredient Name</label>
          {/* We use an input with a 'list' attribute to link it to the datalist below */}
          <input 
            list="common-ingredients"
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="w-full border border-gray-300 p-2 rounded-lg bg-white" 
            placeholder="Select or type a new ingredient..."
            required 
          />
          {/* The datalist holds our suggestions, but doesn't force you to pick them */}
          <datalist id="common-ingredients">
            {COMMON_INGREDIENTS.map((ing) => (
              <option key={ing} value={ing} />
            ))}
          </datalist>
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

      <div>
        <h2 className="text-xl font-bold mb-3 text-gray-800">Saved in Pantry</h2>
        {ingredients.length === 0 ? (
          <p className="text-gray-500 italic">No ingredients added yet. Add your first one above!</p>
        ) : (
          <ul className="space-y-2 pb-8">
            {ingredients.map((item: any) => (
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