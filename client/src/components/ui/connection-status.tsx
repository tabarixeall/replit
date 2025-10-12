import { Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "@/hooks/useWebSocket";

export function ConnectionStatus() {
  const { isConnected } = useWebSocket();

  return (
    <Badge 
      variant={isConnected ? "default" : "destructive"} 
      className="flex items-center gap-1 text-xs"
    >
      {isConnected ? (
        <>
          <Wifi className="w-3 h-3" />
          Live
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          Offline
        </>
      )}
    </Badge>
  );
}