import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
  return (
    <div className="min-h-screen bg-[#111111]">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1A1A',
            color: '#fff',
            border: '1px solid #2A2A2A',
          },
        }}
      />
      <Sidebar />
      <Header />
      <main className="ml-60 pt-16 min-h-screen p-6">
        <Outlet />
      </main>
    </div>
  );
}
