// Presentation only. Status application, ticking and cures stay in the Shell.
export const statusDetails = Object.freeze({
  poison: Object.freeze({
    name:'POISONED', effect:'Lose 1 HP', timing:'after each completed combat round or resolved noncombat room.',
    persistence:'Does not stack. Persists until cured or cleared by ordinary Heart loss.',
    removal:'Cure: Antidote or Cleanse Tonic.',
  }),
});
