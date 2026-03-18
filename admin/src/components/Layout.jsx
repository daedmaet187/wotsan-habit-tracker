import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Activity,
  BarChart2,
  ChevronRight,
  ChevronsUpDown,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Moon,
  PanelLeft,
  Settings,
  Sun,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/habits', label: 'Habits', icon: ListChecks },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/activity', label: 'Activity', icon: Activity },
];

function NavItem({ to, label, icon: Icon, collapsed }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link to={to}>
      <div
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
          collapsed && 'justify-center px-2',
          active
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{label}</span>}
      </div>
    </Link>
  );
}

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const crumb = navItems.find((n) => n.to === location.pathname)?.label ?? 'Dashboard';

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r bg-background transition-all duration-200',
          collapsed ? 'w-14' : 'w-56'
        )}
      >
        {/* Brand */}
        <div className={cn('flex items-center gap-2 border-b px-4 py-[14px]', collapsed && 'justify-center px-2')}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold select-none">
            H
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">Habit Tracker</p>
              <p className="truncate text-xs text-muted-foreground leading-tight">Admin</p>
            </div>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex-1 space-y-0.5 p-2 pt-3">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Settings pinned */}
        <div className="border-t p-2 space-y-0.5">
          <Link to="/settings">
            <div
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Settings</span>}
            </div>
          </Link>
        </div>

        {/* User */}
        <div className="border-t p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent transition-colors',
                  collapsed && 'justify-center'
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">A</AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">Admin</p>
                      <p className="truncate text-xs text-muted-foreground leading-tight">admin@habittracker</p>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-52">
              <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed((c) => !c)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <nav className="flex flex-1 items-center gap-1 text-sm text-muted-foreground">
            <span>Admin</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{crumb}</span>
          </nav>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
