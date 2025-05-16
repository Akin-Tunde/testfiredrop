import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { sdk } from "@farcaster/frame-sdk";

const Navbar: React.FC = () => {
  const { address, isConnected, isConnecting } = useAccount(); // Add isConnecting
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const location = useLocation();

  useEffect(() => {
    const autoConnectIfMiniApp = async () => {
      try {
        const isMiniApp = await sdk.isInMiniApp();
        if (isMiniApp && !isConnected && connectors.length > 0) {
          const farcasterConnector = connectors.find(
            (c) => c.id === "farcasterFrame"
          );

          if (farcasterConnector) {
            console.log(
              "Attempting to auto-connect with Farcaster Frame connector..."
            );
            await connect({ connector: farcasterConnector });
          } else {
            console.log(
              "Farcaster Frame connector not found for auto-connect."
            );
          }
        }
      } catch (error) {
        console.error("Error during Mini App auto-connect:", error);
      }
    };
    autoConnectIfMiniApp();
  }, [isConnected, connect, connectors]); // Rerun if connection state or connectors change

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-gray-900 border-b border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <img
                src="/logo.jpg"
                alt="Logo"
                className="h-8 w-8 text-orange-400 animate-pulse"
              />
            </div>
            <span className="text-xl font-bold text-white tracking-wide">
              FireBall
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                isActive("/")
                  ? "bg-orange-500 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-orange-400"
              }`}
            >
              Home
            </Link>
            <Link
              to="/create"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                isActive("/create")
                  ? "bg-orange-500 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-orange-400"
              }`}
            >
              Create
            </Link>
            <Link
              to="/sponsor"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                isActive("/sponsor")
                  ? "bg-orange-500 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-orange-400"
              }`}
            >
              Sponsor
            </Link>
            <Link
              to="/available"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                isActive("/available")
                  ? "bg-orange-500 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-orange-400"
              }`}
            >
              Available
            </Link>
            <Link
              to="/ended"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                isActive("/ended")
                  ? "bg-orange-500 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-orange-400"
              }`}
            >
              Ended
            </Link>
            <Link
              to="/my-drops"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                isActive("/my-drops")
                  ? "bg-orange-500 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-orange-400"
              }`}
            >
              Profile
            </Link>
            <Link
              to="/leaderboard"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                isActive("/leaderboard")
                  ? "bg-orange-500 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-orange-400"
              }`}
            >
              Leaderboard
            </Link>
          </div>

          {/* Wallet Connection (Desktop & Mobile) */}
          <div className="flex items-center">
            {isConnected ? (
              <>
                {/* Desktop View: Address + Separate Disconnect Button */}
                <div className="hidden md:flex items-center space-x-2">
                  <span className="bg-gray-700 px-3 py-1 rounded-full text-sm font-medium text-gray-200">
                    {`${address?.slice(0, 6)}...${address?.slice(-4)}`}
                  </span>
                  <button
                    onClick={() => disconnect()}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200"
                  >
                    Disconnect
                  </button>
                </div>

                {/* Mobile View: Single Button with Address, acts as Disconnect */}
                <div className="md:hidden">
                  <button
                    onClick={() => disconnect()}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap"
                  >
                    {`${address?.slice(0, 4)}...${address?.slice(-3)}`}{" "}
                    {/* Shorter for mobile button */}
                  </button>
                </div>
              </>
            ) : isConnecting ? ( // Check if wagmi is in the process of connecting
              <div className="px-3 py-1 rounded-full text-sm font-medium text-gray-400 animate-pulse">
                Connecting...
              </div>
            ) : (
              <div>
                {/* Only render a button if there's at least one connector */}
                {/* This will now render a single "Connect Wallet" button that uses the first available connector */}
                {/* In a Farcaster frame, the auto-connect useEffect should handle connection. This button is a fallback. */}
                {connectors.length > 0 && (
                  <button
                    key={connectors[0].id} // Use the first connector
                    onClick={() => connect({ connector: connectors[0] })} // Connect with the first connector
                    className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap"
                  >
                    Connect Wallet
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
