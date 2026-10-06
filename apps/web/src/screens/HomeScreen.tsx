import { useEffect, useState, type ReactNode } from 'react';
import { AppShell, type ScreenId } from '../components/AppShell';
import { QuickMatch } from '../components/QuickMatch';
import { FeaturedReplays, LadderCard, RecentBattles, YourTeams } from '../components/Panels';
import { useHomeData } from '../services/useHomeData';
import '../styles/app.css';

interface Props {
  /** Wire to the existing backend: start matchmaking for this format/team. */
  onPlay?: (formatId: string, teamId?: string) => void;
  onNavigate?: (id: ScreenId) => void;
  onLogout?: () => void;
  onOpenReplay?: (id: string) => void;
  /** Integration: matchmaking in progress — Play becomes Cancel. */
  searching?: boolean;
  /** Integration: forwarded to AppShell (open rooms in the sidebar, topbar status). */
  rooms?: ReactNode;
  topbarExtra?: ReactNode;
  /** Integration: rendered after the home grid (e.g. the challenges dock). */
  children?: ReactNode;
}

export function HomeScreen({ onPlay, onNavigate, onLogout, onOpenReplay, searching, rooms, topbarExtra, children }: Props) {
  const data = useHomeData();
  const [active, setActive] = useState<ScreenId>('play');
  // Backend reality: Random Battle is the only fully playable format for now.
  const [formatId, setFormatId] = useState('gen9randombattle');

  // Quick match format follows the selected team unless changed manually.
  useEffect(() => { if (data.selectedTeam) setFormatId(data.selectedTeam.formatId); }, [data.selectedTeam]);

  const navigate = (id: ScreenId) => { setActive(id); onNavigate?.(id); };

  return (
    <AppShell active={active} onNavigate={navigate} profile={data.profile} onLogout={onLogout} rooms={rooms} topbarExtra={topbarExtra}>
      <div className="welcome">
        <h1>Welcome back, <em>{data.profile?.username ?? '…'}</em></h1>
        <p>Ready for your next battle?</p>
      </div>
      <QuickMatch teams={data.teams} selectedTeam={data.selectedTeam} formats={data.formats} formatId={formatId}
        onSelectTeam={data.selectTeam} onSelectFormat={setFormatId} onPlay={() => onPlay?.(formatId, data.selectedTeam?.id)} searching={searching} />
      <div className="grid">
        <RecentBattles battles={data.battles} onOpen={onOpenReplay} />
        <YourTeams teams={data.teams} selectedId={data.selectedTeam?.id} onSelect={data.selectTeam} />
        <div className="side">
          <LadderCard profile={data.profile} />
          <FeaturedReplays replays={data.replays} onOpen={onOpenReplay} />
        </div>
      </div>
      {children}
    </AppShell>
  );
}
