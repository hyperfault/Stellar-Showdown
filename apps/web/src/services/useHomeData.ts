import { useCallback, useEffect, useState } from 'react';
import { useService } from './context';
import type { FeaturedReplay, FormatOption, PlayerProfile, RecentBattle, Team } from './types';

export interface HomeData {
  profile?: PlayerProfile; teams: Team[]; selectedTeam: Team | null; formats: FormatOption[];
  battles: RecentBattle[]; replays: FeaturedReplay[]; selectTeam: (id: string) => void;
}

export function useHomeData(): HomeData {
  const svc = useService();
  const [profile, setProfile] = useState<PlayerProfile>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelected] = useState<Team | null>(null);
  const [formats, setFormats] = useState<FormatOption[]>([]);
  const [battles, setBattles] = useState<RecentBattle[]>([]);
  const [replays, setReplays] = useState<FeaturedReplay[]>([]);

  useEffect(() => {
    let live = true;
    Promise.all([svc.getPlayerProfile(), svc.getTeams(), svc.getSelectedTeam(), svc.getFormats(), svc.getRecentBattles(), svc.getFeaturedReplays()])
      .then(([p, t, s, f, b, r]) => { if (!live) return; setProfile(p); setTeams(t); setSelected(s); setFormats(f); setBattles(b); setReplays(r); });
    return () => { live = false; };
  }, [svc]);

  const selectTeam = useCallback((id: string) => {
    setSelected(teams.find((t) => t.id === id) ?? null); // optimistic
    void svc.selectTeam(id);
  }, [svc, teams]);

  return { profile, teams, selectedTeam, formats, battles, replays, selectTeam };
}
