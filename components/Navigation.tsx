"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BookOpen, 
  ShoppingBasket, 
  ClipboardList, 
  Wallet, 
  Cake 
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Pantry", icon: ShoppingBasket, desc: "Ingredients & Stock" },
  { href: "/recipes", label: "Recipes", icon: BookOpen, desc: "Formulas & Batches" },
  { href: "/orders", label: "Orders", icon: ClipboardList, desc: "Pricing & Invoices" },
  { href: "/expenses", label: "Finance", icon: Wallet, desc: "Income & Expenses" },
];

export default function Navigation() {
  const pathname = usePathname();

  const getActiveTab = () => {
    if (pathname === "/recipes") return "Recipes";
    if (pathname === "/orders") return "Orders & Pricing";
    if (pathname === "/expenses") return "Finance & Expenses";
    return "Pantry & Ingredients";
  };

  return (
    <>
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-pink-100 h-16 z-30 transition-all">
        <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500 text-white flex items-center justify-center shadow-sm shadow-pink-200">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <Link href="/" className="text-lg sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-1.5 hover:text-pink-600 transition-colors">
                Bake With Joy
              </Link>
              <p className="text-xs text-pink-600 font-medium hidden sm:block">
                {getActiveTab()}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-gray-50/80 p-1.5 rounded-2xl border border-gray-200/70">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-pink-500 text-white shadow-sm shadow-pink-200"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/80 px-2 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-30">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                  isActive
                    ? "bg-pink-50 text-pink-600 font-bold"
                    : "text-gray-500 hover:text-gray-800 font-medium"
                }`}
              >
                <div className={`relative p-1 rounded-lg transition-transform ${isActive ? "scale-110" : ""}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
