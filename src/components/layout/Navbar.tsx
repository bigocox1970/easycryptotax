import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Calculator, FileText, TrendingUp, Settings, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <Calculator className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">CryptoTax Pro</span>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            <Button 
              variant={isActive('/') ? 'secondary' : 'ghost'} 
              asChild
            >
              <Link to="/">Dashboard</Link>
            </Button>
            <Button 
              variant={isActive('/upload') ? 'secondary' : 'ghost'} 
              asChild
            >
              <Link to="/upload">
                <FileText className="w-4 h-4 mr-2" />
                Upload
              </Link>
            </Button>
            <Button 
              variant={isActive('/transactions') ? 'secondary' : 'ghost'} 
              asChild
            >
              <Link to="/transactions">Transactions</Link>
            </Button>
            <Button 
              variant={isActive('/tax-report') ? 'secondary' : 'ghost'} 
              asChild
            >
              <Link to="/tax-report">
                <TrendingUp className="w-4 h-4 mr-2" />
                Tax Report
              </Link>
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;