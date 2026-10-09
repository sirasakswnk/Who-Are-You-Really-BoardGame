import type { RevealedEvidence, RoundState } from './types';

/** Only already revealed clues; never publish future scenarios or raw option IDs as text. */
export function revealedEvidence(round: Pick<RoundState, 'scenarios' | 'revealedAnswers'>): RevealedEvidence[] {
  return round.revealedAnswers.map(reveal => {
    const scenario = round.scenarios[reveal.clueIndex];
    return {
      clueIndex: reveal.clueIndex, scenarioId: scenario.id, scenarioVersion: scenario.version, prompt: scenario.prompt,
      answers: reveal.answers.map(id => scenario.options.find(option => option.id === id)?.label ?? 'ไม่พบข้อความคำตอบ') as [string, string],
    };
  });
}
