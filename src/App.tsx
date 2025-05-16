import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Navbar from "./components/Navbar";
import CreateDropPage from "./pages/CreateDropPage";
import AvailableDropsPage from "./pages/AvailableDropsPage";
import UpcomingDropsPage from "./pages/UpcomingDropsPage";
import EndedDropsPage from "./pages/EndedDropsPage";
import MyDropsPage from "./pages/MyDropsPage";
import DropDetailPage from "./pages/DropDetailPage";
import IntroPage from "./pages/IntroPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import SponsorGame from "./pages/SponsorGame";
import FooterNav from "./components/FooterNav"; // Import the new FooterNav
import { sdk } from "@farcaster/frame-sdk";

const App: React.FC = () => {
  useEffect(() => {
    const initializeMiniApp = async () => {
      await sdk.actions.ready();
    };
    initializeMiniApp();
  }, []);
  return (
    <Router>
      {/* Use flex flex-col to ensure footer can be positioned correctly if not fixed,
          or to manage overall page structure if main content needs to shrink.
          For a fixed footer, this mainly helps keep structure clean. */}
      <div className="flex flex-col min-h-screen bg-slate-900 text-white">
        <Navbar />
        {/* flex-grow allows this main content area to take up available space */}
        {/* pb-20 md:pb-4 adds padding at the bottom for the fixed footer on mobile */}
        <main className="flex-grow container mx-auto px-4 py-6 md:py-8 pb-20 md:pb-8">
          <Routes>
            <Route path="/" element={<IntroPage />} />
            <Route path="/create" element={<CreateDropPage />} />
            <Route path="/sponsor" element={<SponsorGame />} />
            <Route path="/available" element={<AvailableDropsPage />} />
            <Route path="/upcoming" element={<UpcomingDropsPage />} />
            <Route path="/ended" element={<EndedDropsPage />} />
            <Route path="/my-drops" element={<MyDropsPage />} />
            <Route path="/drop/:dropId" element={<DropDetailPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="*" element={<div>Page Not Found</div>} />
          </Routes>
        </main>
        <FooterNav /> {/* Add the FooterNav component here */}
      </div>
    </Router>
  );
};

export default App;
