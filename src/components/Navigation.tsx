import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, Bot, Package, Bell, Globe } from 'lucide-react';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

function NavItem({ to, icon, label, count }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        isActive
          ? "bg-blue-100 text-blue-700"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      )}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
}

interface NavigationProps {
  jobsCount?: number;
  productsCount?: number;
  notificationsCount?: number;
  websitesCount?: number;
}

export function Navigation({ jobsCount = 0, productsCount = 0, notificationsCount = 0, websitesCount = 0 }: NavigationProps) {
  return (
    <nav className="space-y-1">
      <NavItem
        to="/"
        icon={<Home className="h-4 w-4" />}
        label="Dashboard"
      />
      <NavItem
        to="/jobs"
        icon={<Bot className="h-4 w-4" />}
        label="Scraping Jobs"
        count={jobsCount}
      />
      <NavItem
        to="/products"
        icon={<Package className="h-4 w-4" />}
        label="Product Monitoring"
        count={productsCount}
      />
      <NavItem
        to="/websites"
        icon={<Globe className="h-4 w-4" />}
        label="Website Sources"
        count={websitesCount}
      />
      <NavItem
        to="/notifications"
        icon={<Bell className="h-4 w-4" />}
        label="Notifications"
        count={notificationsCount}
      />
    </nav>
  );
}