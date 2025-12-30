import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Wifi, WifiOff, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { checkAllRpcsHealth, RpcHealthStatus, NetworkType } from "@/config/alchemy";
import { useWallet } from "@/providers/WalletProvider";

export const RpcHealthIndicator: React.FC = () => {
  const { network } = useWallet();
  const [healthStatuses, setHealthStatuses] = useState<RpcHealthStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      const results = await checkAllRpcsHealth(network);
      setHealthStatuses(results);
      setLastChecked(new Date());
    } catch (error) {
      console.error("Failed to check RPC health:", error);
    } finally {
      setIsChecking(false);
    }
  }, [network]);

  useEffect(() => {
    checkHealth();
    // Re-check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const healthyCount = healthStatuses.filter(s => s.healthy).length;
  const totalCount = healthStatuses.length;
  const allHealthy = healthyCount === totalCount && totalCount > 0;
  const someHealthy = healthyCount > 0;
  const noneHealthy = healthyCount === 0 && totalCount > 0;

  const getOverallStatus = () => {
    if (isChecking && healthStatuses.length === 0) return 'checking';
    if (allHealthy) return 'healthy';
    if (someHealthy) return 'degraded';
    if (noneHealthy) return 'down';
    return 'unknown';
  };

  const status = getOverallStatus();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2"
        >
          {status === 'checking' ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          ) : status === 'healthy' ? (
            <Wifi className="w-3.5 h-3.5 text-green-500" />
          ) : status === 'degraded' ? (
            <Wifi className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-destructive" />
          )}
          <span className="text-xs hidden sm:inline">
            {status === 'checking' ? 'Checking...' : 
             status === 'healthy' ? 'RPC OK' : 
             status === 'degraded' ? `${healthyCount}/${totalCount}` : 
             'RPC Down'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-sm">RPC Endpoints</h4>
              <p className="text-xs text-muted-foreground">
                {network === 'mainnet' ? 'Monad Mainnet' : 'Monad Testnet'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={checkHealth}
              disabled={isChecking}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="space-y-2">
            {healthStatuses.map((status, index) => {
              const hostname = new URL(status.url).hostname;
              return (
                <div
                  key={status.url}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {status.healthy ? (
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive shrink-0" />
                    )}
                    <span className="text-sm truncate">{hostname}</span>
                    {index === 0 && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        Primary
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {status.healthy && status.latency !== null ? (
                      <span className={`text-xs ${
                        status.latency < 200 ? 'text-green-500' :
                        status.latency < 500 ? 'text-amber-500' :
                        'text-orange-500'
                      }`}>
                        {status.latency}ms
                      </span>
                    ) : status.error ? (
                      <span className="text-xs text-destructive truncate max-w-[80px]" title={status.error}>
                        {status.error}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {lastChecked && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
              <Clock className="w-3 h-3" />
              <span>Last checked: {lastChecked.toLocaleTimeString()}</span>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>If all RPCs are down, check your network connection or try:</p>
            <ol className="list-decimal list-inside mt-1 space-y-0.5">
              <li>Refresh the page</li>
              <li>Clear browser cache</li>
              <li>Switch networks and back</li>
            </ol>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};