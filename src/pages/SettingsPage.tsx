import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Profile } from '@/types/transaction';
import { LogOut } from 'lucide-react';
import InfoTooltip from '@/components/ui/info-tooltip';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTheme } from '@/hooks/useTheme';

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setProfile(data as Profile);
        } else {
          // Create default profile if it doesn't exist
          const newProfile = {
            id: user.id,
            email: user.email,
            subscription_tier: 'free' as const,
            tax_jurisdiction: 'US',
            accounting_method: 'FIFO' as const
          };
          
          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

          if (createError) throw createError;
          setProfile(createdProfile as Profile);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          tax_jurisdiction: profile.tax_jurisdiction,
          accounting_method: profile.accounting_method,
          primary_exchange: profile.primary_exchange,
          currency_preference: profile.currency_preference
        })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and tax calculation preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Account Information</CardTitle>
                <InfoTooltip content="Your account details and subscription status. This information is used for billing and account management purposes." />
              </div>
              <CardDescription>
                Your account details and subscription status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subscription">Subscription Tier</Label>
                <Input
                  id="subscription"
                  value={profile?.subscription_tier === 'free' ? 'Free Plan' : 'Premium Plan'}
                  disabled
                  className="bg-muted"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tax Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tax Calculation Settings</CardTitle>
                <InfoTooltip content="Configure how your crypto taxes are calculated. These settings affect tax rates, allowances, and calculation methods used in your reports." />
              </div>
              <CardDescription>
                Configure how your taxes are calculated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jurisdiction">Tax Jurisdiction</Label>
                <Select
                  value={profile?.tax_jurisdiction || 'UK'}
                  onValueChange={(value) => setProfile(prev => prev ? { ...prev, tax_jurisdiction: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your tax jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="NL">Netherlands</SelectItem>
                    <SelectItem value="SE">Sweden</SelectItem>
                    <SelectItem value="NO">Norway</SelectItem>
                    <SelectItem value="DK">Denmark</SelectItem>
                    <SelectItem value="FI">Finland</SelectItem>
                    <SelectItem value="CH">Switzerland</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  This determines which tax rules, rates, and forms are used for calculations
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary-exchange">Primary Exchange</Label>
                <Select
                  value={profile?.primary_exchange || 'coinbase'}
                  onValueChange={(value) => setProfile(prev => prev ? { ...prev, primary_exchange: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your primary exchange" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coinbase">Coinbase</SelectItem>
                    <SelectItem value="coinbase_pro">Coinbase Pro</SelectItem>
                    <SelectItem value="binance">Binance</SelectItem>
                    <SelectItem value="bybit">Bybit</SelectItem>
                    <SelectItem value="kraken">Kraken</SelectItem>
                    <SelectItem value="kucoin">KuCoin</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="ftx">FTX</SelectItem>
                    <SelectItem value="crypto_com">Crypto.com</SelectItem>
                    <SelectItem value="etoro">eToro</SelectItem>
                    <SelectItem value="trading212">Trading 212</SelectItem>
                    <SelectItem value="revolut">Revolut</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  This helps optimize file parsing for your most used exchange format
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Preferred Currency</Label>
                <Select
                  value={profile?.currency_preference || 'GBP'}
                  onValueChange={(value) => setProfile(prev => prev ? { ...prev, currency_preference: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your preferred currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                    <SelectItem value="USD">US Dollar (USD)</SelectItem>
                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    <SelectItem value="CAD">Canadian Dollar (CAD)</SelectItem>
                    <SelectItem value="AUD">Australian Dollar (AUD)</SelectItem>
                    <SelectItem value="CHF">Swiss Franc (CHF)</SelectItem>
                    <SelectItem value="SEK">Swedish Krona (SEK)</SelectItem>
                    <SelectItem value="NOK">Norwegian Krone (NOK)</SelectItem>
                    <SelectItem value="DKK">Danish Krone (DKK)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  This affects how amounts are displayed and calculated in reports
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accounting-method">Accounting Method</Label>
                <Select
                  value={profile?.accounting_method || 'FIFO'}
                  onValueChange={(value) => setProfile(prev => prev ? { ...prev, accounting_method: value as 'FIFO' | 'LIFO' | 'Specific ID' } : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select accounting method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIFO">FIFO (First In, First Out)</SelectItem>
                    <SelectItem value="LIFO">LIFO (Last In, First Out)</SelectItem>
                    <SelectItem value="Specific ID">Specific ID</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  FIFO is the most common method and typically required for crypto in most jurisdictions
                </p>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Data Management</CardTitle>
                <InfoTooltip content="Manage your transaction data and reports. Export your data for backup or import into other tax software. Clear data to start fresh." />
              </div>
              <CardDescription>
                Manage your transaction data and reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Export All Data</h4>
                    <p className="text-sm text-muted-foreground">
                      Download all your transactions and tax calculations as CSV
                    </p>
                  </div>
                  <Button variant="outline">Export</Button>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Clear All Data</h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete all transactions and calculations
                    </p>
                  </div>
                  <Button variant="destructive">Clear Data</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Appearance</CardTitle>
                <InfoTooltip content="Customize the appearance of the application. Switch between light and dark themes to match your preference or system settings." />
              </div>
              <CardDescription>
                Customize the appearance of the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">Theme</h4>
                  <p className="text-sm text-muted-foreground">
                    Switch between light and dark themes
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground capitalize">{theme}</span>
                  <ThemeToggle />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Security</CardTitle>
                <InfoTooltip content="Manage your account security settings. Change your password or sign out of your account. Your data is encrypted and secure." />
              </div>
              <CardDescription>
                Manage your account security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Change Password</h4>
                    <p className="text-sm text-muted-foreground">
                      Update your account password
                    </p>
                  </div>
                  <Button variant="outline">Change</Button>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Sign Out</h4>
                    <p className="text-sm text-muted-foreground">
                      Sign out of your account
                    </p>
                  </div>
                  <Button variant="outline" onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SettingsPage;