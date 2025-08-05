import { ExternalLink } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>App Design By</span>
            <a
              href="https://diamondinternet.co.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:text-primary/80 transition-colors flex items-center space-x-1"
            >
              <span>DiamondInternet</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
                          <div className="text-xs text-muted-foreground">
                  © 2024 EasyCryptoTax. All rights reserved.
                </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 