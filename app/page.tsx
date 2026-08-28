"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { 
  Trash2, 
  Plus, 
  Search, 
  AlertTriangle, 
  Sparkles, 
  Edit3, 
  ShoppingBag, 
  Check
} from "lucide-react";
import { Modal, ConfirmDialog } from "../components/Modal";

const COMMON_PRESETS = [
  { name: "All-Purpose Flour", unit: "g", defaultQty: 1000 },
  { name: "White Sugar", unit: "g", defaultQty: 1000 },
  { name: "Unsalted Butter", unit: "g", defaultQty: 500 },
  { name: "Eggs", unit: "pcs", defaultQty: 12 },
  { name: "Milk", unit: "ml", defaultQty: 1000 },
  { name: "Cocoa Powder", unit: "g", defaultQty: 250 },
  { name: "Vanilla Extract", unit: "ml", defaultQty: 100 },
  { name: "Baking Powder", unit: "g", defaultQty: 100 },
  { name: "Cream Cheese", unit: "g", defaultQty: 250 },
  { name: "Whipping Cream", unit: "ml", defaultQty: 500 },
  { name: "Dark Chocolate", unit: "g", defaultQty: 500 },
  { name: "Icing Sugar", unit: "g", defaultQty: 1000 },
];

interface Ingredient {
  id: string;
  name: string;
  purchasePrice: number;
  purchaseQty: number;
  currentQty?: number;
  unit: string;
  costPerUnit: number;
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("g");
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUnit, setFilterUnit] = useState("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Edit Stock State
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  const [editStockValue, setEditStockValue] = useState("");

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form open state for mobile collapsible
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "ingredients"), (snapshot) => {
      const items: Ingredient[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Ingredient, "id">) });
      });
      // Sort alphabetically by default
      items.sort((a, b) => a.name.localeCompare(b.name));
      setIngredients(items);
    });
    return () => unsubscribe();
  }, []);

  const addIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !qty) return;

    const numPrice = parseFloat(price);
    const numQty = parseFloat(qty);
    if (isNaN(numPrice) || isNaN(numQty) || numQty <= 0) return;

    const costPerUnit = numPrice / numQty;

    await addDoc(collection(db, "ingredients"), {
      name: name.trim(),
      purchasePrice: numPrice,
      purchaseQty: numQty,
      currentQty: numQty,
      unit: unit,
      costPerUnit: costPerUnit
    });

    setName("");
    setPrice("");
    setQty("");
    setIsFormOpen(false);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteDoc(doc(db, "ingredients", deletingId));
      setDeletingId(null);
    }
  };

  const handleQuickAdjust = async (item: Ingredient, delta: number) => {
    const current = item.currentQty !== undefined ? item.currentQty : item.purchaseQty;
    const newQty = Math.max(0, current + delta);
    await updateDoc(doc(db, "ingredients", item.id), { currentQty: newQty });
  };

  const handleSaveStockModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const val = parseFloat(editStockValue);
    if (!isNaN(val) && val >= 0) {
      await updateDoc(doc(db, "ingredients", editingItem.id), { currentQty: val });
    }
    setEditingItem(null);
  };

  const selectPreset = (preset: typeof COMMON_PRESETS[0]) => {
    setName(preset.name);
    setUnit(preset.unit);
    setQty(preset.defaultQty.toString());
    setIsFormOpen(true);
  };

  // Filtered List
  const filteredIngredients = useMemo(() => {
    return ingredients.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesUnit = filterUnit === "all" || item.unit === filterUnit;
      const currentStock = item.currentQty !== undefined ? item.currentQty : item.purchaseQty;
      const isLowStock = currentStock <= (item.purchaseQty * 0.2);
      if (showLowStockOnly && !isLowStock) return false;
      return matchesSearch && matchesUnit;
    });
  }, [ingredients, searchQuery, filterUnit, showLowStockOnly]);

  // Live Unit Cost calculation for the form
  const liveCost = (parseFloat(price) && parseFloat(qty) && parseFloat(qty) > 0)
    ? (parseFloat(price) / parseFloat(qty)).toFixed(2)
    : null;

  return (
    <div className="space-y-6">
      
      {/* Header section with quick stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span>Pantry & Ingredients</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track ingredients, unit costs, and live stock levels effortlessly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 active:scale-98 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm shadow-pink-200 transition-all w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{isFormOpen ? "Close Form" : "Add Ingredient"}</span>
          </button>
        </div>
      </div>

      {/* Collapsible / Expanding Add Form */}
      {isFormOpen && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-pink-200 shadow-sm animate-in fade-in zoom-in-98 duration-150">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span>New Ingredient</span>
            </h2>
            <span className="text-xs text-pink-600 bg-pink-50 font-semibold px-2.5 py-1 rounded-full">
              Auto Cost Calculation
            </span>
          </div>

          {/* Quick presets row */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Quick Fill Baking Essentials
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none text-xs">
              {COMMON_PRESETS.slice(0, 8).map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => selectPreset(preset)}
                  className="shrink-0 bg-gray-50 hover:bg-pink-50 hover:text-pink-600 border border-gray-200 hover:border-pink-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  + {preset.name}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={addIngredient} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Ingredient Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 p-2.5 rounded-xl text-gray-900 bg-white transition-all text-sm"
                placeholder="e.g. Dutch Cocoa Powder, All-Purpose Flour"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Purchase Price (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 p-2.5 rounded-xl text-gray-900 bg-white transition-all text-sm"
                  placeholder="e.g. 450"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Package Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 p-2.5 rounded-xl text-gray-900 bg-white transition-all text-sm"
                  placeholder="e.g. 1000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 p-2.5 rounded-xl text-gray-900 bg-white transition-all text-sm font-medium"
                >
                  <option value="g">Grams (g)</option>
                  <option value="ml">Milliliters (ml)</option>
                  <option value="pcs">Pieces (pcs / eggs)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="l">Liters (l)</option>
                </select>
              </div>
            </div>

            {liveCost && (
              <div className="bg-pink-50/80 border border-pink-100 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs font-bold text-pink-700">Calculated Unit Cost:</span>
                <span className="text-sm font-black text-pink-700">
                  Rs. {liveCost} <span className="text-xs font-normal">per {unit}</span>
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 bg-pink-600 hover:bg-pink-700 text-white p-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save to Pantry</span>
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

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pantry ingredients..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all"
            />
          </div>

          {/* Unit Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["all", "g", "ml", "pcs"].map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setFilterUnit(u)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors uppercase ${
                  filterUnit === u
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {u === "all" ? "All Units" : u}
              </button>
            ))}
            
            <button
              type="button"
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                showLowStockOnly
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Low Stock</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ingredients Grid / List */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {filteredIngredients.length} {filteredIngredients.length === 1 ? "Item" : "Items"} in Stock
          </p>
        </div>

        {filteredIngredients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
            <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-700 font-bold">No ingredients found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery ? "Try clearing your search query" : "Click 'Add Ingredient' to add your pantry staples"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredIngredients.map((item) => {
              const currentStock = item.currentQty !== undefined ? item.currentQty : item.purchaseQty;
              const isLowStock = currentStock <= (item.purchaseQty * 0.2);
              const step = item.unit === "pcs" ? 1 : item.unit === "g" || item.unit === "ml" ? 50 : 0.5;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-4 border transition-all shadow-xs flex flex-col justify-between ${
                    isLowStock ? "border-amber-300 ring-1 ring-amber-200/50" : "border-gray-200/90 hover:border-pink-200"
                  }`}
                >
                  {/* Top: Name, Price, and Delete */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-900 text-base">{item.name}</h3>
                          {isLowStock && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" /> Low Stock
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Package: {item.purchaseQty} {item.unit} for Rs. {item.purchasePrice.toFixed(2)}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-pink-600">
                          Rs. {item.costPerUnit.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium">
                          per {item.unit}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Stock Controller */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 bg-gray-50/70 p-2.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-700">Stock:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setEditStockValue(currentStock.toString());
                        }}
                        className="flex items-center gap-1 bg-white border border-gray-300 hover:border-pink-400 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-800 transition-colors shadow-2xs"
                        title="Click to edit stock level"
                      >
                        <span>{currentStock} {item.unit}</span>
                        <Edit3 className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>

                    {/* Quick Stepper Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleQuickAdjust(item, -step)}
                        className="w-7 h-7 bg-white hover:bg-gray-100 active:scale-95 border border-gray-200 text-gray-700 rounded-lg flex items-center justify-center font-bold text-xs transition-transform"
                        title={`Deduct ${step}${item.unit}`}
                      >
                        -{step}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAdjust(item, step)}
                        className="w-7 h-7 bg-white hover:bg-gray-100 active:scale-95 border border-gray-200 text-gray-700 rounded-lg flex items-center justify-center font-bold text-xs transition-transform"
                        title={`Add ${step}${item.unit}`}
                      >
                        +{step}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setDeletingId(item.id)}
                        className="w-7 h-7 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors ml-1"
                        aria-label="Delete ingredient"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Stock Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title={`Update Stock: ${editingItem?.name}`}
      >
        {editingItem && (
          <form onSubmit={handleSaveStockModal} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Current Stock Level ({editingItem.unit})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editStockValue}
                onChange={(e) => setEditStockValue(e.target.value)}
                className="w-full border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 p-2.5 rounded-xl text-lg font-bold text-gray-900 bg-white"
                required
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">
                Initial package size was {editingItem.purchaseQty} {editingItem.unit}.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-xl shadow-xs"
              >
                Save Stock
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title="Delete Ingredient"
        message="Are you sure you want to remove this ingredient from your pantry? This cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
}
