import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Users,
  Coins,
  Code,
  Settings,
  Home,
  ArrowLeft,
  Key,
  RefreshCw,
  ExternalLink,
  Search,
  Ban,
  ShieldOff,
  Plus,
  Trash2,
  Save,
  DollarSign,
  Package,
} from 'lucide-react';
import { apiClient } from '@/api/client';
import {
  Navbar,
  Tabs,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  StatCard,
  Button,
  Input,
  Modal,
  LoadingSpinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const TitleDetail: React.FC = () => {
  const { titleId } = useParams<{ titleId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: titleResponse, isLoading: titleLoading } = useQuery({
    queryKey: ['title', titleId],
    queryFn: () => apiClient.getTitle(titleId!),
    enabled: !!titleId,
  });

  const { data: statsResponse } = useQuery({
    queryKey: ['title-stats', titleId],
    queryFn: () => apiClient.getTitleStats(titleId!),
    enabled: !!titleId,
  });

  const title = titleResponse?.data;
  const stats = statsResponse?.data;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Home className="h-4 w-4" /> },
    { id: 'players', label: 'Players', icon: <Users className="h-4 w-4" /> },
    { id: 'economy', label: 'Economy', icon: <Coins className="h-4 w-4" /> },
    { id: 'cloudscript', label: 'CloudScript', icon: <Code className="h-4 w-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  if (titleLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!title) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-dark-400">Title not found</p>
          <Button variant="primary" onClick={() => navigate('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-dark-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white">{title.name}</h1>
              {title.description && (
                <p className="text-dark-400 mt-1">{title.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs}>
          {(activeTab) => (
            <>
              {activeTab === 'overview' && <OverviewTab title={title} stats={stats} />}
              {activeTab === 'players' && <PlayersTab titleId={titleId!} />}
              {activeTab === 'economy' && <EconomyTab titleId={titleId!} />}
              {activeTab === 'cloudscript' && <CloudScriptTab titleId={titleId!} title={title} />}
              {activeTab === 'analytics' && <AnalyticsTab titleId={titleId!} title={title} />}
              {activeTab === 'settings' && <SettingsTab title={title} />}
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

// Overview Tab
const OverviewTab: React.FC<{ title: any; stats: any }> = ({ title, stats }) => {
  const queryClient = useQueryClient();

  const regenerateKeyMutation = useMutation({
    mutationFn: () => apiClient.regenerateApiKey(title.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['title', title.id] });
      toast.success('API key regenerated successfully!');
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleRegenerateKey = () => {
    if (
      window.confirm(
        'Are you sure you want to regenerate the API key? This will invalidate the current key.'
      )
    ) {
      regenerateKeyMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Players"
            value={stats.totalPlayers || 0}
            icon={Users}
            iconBgColor="bg-blue-500"
          />
          <StatCard
            title="Active Players"
            value={stats.activePlayers || 0}
            icon={Users}
            iconBgColor="bg-green-500"
          />
          <StatCard
            title="New Today"
            value={stats.newPlayersToday || 0}
            icon={Users}
            iconBgColor="bg-purple-500"
          />
          <StatCard
            title="API Calls (24h)"
            value={stats.apiCalls24h || 0}
            icon={BarChart3}
            iconBgColor="bg-orange-500"
          />
        </div>
      )}

      {/* API Keys */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>API Credentials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-dark-400 block mb-2">Title ID</label>
                <div className="flex items-center justify-between bg-dark-900 px-4 py-3 rounded border border-dark-700">
                  <code className="text-sm text-primary-400 truncate flex-1">
                    {title.id}
                  </code>
                  <button
                    onClick={() => copyToClipboard(title.id, 'Title ID')}
                    className="text-dark-400 hover:text-white ml-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-dark-400 block mb-2">Secret Key</label>
                <div className="flex items-center justify-between bg-dark-900 px-4 py-3 rounded border border-dark-700">
                  <code className="text-sm text-primary-400 truncate flex-1">
                    {title.secretKey || 'N/A'}
                  </code>
                  <button
                    onClick={() => copyToClipboard(title.secretKey || '', 'Secret Key')}
                    className="text-dark-400 hover:text-white ml-2"
                    disabled={!title.secretKey}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <Button
                variant="danger"
                size="sm"
                onClick={handleRegenerateKey}
                isLoading={regenerateKeyMutation.isPending}
                className="w-full flex items-center justify-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Regenerate API Key</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <a
                href="https://docs.nullstack.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-dark-900 rounded border border-dark-700 hover:border-primary-500 transition-colors"
              >
                <span className="text-white">Documentation</span>
                <ExternalLink className="h-4 w-4 text-dark-400" />
              </a>
              <a
                href="https://docs.nullstack.com/sdk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-dark-900 rounded border border-dark-700 hover:border-primary-500 transition-colors"
              >
                <span className="text-white">SDK Downloads</span>
                <ExternalLink className="h-4 w-4 text-dark-400" />
              </a>
              <a
                href="https://docs.nullstack.com/api"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-dark-900 rounded border border-dark-700 hover:border-primary-500 transition-colors"
              >
                <span className="text-white">API Reference</span>
                <ExternalLink className="h-4 w-4 text-dark-400" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Players Tab
const PlayersTab: React.FC<{ titleId: string }> = ({ titleId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: playersResponse, isLoading } = useQuery({
    queryKey: ['players', titleId, searchQuery],
    queryFn: () => apiClient.getPlayers(titleId, searchQuery),
  });

  const players = playersResponse?.data?.items || [];

  const banMutation = useMutation({
    mutationFn: ({ playerId, reason }: { playerId: string; reason: string }) =>
      apiClient.banPlayer(titleId, playerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players', titleId] });
      toast.success('Player banned successfully');
    },
  });

  const unbanMutation = useMutation({
    mutationFn: (playerId: string) => apiClient.unbanPlayer(titleId, playerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players', titleId] });
      toast.success('Player unbanned successfully');
    },
  });

  const handleBan = (player: any) => {
    const reason = window.prompt('Enter ban reason:');
    if (reason) {
      banMutation.mutate({ playerId: player.id, reason });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-dark-400" />
          <input
            type="text"
            placeholder="Search players by ID, email, or display name..."
            className="w-full pl-10 pr-4 py-3 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </Card>

      {/* Players Table */}
      <Card padding="none">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : !players || players.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-dark-400 opacity-50" />
            <p className="text-dark-400">No players found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player: any) => (
                <TableRow key={player.id}>
                  <TableCell>
                    <div className="font-medium text-white">{player.displayName}</div>
                    <div className="text-xs text-dark-400">{player.id}</div>
                  </TableCell>
                  <TableCell>{player.email || '-'}</TableCell>
                  <TableCell>
                    {format(new Date(player.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {player.lastLogin
                      ? format(new Date(player.lastLogin), 'MMM dd, yyyy')
                      : 'Never'}
                  </TableCell>
                  <TableCell>
                    {player.banned ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-500 bg-opacity-10 text-red-500">
                        <Ban className="h-3 w-3 mr-1" />
                        Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500 bg-opacity-10 text-green-500">
                        Active
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {player.banned ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => unbanMutation.mutate(player.id)}
                        className="flex items-center space-x-1"
                      >
                        <ShieldOff className="h-3 w-3" />
                        <span>Unban</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleBan(player)}
                        className="flex items-center space-x-1"
                      >
                        <Ban className="h-3 w-3" />
                        <span>Ban</span>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};

// Economy Tab
const EconomyTab: React.FC<{ titleId: string }> = ({ titleId }) => {
  const [activeSection, setActiveSection] = useState<'currencies' | 'catalog'>('currencies');
  const [isCreateCurrencyOpen, setIsCreateCurrencyOpen] = useState(false);
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const queryClient = useQueryClient();

  // Currency state
  const [currencyCode, setCurrencyCode] = useState('');
  const [currencyName, setCurrencyName] = useState('');

  // Item state
  const [itemId, setItemId] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');

  const { data: currenciesResponse } = useQuery({
    queryKey: ['currencies', titleId],
    queryFn: () => apiClient.getCurrencies(titleId),
    enabled: activeSection === 'currencies',
  });

  const { data: catalogItemsResponse } = useQuery({
    queryKey: ['catalog', titleId],
    queryFn: () => apiClient.getCatalogItems(titleId),
    enabled: activeSection === 'catalog',
  });

  const currencies = currenciesResponse?.data?.items || [];
  const catalogItems = catalogItemsResponse?.data?.items || [];

  const createCurrencyMutation = useMutation({
    mutationFn: () =>
      apiClient.createCurrency(titleId, {
        code: currencyCode,
        name: currencyName,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies', titleId] });
      setIsCreateCurrencyOpen(false);
      setCurrencyCode('');
      setCurrencyName('');
      toast.success('Currency created successfully!');
    },
  });

  const createItemMutation = useMutation({
    mutationFn: () =>
      apiClient.createCatalogItem(titleId, {
        itemId,
        displayName: itemName,
        description: itemDescription,
        isStackable: true,
        isTradable: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog', titleId] });
      setIsCreateItemOpen(false);
      setItemId('');
      setItemName('');
      setItemDescription('');
      toast.success('Item created successfully!');
    },
  });

  const deleteCurrencyMutation = useMutation({
    mutationFn: (currencyId: string) => apiClient.deleteCurrency(titleId, currencyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies', titleId] });
      toast.success('Currency deleted successfully!');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => apiClient.deleteCatalogItem(titleId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog', titleId] });
      toast.success('Item deleted successfully!');
    },
  });

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex space-x-4 border-b border-dark-700">
        <button
          onClick={() => setActiveSection('currencies')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeSection === 'currencies'
              ? 'text-primary-500 border-b-2 border-primary-500'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4" />
            <span>Currencies</span>
          </div>
        </button>
        <button
          onClick={() => setActiveSection('catalog')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeSection === 'catalog'
              ? 'text-primary-500 border-b-2 border-primary-500'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Catalog Items</span>
          </div>
        </button>
      </div>

      {/* Currencies Section */}
      {activeSection === 'currencies' && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Virtual Currencies</h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateCurrencyOpen(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Currency</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currencies?.map((currency: any) => (
              <Card key={currency.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{currency.name}</CardTitle>
                      <p className="text-dark-400 text-sm mt-1">Code: {currency.code}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete currency "${currency.name}"? This cannot be undone.`
                          )
                        ) {
                          deleteCurrencyMutation.mutate(currency.id);
                        }
                      }}
                      className="text-dark-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {(!currencies || currencies.length === 0) && (
            <Card>
              <div className="text-center py-12">
                <DollarSign className="h-16 w-16 mx-auto mb-4 text-dark-400 opacity-50" />
                <p className="text-dark-400">No currencies yet</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateCurrencyOpen(true)}
                  className="mt-4"
                >
                  Create Your First Currency
                </Button>
              </div>
            </Card>
          )}

          {/* Create Currency Modal */}
          <Modal
            isOpen={isCreateCurrencyOpen}
            onClose={() => setIsCreateCurrencyOpen(false)}
            title="Create Currency"
          >
            <div className="space-y-4">
              <Input
                label="Currency Code"
                placeholder="GC"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                helperText="Short code (2-3 characters)"
                required
              />
              <Input
                label="Currency Name"
                placeholder="Gold Coins"
                value={currencyName}
                onChange={(e) => setCurrencyName(e.target.value)}
                required
              />
              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="ghost" onClick={() => setIsCreateCurrencyOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => createCurrencyMutation.mutate()}
                  isLoading={createCurrencyMutation.isPending}
                >
                  Create
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* Catalog Section */}
      {activeSection === 'catalog' && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Catalog Items</h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateItemOpen(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Item</span>
            </Button>
          </div>

          <Card padding="none">
            {!catalogItems || catalogItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-dark-400 opacity-50" />
                <p className="text-dark-400">No catalog items yet</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateItemOpen(true)}
                  className="mt-4"
                >
                  Create Your First Item
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item ID</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogItems.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <code className="text-primary-400">{item.itemId}</code>
                      </TableCell>
                      <TableCell className="font-medium text-white">
                        {item.displayName}
                      </TableCell>
                      <TableCell className="text-dark-400">
                        {item.description || '-'}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete item "${item.displayName}"? This cannot be undone.`
                              )
                            ) {
                              deleteItemMutation.mutate(item.itemId);
                            }
                          }}
                          className="text-dark-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* Create Item Modal */}
          <Modal
            isOpen={isCreateItemOpen}
            onClose={() => setIsCreateItemOpen(false)}
            title="Create Catalog Item"
            size="lg"
          >
            <div className="space-y-4">
              <Input
                label="Item ID"
                placeholder="sword_legendary_001"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                helperText="Unique identifier for this item"
                required
              />
              <Input
                label="Display Name"
                placeholder="Legendary Sword"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="A powerful legendary sword..."
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="ghost" onClick={() => setIsCreateItemOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => createItemMutation.mutate()}
                  isLoading={createItemMutation.isPending}
                >
                  Create Item
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

// CloudScript Tab
const CloudScriptTab: React.FC<{ titleId: string; title: any }> = ({ titleId, title }) => {
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [scriptName, setScriptName] = useState('');
  const [scriptCode, setScriptCode] = useState('');
  const queryClient = useQueryClient();

  const { data: scriptsResponse } = useQuery({
    queryKey: ['cloudscripts', titleId],
    queryFn: () => apiClient.getCloudScripts(titleId, title?.secretKey),
    enabled: !!titleId && !!title?.secretKey,
  });

  const scripts = scriptsResponse?.data?.items || [];

  const saveScriptMutation = useMutation({
    mutationFn: () => apiClient.saveCloudScript(titleId, scriptName, scriptCode, title?.secretKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloudscripts', titleId] });
      toast.success('CloudScript saved successfully!');
      setSelectedScript(null);
      setScriptName('');
      setScriptCode('');
    },
  });

  const deleteScriptMutation = useMutation({
    mutationFn: (scriptId: string) => apiClient.deleteCloudScript(titleId, scriptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloudscripts', titleId] });
      toast.success('CloudScript deleted successfully!');
    },
  });

  const handleNewScript = () => {
    setSelectedScript(null);
    setScriptName('');
    setScriptCode('// Your CloudScript function\nfunction myFunction(args, context) {\n  // Your code here\n  return { success: true };\n}');
  };

  const handleSelectScript = (script: any) => {
    setSelectedScript(script);
    setScriptName(script.name);
    setScriptCode(script.code);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-white">CloudScript Functions</h3>
          <p className="text-dark-400 text-sm mt-1">
            Write server-side logic that runs in the cloud
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleNewScript}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Function</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scripts List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Functions</CardTitle>
          </CardHeader>
          <CardContent>
            {!scripts || scripts.length === 0 ? (
              <p className="text-dark-400 text-sm">No functions yet</p>
            ) : (
              <div className="space-y-2">
                {scripts.map((script: any) => (
                  <button
                    key={script.id}
                    onClick={() => handleSelectScript(script)}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      selectedScript?.id === script.id
                        ? 'bg-primary-500 bg-opacity-10 border-primary-500 text-white'
                        : 'bg-dark-900 border-dark-700 text-dark-300 hover:border-dark-600'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{script.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              `Delete function "${script.name}"? This cannot be undone.`
                            )
                          ) {
                            deleteScriptMutation.mutate(script.id);
                          }
                        }}
                        className="text-dark-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Code Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedScript ? `Edit: ${selectedScript.name}` : 'New Function'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scriptCode !== '' ? (
              <div className="space-y-4">
                <Input
                  label="Function Name"
                  placeholder="myFunction"
                  value={scriptName}
                  onChange={(e) => setScriptName(e.target.value)}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">
                    Code
                  </label>
                  <textarea
                    className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={20}
                    value={scriptCode}
                    onChange={(e) => setScriptCode(e.target.value)}
                    spellCheck={false}
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={() => saveScriptMutation.mutate()}
                  isLoading={saveScriptMutation.isPending}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Function</span>
                </Button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Code className="h-16 w-16 mx-auto mb-4 text-dark-400 opacity-50" />
                <p className="text-dark-400 mb-4">
                  Select a function or create a new one
                </p>
                <Button variant="primary" onClick={handleNewScript}>
                  Create New Function
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Analytics Tab
const AnalyticsTab: React.FC<{ titleId: string; title: any }> = ({ titleId, title }) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');

  const { data: analytics } = useQuery({
    queryKey: ['analytics', titleId, period],
    queryFn: () => apiClient.getAnalytics(titleId, period),
  });

  // Transform real analytics data for charts
  const chartData = analytics?.data?.activeUsers?.map((item: any) => ({
    date: item.date || new Date(item.dateStr || Date.now()).toLocaleDateString('en-US', { weekday: 'short' }),
    activeUsers: item.activeUsers || item.count || 0,
    newUsers: item.newUsers || 0,
    sessions: item.sessions || item.sessionCount || 0,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white">Analytics</h3>
        <div className="flex space-x-2">
          <Button
            variant={period === 'day' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('day')}
          >
            Day
          </Button>
          <Button
            variant={period === 'week' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('week')}
          >
            Week
          </Button>
          <Button
            variant={period === 'month' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('month')}
          >
            Month
          </Button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        {/* Active Users Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  name="Active Users"
                />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="New Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sessions Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="sessions" fill="#8b5cf6" name="Total Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Settings Tab
const SettingsTab: React.FC<{ title: any }> = ({ title }) => {
  const [settings, setSettings] = useState(title.settings || {});
  const queryClient = useQueryClient();

  const updateTitleMutation = useMutation({
    mutationFn: (updates: any) => apiClient.updateTitle(title.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['title', title.id] });
      toast.success('Settings updated successfully!');
    },
  });

  const handleSaveSettings = () => {
    updateTitleMutation.mutate({ settings });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Title Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Title Info */}
            <div>
              <Input
                label="Title Name"
                value={title.name}
                disabled
                helperText="Contact support to change title name"
              />
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-dark-900 rounded border border-dark-700">
                <div>
                  <p className="font-medium text-white">Allow Guest Logins</p>
                  <p className="text-sm text-dark-400">
                    Allow players to login without creating an account
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.allowGuestLogins || false}
                    onChange={(e) =>
                      setSettings({ ...settings, allowGuestLogins: e.target.checked })
                    }
                  />
                  <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-dark-900 rounded border border-dark-700">
                <div>
                  <p className="font-medium text-white">Enable Analytics</p>
                  <p className="text-sm text-dark-400">
                    Track player behavior and game metrics
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.enableAnalytics !== false}
                    onChange={(e) =>
                      setSettings({ ...settings, enableAnalytics: e.target.checked })
                    }
                  />
                  <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleSaveSettings}
              isLoading={updateTitleMutation.isPending}
              className="w-full flex items-center justify-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500">
        <CardHeader>
          <CardTitle className="text-red-500">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Delete Title</p>
                <p className="text-sm text-dark-400">
                  Permanently delete this title and all associated data
                </p>
              </div>
              <Button variant="danger" disabled>
                Delete Title
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
