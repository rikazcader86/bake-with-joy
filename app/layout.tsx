import './globals.css';
import Navigation from '../components/Navigation';

export const metadata = {
  title: 'Bake With Joy - Cake Costing & Bakery Management',
  description: 'Cake costing, recipe management, order calculation, and expense tracking',
  icons: {
    icon: '/logo.png',       
    apple: '/logo.png',      
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-gray-900 min-h-screen pt-20 pb-24 md:pb-12 antialiased selection:bg-pink-100 selection:text-pink-700">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}