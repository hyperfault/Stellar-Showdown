import { useState, type ReactNode } from 'react';
import { AppShell, type ScreenId } from '../components/AppShell';
import { QuickMatch } from '../components/QuickMatch';
import { FeaturedReplays, LadderCard, RecentBattles, YourTeams } from '../components/Panels';
import { FormatPicker } from '../formats/FormatPicker';
import { useHomeData } from '../services/useHomeData';
import { toUiTeam } from '../services/showdown';
import { useAppStore } from '../store';
import { pickTeam, useTeamStore } from '../teams/store';
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
  const [pickerOpen, setPickerOpen] = useState(false);

  // Format comes from the live server list; teams come from the local team library.
  const formatId = useAppStore((s) => s.selectedFormatId);
  const setFormat = useAppStore((s) => s.setSelectedFormat);
  const serverFormats = useAppStore((s) => s.formats);
  const entry = serverFormats.find((f) => f.id === formatId);
  const needsTeam = !!entry?.needsTeam;
  const teamFormat = entry?.teamFormat ?? formatId;
  const library = useTeamStore();
  const allTeams = library.teams.map(toUiTeam);
  const chosen = pickTeam(library, teamFormat);
  const compatible = needsTeam ? allTeams.filter((t) => t.formatId === teamFormat) : [];
  const selectedUi = needsTeam ? compatible.find((t) => t.id === chosen?.id) ?? null : null;
  const profile = data.profile && { ...data.profile, currentFormat: entry?.name ?? formatId };

  const selectTeam = (id: string) => {
    const team = library.teams.find((t) => t.id === id);
    if (!team) return;
    const target = serverFormats.find((f) => f.id === team.format);
    if (target) setFormat(target.id); // picking a team switches Quick Match to its format
    library.select(target?.teamFormat ?? team.format, id);
  };

  const navigate = (id: ScreenId) => { setActive(id); onNavigate?.(id); };

  return (
    <AppShell active={active} onNavigate={navigate} profile={profile} onLogout={onLogout} rooms={rooms} topbarExtra={topbarExtra}>
      <div className="welcome">
        <h1>Welcome back, <em>{data.profile?.username ?? '…'}</em></h1>
        <p>Ready for your next battle?</p>
      </div>
      <QuickMatch teams={compatible} selectedTeam={selectedUi} needsTeam={needsTeam}
        onSelectTeam={selectTeam} onChangeFormat={() => setPickerOpen(true)} onBuildTeam={() => navigate('teams')}
        onPlay={() => onPlay?.(formatId, chosen?.id)} searching={searching} />
      <div className="grid">
        <RecentBattles battles={data.battles} onOpen={onOpenReplay} />
        <YourTeams teams={allTeams} selectedId={selectedUi?.id} onSelect={selectTeam} />
        <div className="side">
          <LadderCard profile={profile} />
          <FeaturedReplays replays={data.replays} onOpen={onOpenReplay} />
        </div>
      </div>
      {children}
      <FormatPicker open={pickerOpen} onClose={() => setPickerOpen(false)} purpose="play" value={formatId}
        onSelect={setFormat} onOpenTeams={() => { setPickerOpen(false); navigate('teams'); }} />
    </AppShell>
  );
}
