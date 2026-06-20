import { useLocation } from 'react-router-dom';
import { Menu, Sun, Moon, Bell } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/invoices': 'Invoices',
  '/invoices/new': 'Create Invoice',
  '/proposals': 'Proposals',
  '/proposals/new': 'Create Proposal',
  '/clients': 'Clients',
  '/settings': 'Settings',
};

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { isDark, toggleTheme } = useTheme();
  const { pathname } = useLocation();

  const getTitle = () => {
    if (pageTitles[pathname]) return pageTitles[pathname];
    if (pathname.includes('/invoices/') && pathname.includes('/edit')) return 'Edit Invoice';
    if (pathname.includes('/proposals/') && pathname.includes('/edit')) return 'Edit Proposal';
    if (pathname.includes('/invoices/')) return 'Invoice Details';
    if (pathname.includes('/proposals/')) return 'Proposal Details';
    if (pathname.includes('/clients/')) return 'Client Details';
    return 'ClientFlow';
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-gray-900 dark:text-white text-lg">{getTitle()}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
