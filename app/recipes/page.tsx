"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, addDoc, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase"; 
import { 
  Trash2, 
  X, 
  Plus, 
  Search, 
  BookOpen, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Copy,
  Calculator,
  Check
} from "lucide-react";
import { ConfirmDialog } from "../../components/Modal";

interface RecipeItem {
  ingredientId: string;
  name: string;
  qty: number;
  unit: string;
  cost: number;
}

interface AvailableIngredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
}

interface SavedRecipe {
  id: string;
  name: string;
  items: RecipeItem[];
  totalCost: number;
}

export default function RecipesPage() {
  const [availableIngredients, setAvailableIngredients] = useState<AvailableIngredient[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);

  // Draft Recipe Builder State
  const [recipeName, setRecipeName] = useState("");
  const [currentSelection, setCurrentSelection] = useState("");
  const [currentQty, setCurrentQty] = useState("");
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [recipeMultipliers, setRecipeMultipliers] = useState<{ [id: string]: number }>({});

  // Deletion State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubIngredients = onSnapshot(collection(db, "ingredients"), (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AvailableIngredient));
      items.sort((a, b) => a.name.localeCompare(b.name));
      setAvailableIngredients(items);
    });
    const unsubRecipes = onSnapshot(collection(db, "recipes"), (snapshot) => {
      const recipes = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SavedRecipe));
      recipes.sort((a, b) => a.name.localeCompare(b.name));
      setSavedRecipes(recipes);
    });
    return () => { unsubIngredients(); unsubRecipes(); };
  }, []);

  const selectedIngredient = availableIngredients.find((ing) => ing.id === currentSelection);
  const draftItemCost = (selectedIngredient && parseFloat(currentQty) && parseFloat(currentQty) > 0)
    ? selectedIngredient.costPerUnit * parseFloat(currentQty)
    : 0;

  const addToRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelection || !currentQty) return;
    
    if (!selectedIngredient) return;
    const numQty = parseFloat(currentQty);
    if (isNaN(numQty) || numQty <= 0) return;

    const cost = selectedIngredient.costPerUnit * numQty;

    // Check if ingredient already exists in draft, if so sum it
    const existingIndex = recipeItems.findIndex(i => i.ingredientId === selectedIngredient.id);
    if (existingIndex >= 0) {
      const updated = [...recipeItems];
      updated[existingIndex].qty += numQty;
      updated[existingIndex].cost += cost;
      setRecipeItems(updated);
    } else {
      setRecipeItems([...recipeItems, {
        ingredientId: selectedIngredient.id,
        name: selectedIngredient.name,
        qty: numQty,
        unit: selectedIngredient.unit,
        cost: cost
      }]);
    }

    setCurrentSelection("");
    setCurrentQty("");
  };

  const removeDraftItem = (indexToRemove: number) => {
    setRecipeItems(recipeItems.filter((_, index) => index !== indexToRemove));
  };

  const saveRecipe = async () => {
    if (!recipeName.trim() || recipeItems.length === 0) return;

    const totalCost = recipeItems.reduce((sum, item) => sum + item.cost, 0);

    await addDoc(collection(db, "recipes"), {
      name: recipeName.trim(),
      items: recipeItems,
      totalCost: totalCost
    });

    setRecipeName("");
    setRecipeItems([]);
    setIsBuilderOpen(false);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteDoc(doc(db, "recipes", deletingId));
      setDeletingId(null);
    }
  };

  const duplicateToDraft = (recipe: SavedRecipe) => {
    setRecipeName(`${recipe.name} (Copy)`);
    setRecipeItems([...recipe.items]);
    setIsBuilderOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleMultiplier = (recipeId: string, factor: number) => {
    setRecipeMultipliers(prev => ({
      ...prev,
      [recipeId]: prev[recipeId] === factor ? 1 : factor
    }));
  };

  const currentTotalCost = recipeItems.reduce((sum, item) => sum + item.cost, 0);

  const filteredRecipes = useMemo(() => {
    return savedRecipes.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.items?.some(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [savedRecipes, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span>Recipes & Formulations</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Build base cake formulas and auto-calculate recipe production costs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsBuilderOpen(!isBuilderOpen)}
          className="flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 active:scale-98 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm shadow-pink-200 transition-all w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isBuilderOpen ? "Close Builder" : "New Recipe"}</span>
        </button>
      </div>

      {/* Recipe Builder Form */}
      {isBuilderOpen && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-pink-200 shadow-sm animate-in fade-in zoom-in-98 duration-150 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span>Recipe Builder</span>
            </h2>
            <span className="text-xs text-pink-600 bg-pink-50 font-bold px-2.5 py-1 rounded-full">
              Live Cost Breakdown
            </span>
          </div>

          {/* Recipe Name Input */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Recipe Name
            </label>
            <input 
              type="text" 
              value={recipeName} 
              onChange={(e) => setRecipeName(e.target.value)} 
              className="w-full border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 p-2.5 rounded-xl font-bold text-base bg-white text-gray-900" 
              placeholder="e.g. 8-inch Chocolate Fudge Sponge, Buttercream Frosting" 
              required
            />
          </div>

          {/* Add Ingredient to Recipe Row */}
          <div className="bg-pink-50/50 p-4 rounded-xl border border-pink-100/80">
            <label className="block text-xs font-bold text-pink-900 uppercase tracking-wider mb-2">
              Add Ingredient from Pantry
            </label>
            
            {availableIngredients.length === 0 ? (
              <p className="text-xs text-pink-700 italic">
                No ingredients found in pantry. Please add ingredients in the Pantry tab first.
              </p>
            ) : (
              <form onSubmit={addToRecipe} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-7">
                    <select 
                      value={currentSelection} 
                      onChange={(e) => setCurrentSelection(e.target.value)} 
                      className="w-full border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 p-2.5 rounded-xl bg-white text-sm font-medium text-gray-900"
                    >
                      <option value="">Choose an ingredient...</option>
                      {availableIngredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} (Rs. {ing.costPerUnit.toFixed(2)}/{ing.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.1"
                        min="0.1"
                        value={currentQty} 
                        onChange={(e) => setCurrentQty(e.target.value)} 
                        className="w-full border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 p-2.5 rounded-xl bg-white text-sm text-gray-900 pr-10" 
                        placeholder="Quantity" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                        {selectedIngredient?.unit || "unit"}
                      </span>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <button 
                      type="submit" 
                      disabled={!currentSelection || !currentQty}
                      className="w-full bg-gray-900 hover:bg-black disabled:opacity-50 text-white p-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Instant Cost calculation badge */}
                {draftItemCost > 0 && (
                  <div className="text-xs font-semibold text-pink-700 bg-pink-100/70 px-3 py-1.5 rounded-lg flex items-center justify-between">
                    <span>{currentQty} {selectedIngredient?.unit} of {selectedIngredient?.name}:</span>
                    <span className="font-bold">Rs. {draftItemCost.toFixed(2)}</span>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Draft Ingredients Table */}
          {recipeItems.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex justify-between items-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                <span>Ingredient ({recipeItems.length})</span>
                <span>Cost</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {recipeItems.map((item, index) => (
                  <li key={index} className="p-3 flex justify-between items-center text-sm hover:bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => removeDraftItem(index)} 
                        className="text-gray-300 hover:text-red-500 p-1 rounded-md transition-colors"
                        title="Remove ingredient"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <span className="font-medium text-gray-800">
                        {item.qty} {item.unit} <span className="text-gray-900 font-bold">{item.name}</span>
                      </span>
                    </div>
                    <span className="font-bold text-gray-700">Rs. {item.cost.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              
              <div className="bg-pink-50 p-4 border-t border-pink-100 flex justify-between items-center">
                <span className="font-bold text-gray-700 text-sm">Total Recipe Base Cost:</span>
                <span className="font-black text-pink-600 text-lg">Rs. {currentTotalCost.toFixed(2)}</span>
              </div>
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <button 
              type="button"
              onClick={saveRecipe} 
              disabled={!recipeName.trim() || recipeItems.length === 0}
              className="flex-1 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white p-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Save Complete Recipe</span>
            </button>
            <button 
              type="button"
              onClick={() => {
                setIsBuilderOpen(false);
                setRecipeItems([]);
                setRecipeName("");
              }}
              className="px-4 py-3 border border-gray-300 hover:bg-gray-100 rounded-xl text-sm font-semibold text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search recipes */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved recipes by name or ingredient..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all"
          />
        </div>
      </div>

      {/* Saved Recipes List */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {filteredRecipes.length} {filteredRecipes.length === 1 ? "Recipe" : "Recipes"} Available
          </p>
        </div>

        {filteredRecipes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-700 font-bold">No recipes found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery ? "Try searching for a different recipe name" : "Click 'New Recipe' above to create your first cake formulation"}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredRecipes.map((recipe) => {
              const isExpanded = expandedRecipeId === recipe.id;
              const multiplier = recipeMultipliers[recipe.id] || 1;
              const scaledCost = recipe.totalCost * multiplier;

              return (
                <div
                  key={recipe.id}
                  className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden transition-all hover:border-pink-200"
                >
                  {/* Card Header */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{recipe.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {recipe.items?.length || 0} ingredients included
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="text-right">
                        <div className="text-lg font-black text-pink-600">
                          Rs. {scaledCost.toFixed(2)}
                        </div>
                        {multiplier !== 1 && (
                          <div className="text-[10px] text-gray-400 font-medium">
                            Base: Rs. {recipe.totalCost.toFixed(2)} ({multiplier}x Batch)
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <button
                        type="button"
                        onClick={() => duplicateToDraft(recipe)}
                        className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors"
                        title="Duplicate & Edit Recipe"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingId(recipe.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete Recipe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedRecipeId(isExpanded ? null : recipe.id)}
                        className="p-2 text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                        title={isExpanded ? "Collapse" : "View Ingredients"}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Batch Scale Multipliers */}
                  <div className="px-4 sm:px-5 py-2.5 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap text-xs">
                    <span className="font-bold text-gray-600 flex items-center gap-1">
                      <Calculator className="w-3.5 h-3.5 text-pink-500" />
                      <span>Batch Scaling:</span>
                    </span>
                    <div className="flex gap-1.5">
                      {[0.5, 1, 1.5, 2, 3].map((factor) => (
                        <button
                          key={factor}
                          type="button"
                          onClick={() => toggleMultiplier(recipe.id, factor)}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                            multiplier === factor
                              ? "bg-pink-600 text-white shadow-xs"
                              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {factor}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Expanded Breakdown */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 border-t border-gray-100 bg-pink-50/20 space-y-2 animate-in fade-in duration-100">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Formula Ingredients Breakdown ({multiplier}x)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {recipe.items?.map((item, idx) => (
                          <div key={idx} className="bg-white p-2.5 rounded-xl border border-gray-200/80 flex justify-between items-center text-xs">
                            <span className="text-gray-800 font-medium">
                              {(item.qty * multiplier).toFixed(item.unit === "pcs" ? 0 : 1)} {item.unit} {item.name}
                            </span>
                            <span className="font-bold text-pink-700">
                              Rs. {(item.cost * multiplier).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
        title="Delete Recipe"
        message="Are you sure you want to delete this recipe formula? Saved past orders will not be affected."
        confirmText="Delete"
      />
    </div>
  );
}
