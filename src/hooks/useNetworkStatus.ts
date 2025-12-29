import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
  effectiveType: string | null;
}

// Extend Navigator type for Network Information API
interface NetworkInformation {
  effectiveType: string;
  type: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  onchange: (() => void) | null;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: null,
    effectiveType: null,
  });

  const getConnectionInfo = useCallback(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      const isSlowConnection = 
        connection.effectiveType === "slow-2g" || 
        connection.effectiveType === "2g" ||
        connection.rtt > 500;

      return {
        connectionType: connection.type || null,
        effectiveType: connection.effectiveType || null,
        isSlowConnection,
      };
    }

    return {
      connectionType: null,
      effectiveType: null,
      isSlowConnection: false,
    };
  }, []);

  const handleOnline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: true,
      ...getConnectionInfo(),
    }));
    
    toast.success("Back online", {
      description: "Your connection has been restored.",
      duration: 3000,
    });
  }, [getConnectionInfo]);

  const handleOffline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: false,
    }));
    
    toast.error("You're offline", {
      description: "Please check your internet connection.",
      duration: Infinity,
      id: "offline-toast",
    });
  }, []);

  const handleConnectionChange = useCallback(() => {
    const connectionInfo = getConnectionInfo();
    
    setStatus(prev => ({
      ...prev,
      ...connectionInfo,
    }));

    if (connectionInfo.isSlowConnection && status.isOnline) {
      toast.warning("Slow connection detected", {
        description: "Some features may take longer to load.",
        duration: 5000,
      });
    }
  }, [getConnectionInfo, status.isOnline]);

  useEffect(() => {
    // Set initial status
    setStatus({
      isOnline: navigator.onLine,
      ...getConnectionInfo(),
    });

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Network Information API listener
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.onchange = handleConnectionChange;
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      
      if (connection) {
        connection.onchange = null;
      }
    };
  }, [handleOnline, handleOffline, handleConnectionChange, getConnectionInfo]);

  return status;
};

// Utility function to wrap fetch with error handling
export const fetchWithNetworkHandler = async <T>(
  url: string,
  options?: RequestInit
): Promise<T> => {
  if (!navigator.onLine) {
    toast.error("No internet connection", {
      description: "Please check your connection and try again.",
    });
    throw new Error("No internet connection");
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      // Handle specific HTTP errors
      if (response.status === 401) {
        toast.error("Session expired", {
          description: "Please sign in again.",
        });
      } else if (response.status === 403) {
        toast.error("Access denied", {
          description: "You don't have permission to perform this action.",
        });
      } else if (response.status === 404) {
        toast.error("Not found", {
          description: "The requested resource could not be found.",
        });
      } else if (response.status >= 500) {
        toast.error("Server error", {
          description: "Something went wrong. Please try again later.",
        });
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      toast.error("Network error", {
        description: "Unable to connect to the server. Please check your connection.",
      });
    }
    throw error;
  }
};

export default useNetworkStatus;
