import './globals.css';
import Link from 'next/link';
import { BookOpen, ShoppingBasket, ClipboardList } from 'lucide-react';

export const metadata = {
  title: 'Bake With Joy',
  description: 'Cake costing and recipe management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 pb-20">
        
        {children}
        
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Link href="/" className="flex flex-col items-center text-gray-500 hover:text-pink-600 transition-colors">
            <ShoppingBasket size={24} />
            <span className="text-xs mt-1 font-medium">Ingredients</span>
          </Link>
          <Link href="/recipes" className="flex flex-col items-center text-gray-500 hover:text-pink-600 transition-colors">
            <BookOpen size={24} />
            <span className="text-xs mt-1 font-medium">Recipes</span>
          </Link>
          <Link href="/orders" className="flex flex-col items-center text-gray-500 hover:text-pink-600 transition-colors">
            <ClipboardList size={24} />
            <span className="text-xs mt-1 font-medium">Orders</span>
          </Link>
        </div>

      </body>
    </html>
  );
}