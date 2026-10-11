import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import DecidingView from '../../../components/game/DecidingView';
import type { RoleId, DecisionAction } from '../../../lib/game/types';
import type { SuspicionNotes, NoteTag } from '../../../lib/client/roundNotes';
import '../../../app/globals.css';

type State = { myRole: RoleId | null; roleContextKey: string; actionBlocked: boolean; clueIndex: number };
type Control = {
  calls: DecisionAction[];
  set: (props: Partial<State>) => void;
  reject?: () => void;
  resolve?: () => void;
};
declare global { interface Window { decidingHarness: Control } }
const control: Control = { calls: [], set: () => {} };
window.decidingHarness = control;

function Harness() {
  const [state, setState] = useState<State>({ myRole: 'alien', roleContextKey: 'match-one:round-one', actionBlocked: false, clueIndex: 0 });
  const [notes, setNotes] = useState<SuspicionNotes>({});
  useEffect(() => {
    control.set = props => setState(previous => ({ ...previous, ...props }));
  }, []);
  const toggle = (role: RoleId, tag: NoteTag) => setNotes(previous => {
    const next = { ...previous };
    if (next[role] === tag) delete next[role]; else next[role] = tag;
    return next;
  });
  return <div className="room-page-layout"><div className="game-screen-wrapper">
    <main className="game-main-content" key={`${state.roleContextKey}:${state.clueIndex}`}>
      <DecidingView {...state} mySeat={0} roleAcknowledged={true} hasGuessed={false} hasSubmitted={false}
        myGuessedRole={null} myGuessedClueIndex={null} scratchpad={notes} onToggleNote={toggle}
        onSubmitDecision={decision => {
          control.calls.push(decision);
          return new Promise<void>((resolve, reject) => { control.resolve = resolve; control.reject = () => reject(new Error('test failure')); });
        }} />
    </main>
  </div></div>;
}
createRoot(document.getElementById('deciding-harness')!).render(<Harness />);
