import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Calculator, Settings, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navigationItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/upload', label: 'Upload' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/tax-report', label: 'Tax Report' },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <Calculator className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">EasyCryptoTax</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Button 
                key={item.path}
                variant={isActive(item.path) ? 'secondary' : 'ghost'} 
                asChild
              >
                <Link to={item.path}>
                  {item.label}
                </Link>
              </Button>
            ))}
            
            {user && (
              <>
                <Button 
                  variant={isActive('/settings') ? 'secondary' : 'ghost'} 
                  asChild
                >
                  <Link to="/settings">
                    Settings
                  </Link>
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme Toggle - Visible on all screen sizes */}
            <ThemeToggle />
            
            {/* Mobile/Tablet Menu Button */}
            <div className="lg:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <div className="flex flex-col space-y-4 mt-8">
                    {navigationItems.map((item) => (
                      <Button
                        key={item.path}
                        variant={isActive(item.path) ? 'secondary' : 'ghost'}
                        className="justify-start"
                        asChild
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Link to={item.path}>
                          {item.label}
                        </Link>
                      </Button>
                    ))}
                    
                    {user && (
                      <div className="border-t pt-4 mt-4">
                        <Button
                          variant="ghost"
                          className="justify-start w-full"
                          asChild
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Link to="/settings">
                            <Settings className="w-4 h-4 mr-3" />
                            Settings
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;