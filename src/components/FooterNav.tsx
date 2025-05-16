import React from "react";
import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  PlusCircleIcon,
  FireIcon,
  Squares2X2Icon, // Renamed from CollectionIcon for v2
  ArrowTrendingUpIcon, // Renamed from TrendingUpIcon for v2
  GiftIcon,
} from "@heroicons/react/24/outline";

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={(
      { isActive } // Added min-h-18 for consistent height
    ) =>
      `flex flex-col items-center justify-center flex-1 p-2 rounded-lg transition-colors duration-150 min-h-[4.5rem] ${
        isActive
          ? "text-orange-500 bg-gray-700"
          : "text-gray-400 hover:text-orange-400 hover:bg-gray-750"
      }`
    }
  >
    <Icon className="h-6 w-6 mb-0.5" />
    {/* Added text-center for multi-line labels and a fixed width to help with very long labels if they occurred */}
    <span className="text-xs text-center w-full px-1">{label}</span>
  </NavLink>
);

const FooterNav: React.FC = () => {
  //   const navItems = [
  //     { to: "/", icon: HomeIcon, label: "Home" },
  //     { to: "/create", icon: PlusCircleIcon, label: "Create" },
  //     { to: "/sponsor", icon: GiftIcon, label: "Sponsor" },
  //     { to: "/available", icon: FireIcon, label: "Active" },
  //     { to: "/my-drops", icon: Squares2X2Icon, label: "My Drops" },
  //     { to: "/leaderboard", icon: ArrowTrendingUpIcon, label: "Leaders" },
  //   ];

  const mobileNavItems = [
    { to: "/", icon: HomeIcon, label: "Home" },
    { to: "/available", icon: FireIcon, label: "Active" },
    { to: "/create", icon: PlusCircleIcon, label: "Create" },
    { to: "/sponsor", icon: GiftIcon, label: "Sponsor" },
    { to: "/my-drops", icon: Squares2X2Icon, label: "Profile" },
    { to: "/leaderboard", icon: ArrowTrendingUpIcon, label: "Leaders" },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 shadow-lg md:hidden z-50">
      <nav className="flex justify-around items-center max-w-xl mx-auto px-2">
        {mobileNavItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
          />
        ))}
      </nav>
    </footer>
  );
};

export default FooterNav;
