import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useConfigStorage } from '@/hooks/useConfigStorage';
import { Save, FolderOpen, Trash2, Cloud, CloudOff, Lock, X, LogOut, User, ChevronDown, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CloudToolbarProps {
  onSave: (configData: Record<string, unknown>) => Record<string, unknown>;
  onLoad: (configData: Record<string, unknown>) => void;
}

const CloudToolbar = ({ onSave, onLoad }: CloudToolbarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { savedConfigs, isLoading, currentConfigId, fetchConfigs, saveConfig, loadConfig, deleteConfig } = useConfigStorage();
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (showLoadDialog) fetchConfigs();
  }, [showLoadDialog, fetchConfigs]);

  const handleSave = useCallback(async () => {
    if (!saveName.trim()) return;
    const data = onSave({});
    await saveConfig(saveName, data, { description: saveDesc });
    setShowSaveDialog(false);
    setSaveName('');
    setSaveDesc('');
  }, [saveName, saveDesc, onSave, saveConfig]);

  const handleLoad = useCallback(async (id: string) => {
    const result = await loadConfig(id);
    if (result?.config_data) {
      const configData = typeof result.config_data === 'string' ? JSON.parse(result.config_data) : result.config_data;
      onLoad(configData);
      setShowLoadDialog(false);
    }
  }, [loadConfig, onLoad]);

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Connection status */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-[10px] text-primary mr-1">
          <Cloud className="w-3 h-3" />
          <span>{currentConfigId ? 'Synced' : 'Local'}</span>
        </div>

        {/* Save */}
        <button
          onClick={() => {
            if (currentConfigId) {
              const data = onSave({});
              saveConfig(saveName || 'Untitled', data);
            } else {
              setShowSaveDialog(true);
            }
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary/15 hover:bg-primary/25 text-primary text-xs font-medium transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          Save
        </button>

        {/* Load */}
        <button
          onClick={() => setShowLoadDialog(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-medium transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Load
        </button>

        {/* User menu */}
        <div className="relative ml-1">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-secondary/50 text-xs text-muted-foreground transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <User className="w-3 h-3 text-primary" />
            </div>
            <span className="hidden sm:inline max-w-[80px] truncate">{user?.username}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-xl z-50 py-1">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs font-medium text-foreground truncate">{user?.displayName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                  <div className="flex gap-1 mt-1">
                    {user?.roles.map((role) => (
                      <span key={role} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium uppercase">{role}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); navigate('/profile'); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent/50 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  Profile
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); navigate('/admin'); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent/50 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin Panel
                </button>
                <div className="border-t border-border my-1" />
                <button
                  onClick={() => { setShowUserMenu(false); logout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Save Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</label>
              <input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="My Configuration"
                className="w-full h-10 px-3 rounded-lg bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
              <textarea value={saveDesc} onChange={(e) => setSaveDesc(e.target.value)} placeholder="Optional description..." rows={3}
                className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none" />
            </div>
            <button onClick={handleSave} disabled={isLoading || !saveName.trim()}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {isLoading ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Save to Server</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Load Configuration</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-2 max-h-[400px] overflow-y-auto">
            {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>}
            {!isLoading && savedConfigs.length === 0 && (
              <div className="text-center py-8">
                <CloudOff className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No saved configurations</p>
              </div>
            )}
            {savedConfigs.map((config) => (
              <div key={config.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-colors group">
                <button onClick={() => handleLoad(config.id)} className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{config.name}</p>
                    {config.is_encrypted && <Lock className="w-3 h-3 text-node-group" />}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">v{config.version}</span>
                  </div>
                  {config.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{config.description}</p>}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(config.updated_at).toLocaleString()}</p>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConfig(config.id); }}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CloudToolbar;
