"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase"; 

export default function RecipesPage() {
  const [availableIngredients, setAvailableIngredients] = useState<any[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);

  const [recipeName, setRecipeName] = useState("");
  const [currentSelection, setCurrentSelection] = useState("");
  const [currentQty, setCurrentQty] = useState("");
  const [recipeItems, setRecipeItems] = useState<any[]>([]);

  useEffect(() => {
    const unsubIngredients = onSnapshot(collection(db, "ingredients"), (snapshot) => {
      setAvailableIngredients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubRecipes = onSnapshot(collection(db, "recipes"), (snapshot) => {
      setSavedRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubIngredients(); unsubRecipes(); };
  }, []);

  const addToRecipe = (e: any) => {
    e.preventDefault();
    if (!currentSelection || !currentQty) return;
    
    const ingredient = availableIngredients.find((ing: any) => ing.id === currentSelection);
    if (!ingredient) return;

    const cost = ingredient.costPerUnit * parseFloat(currentQty);

    setRecipeItems([...recipeItems, {
      ingredientId: ingredient.id,
      name: ingredient.name,
      qty: parseFloat(currentQty),
      unit: ingredient.unit,
      cost: cost
    }]);

    setCurrentSelection("");
    setCurrentQty("");
  };

  const saveRecipe = async () => {
    if (!recipeName || recipeItems.length === 0) return;

    const totalCost = recipeItems.reduce((sum: number, item: any) => sum + item.cost, 0);

    await addDoc(collection(db, "recipes"), {
      name: recipeName,
      items: recipeItems,
      totalCost: totalCost
    });

    setRecipeName("");
    setRecipeItems([]);
  };

  const currentTotalCost = recipeItems.reduce((sum: number, item: any) => sum + item.cost, 0);

  return (
    <div className="p-6 max-w-md mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-6 text-pink-600">My Recipes</h1>
      
      <div className="mb-8 bg-pink-50 p-4 rounded-xl shadow-sm border border-pink-100">
        <input 
          type="text" 
          value={recipeName} 
          onChange={(e) => setRecipeName(e.target.value)} 
          className="w-full border border-gray-300 p-2 rounded-lg mb-4 font-bold text-lg" 
          placeholder="Recipe Name (e.g., Vanilla Sponge)" 
        />
        
        <form onSubmit={addToRecipe} className="flex gap-2 mb-4">
          <select 
            value={currentSelection} 
            onChange={(e) => setCurrentSelection(e.target.value)} 
            className="flex-1 border border-gray-300 p-2 rounded-lg bg-white"
          >
            <option value="">Select Ingredient...</option>
            {availableIngredients.map((ing: any) => (
              <option key={ing.id} value={ing.id}>{ing.name}</option>
            ))}
          </select>
          <input 
            type="number" 
            value={currentQty} 
            onChange={(e) => setCurrentQty(e.target.value)} 
            className="w-20 border border-gray-300 p-2 rounded-lg" 
            placeholder="Qty" 
          />
          <button type="submit" className="bg-gray-800 text-white px-4 rounded-lg font-bold">+</button>
        </form>

        {recipeItems.length > 0 && (
          <div className="bg-white p-3 rounded-lg mb-4 border border-gray-200">
            <h3 className="font-bold text-sm mb-2 text-gray-700">Ingredients in this recipe:</h3>
            <ul className="space-y-1 mb-3">
              {recipeItems.map((item: any, index: number) => (
                 <li key={index} className="flex justify-between text-sm">
                   <span>{item.qty}{item.unit} {item.name}</span>
                   <span className="text-gray-600">Rs. {item.cost.toFixed(2)}</span>
                 </li>
              ))}
            </ul>
            <div className="border-t pt-2 flex justify-between font-bold text-pink-600">
              <span>Recipe Base Cost:</span>
              <span>Rs. {currentTotalCost.toFixed(2)}</span>
            </div>
          </div>
        )}
        
        <button 
          onClick={saveRecipe} 
          className="w-full bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-lg font-bold transition-colors"
        >
          Save Complete Recipe
        </button>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-3 text-gray-800">Saved Recipes</h2>
        {savedRecipes.length === 0 ? (
          <p className="text-gray-500 italic">No recipes yet. Build one above!</p>
        ) : (
          <ul className="space-y-3">
            {savedRecipes.map((recipe: any) => (
              <li key={recipe.id} className="border p-4 rounded-lg bg-white shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-lg text-gray-800">{recipe.name}</h3>
                  <span className="font-bold text-pink-600">Rs. {recipe.totalCost.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {recipe.items.map((i: any) => `${i.qty}${i.unit} ${i.name}`).join(", ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}