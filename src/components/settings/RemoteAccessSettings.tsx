import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode, Copy, Wifi, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useSettingsStore } from '@/stores/settings';
import { invokeIpc } from '@/lib/api-client';

export function RemoteAccessSettings() {
  const { t } = useTranslation('settings');
  const {
    remoteAccessEnabled,
    setRemoteAccessEnabled,
    remoteAccessPort
  } = useSettingsStore() as any;

  const localIp = '192.168.1.100';
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    // Get token from main process
    invokeIpc('app:getHostApiToken').then((t: any) => setToken(t));
  }, []);

  const apiEndpoint = `http://${localIp}:${remoteAccessPort}`;
  const pairingData = JSON.stringify({
    url: apiEndpoint,
    token: token
  });

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    toast.success(t('developer.tokenCopied'));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium text-foreground">{t('remoteAccess.enable')}</Label>
          <p className="text-meta text-muted-foreground mt-1">
            {t('remoteAccess.enableDesc')}
          </p>
        </div>
        <Switch
          checked={remoteAccessEnabled}
          onCheckedChange={setRemoteAccessEnabled}
        />
      </div>

      {remoteAccessEnabled && (
        <div className="space-y-6 pt-4 border-t border-black/5 dark:border-white/5 animate-in fade-in slide-in-from-top-2">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              {t('remoteAccess.warning')}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">
                  {t('remoteAccess.apiEndpoint')}
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={apiEndpoint}
                    className="font-mono text-xs h-10 rounded-xl bg-black/5 border-transparent"
                  />
                  <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 rounded-xl" onClick={() => {
                    navigator.clipboard.writeText(apiEndpoint);
                    toast.success(t('developer.doctorCopied'));
                  }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">
                  {t('remoteAccess.pairingToken')}
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    type="password"
                    value={token}
                    className="font-mono text-xs h-10 rounded-xl bg-black/5 border-transparent"
                  />
                  <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 rounded-xl" onClick={handleCopyToken}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white dark:bg-black/20 border border-black/5 shadow-inner aspect-square max-w-[240px] mx-auto">
              <div className="relative group cursor-pointer" title="Scan to Pair">
                <div className="w-40 h-40 bg-black/5 rounded-xl flex items-center justify-center border-2 border-dashed border-black/10 group-hover:border-primary/50 transition-colors overflow-hidden">
                  {/* Public QR API for demo/foundation */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pairingData)}`}
                    alt="Pairing QR Code"
                    className="w-full h-full"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-black/80 rounded-xl">
                  <QrCode className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                <Wifi className="h-3 w-3" />
                {t('remoteAccess.qrNote')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
