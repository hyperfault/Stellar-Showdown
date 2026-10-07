import { useState } from 'react';
import { TeamEditor } from '../teambuilder/TeamEditor';
import { TeamLibrary } from '../teambuilder/TeamLibrary';

/** Team Builder: library of teams, and the editor for one team. */
export default function TeamsScreen() {
  const [editing, setEditing] = useState<string | null>(null);
  return editing
    ? <TeamEditor teamId={editing} onBack={() => setEditing(null)} />
    : <TeamLibrary onOpen={setEditing} />;
}
