import { Navigate } from "react-router-dom";
import { useWallet } from "@/providers/WalletProvider";
import FrogLoader from "./FrogLoader";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isConnected, isConnecting } = useWallet();

  // Show loader while checking connection status
  if (isConnecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FrogLoader size="lg" />
      </div>
    );
  }

  // Redirect to auth if not connected
  if (!isConnected) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
