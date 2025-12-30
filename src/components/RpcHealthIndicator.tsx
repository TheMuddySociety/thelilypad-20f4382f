import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Wifi, WifiOff, RefreshCw, CheckCircle, XCircle, Clock, Zap, RotateCcw } from "lucide-react";
import { getPreferredRpcUrl } from "@/config/alchemy";
import { useWallet } from "@/providers/WalletProvider";
import { useRpcFailover } from "@/hooks/useRpcFailover";
import { RpcSettings } from "@/components/wallet/RpcSettings";

export const RpcHealthIndicator: React.FC = () => {
  const { network } = useWallet();
  const { 
    currentRpc, 
    isHealthy, 
    isFailingOver, 
    healthStatuses, 
    checkHealth, 
    resetFailedRpcs,
    failover 
  } = useRpcFailover(network);

  const healthyCount = healthStatuses.filter(s => s.healthy).length;
  const totalCount = healthStatuses.length;
  const allHealthy = healthyCount === totalCount && totalCount > 0;
  const someHealthy = healthyCount > 0;
  const noneHealthy = healthyCount === 0 && totalCount > 0;

  const getOverallStatus = () => {
    if (isFailingOver) return 'failover';
    if (healthStatuses.length === 0) return 'checking';
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
          {status === 'failover' ? (
            <Zap className="w-3.5 h-3.5 animate-pulse text-amber-500" />
          ) : status === 'checking' ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          ) : status === 'healthy' ? (
            <Wifi className="w-3.5 h-3.5 text-green-500" />
          ) : status === 'degraded' ? (
            <Wifi className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-destructive" />
          )}
          <span className="text-xs hidden sm:inline">
            {status === 'failover' ? 'Switching...' :
             status === 'checking' ? 'Checking...' : 
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
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={resetFailedRpcs}
                title="Reset failed RPCs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={checkHealth}
                disabled={isFailingOver}
                title="Check health"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFailingOver ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Current active RPC */}
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Active RPC</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new URL(currentRpc).hostname}
              </span>
            </div>
            {!isHealthy && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2 h-7 text-xs"
                onClick={failover}
                disabled={isFailingOver}
              >
                {isFailingOver ? 'Switching...' : 'Switch to Healthy RPC'}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {healthStatuses.map((rpcStatus) => {
              const hostname = new URL(rpcStatus.url).hostname;
              const preferredRpc = getPreferredRpcUrl(network);
              const isPreferred = preferredRpc === rpcStatus.url;
              const isActive = currentRpc === rpcStatus.url;
              
              return (
                <div
                  key={rpcStatus.url}
                  className={`flex items-center justify-between p-2 rounded-lg bg-muted/50 ${
                    isActive ? 'ring-1 ring-primary/50' : ''
                  } ${isPreferred ? 'border border-primary/30' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {rpcStatus.healthy ? (
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive shrink-0" />
                    )}
                    <span className="text-sm truncate">{hostname}</span>
                    <div className="flex gap-1">
                      {isActive && (
                        <Badge variant="default" className="text-[10px] px-1 py-0 bg-primary">
                          Active
                        </Badge>
                      )}
                      {isPreferred && !isActive && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          Preferred
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {rpcStatus.healthy && rpcStatus.latency !== null ? (
                      <span className={`text-xs ${
                        rpcStatus.latency < 200 ? 'text-green-500' :
                        rpcStatus.latency < 500 ? 'text-amber-500' :
                        'text-orange-500'
                      }`}>
                        {rpcStatus.latency}ms
                      </span>
                    ) : rpcStatus.error ? (
                      <span className="text-xs text-destructive truncate max-w-[80px]" title={rpcStatus.error}>
                        {rpcStatus.error}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
            <Clock className="w-3 h-3" />
            <span>Auto-failover enabled • Checks every 30s</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Select preferred RPC endpoint
            </div>
            <RpcSettings variant="icon" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};