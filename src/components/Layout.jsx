import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';

function Layout({ children, title }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main layout right-side wrapper */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <TopNavbar title={title} />
        
        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
