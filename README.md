# EasyCryptoTax

A comprehensive cryptocurrency tax calculation application built with modern web technologies.

## ⚠️ **Important Notice**

**Tax Calculation Accuracy**: The current tax calculation system is a simplified implementation and may not be fully compliant with all jurisdictions' tax laws. Users should verify calculations with qualified tax professionals before filing returns.

## 🚀 **Features**

### **Core Functionality**
- **Multi-Exchange Support**: Automatic import from Binance, Coinbase Pro, Bybit, and more
- **File Upload**: Drag & drop CSV, XLS, XLSX files with automatic format detection
- **International Date Support**: Automatic detection of various date formats (UK, US, European, ISO)
- **Transaction Management**: View, filter, and manage all cryptocurrency transactions
- **Real-time Processing**: Live file upload progress and transaction processing

### **Tax Calculation**
- **Multi-Jurisdiction Support**: UK, US, Canada, Australia, and European countries
- **Accounting Methods**: FIFO, LIFO, Specific ID
- **Capital Gains Tracking**: Automatic calculation of gains and losses
- **Tax Event Generation**: Detailed breakdown of taxable events
- **Annual Allowances**: Jurisdiction-specific tax-free allowances

### **User Experience**
- **Dark Mode**: Full light/dark theme toggle with system preference detection
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Intuitive Navigation**: Clean, modern interface with helpful tooltips
- **Real-time Feedback**: Toast notifications and progress indicators
- **Accessibility**: Screen reader friendly with proper ARIA labels

### **Data Management**
- **Secure Storage**: Supabase backend with encrypted data storage
- **User Authentication**: Secure login with email/password
- **Data Export**: Download transaction data and tax reports
- **File History**: Track uploaded files and processing status
- **Backup & Restore**: Export all data for backup purposes

### **Exchange Support**
- **Fully Supported**: Binance, Coinbase Pro, Bybit
- **Partial Support**: Kraken, KuCoin (basic format detection)
- **Generic Support**: Manual mapping for other exchanges
- **Format Detection**: Automatic column mapping and data parsing
- **Error Handling**: Robust error recovery and user feedback

### **Settings & Customization**
- **Tax Jurisdiction**: Select your country for appropriate tax rules
- **Currency Preferences**: Display amounts in your preferred currency
- **Primary Exchange**: Optimize parsing for your most-used exchange
- **Theme Preferences**: Light/dark mode with system detection
- **Account Management**: Profile settings and security options

## 🛠️ **Technologies Used**

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: Supabase for authentication and database
- **Build Tool**: Vite for fast development and optimized builds
- **Icons**: Lucide React for consistent iconography
- **State Management**: React hooks and context API
- **File Processing**: Papa Parse for CSV, XLSX for Excel files

## 📋 **Prerequisites**

- Node.js 18+ 
- npm or yarn
- Supabase account (for backend services)

## 🚀 **Quick Start**

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/easycryptotax.git
   cd easycryptotax
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Add your Supabase credentials to `.env.local`

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:8080`

## 📁 **Project Structure**

```
easycryptotax/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── auth/           # Authentication components
│   │   ├── layout/         # Layout components (Navbar, Footer)
│   │   ├── ui/             # shadcn/ui components
│   │   └── upload/         # File upload components
│   ├── hooks/              # Custom React hooks
│   ├── integrations/       # External service integrations
│   ├── lib/                # Utility functions and helpers
│   ├── pages/              # Main application pages
│   └── types/              # TypeScript type definitions
├── public/                 # Static assets
├── supabase/               # Database migrations and config
└── docs/                   # Documentation
```

## 🔧 **Configuration**

### **Environment Variables**
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **Supabase Setup**
1. Create a new Supabase project
2. Run the database migrations in `supabase/migrations/`
3. Set up storage buckets for file uploads
4. Configure authentication settings

## 📊 **Supported Exchanges**

| Exchange | Status | Format Detection |
|----------|--------|------------------|
| Binance | ✅ Full | Automatic |
| Coinbase Pro | ✅ Full | Automatic |
| Bybit | ✅ Full | Automatic |
| Kraken | ⚠️ Partial | Basic |
| KuCoin | ⚠️ Partial | Basic |
| Other | 🔧 Manual | User mapping |

## 🌍 **Supported Jurisdictions**

- **United Kingdom**: Capital Gains Tax with annual allowance
- **United States**: Short-term and long-term capital gains
- **Canada**: Capital gains with 50% inclusion rate
- **Australia**: Capital gains with CGT discount
- **European Countries**: Various capital gains tax systems

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **App Design**: [DiamondInternet](https://diamondinternet.co.uk/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide](https://lucide.dev/)
- **Backend**: [Supabase](https://supabase.com/)

## 📞 **Support**

For support, please contact our team with your specific issue and exchange details.

---

**Disclaimer**: This application is for educational and informational purposes. Tax calculations should be verified by qualified tax professionals before filing returns.
