'use client';

import Sidebar from '@/components/Sidebar';
import RewardsLeaderboard from '@/components/RewardsLeaderboard';
import { Trophy, Sparkles } from 'lucide-react';

export default function RankingPage() {
  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        <div className="page-header mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                Ranking & Recompensas Vía Gourmet
              </h1>
              <span className="badge badge-primary flex items-center gap-1" style={{ fontSize: '11px', padding: '4px 10px' }}>
                <Sparkles size={12} />
                Programa Oficial
              </span>
            </div>
            <p className="page-subtitle" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>
              Incentivos y reconocimiento al compromiso y puntualidad de nuestros colaboradores
            </p>
          </div>
        </div>

        {/* Dedicated Ranking & Leaderboard Module */}
        <RewardsLeaderboard />
      </main>
    </div>
  );
}
