import type { TemplateDefinition } from '../types';

export const templates: TemplateDefinition[] = [
  {
    id: 'free',
    title: 'Podcast libre',
    description: 'Une structure vide pour construire librement.',
    sections: ['Mon podcast'],
  },
  {
    id: 'history',
    title: 'Reportage historique',
    description: 'Pour raconter et expliquer un événement du passé.',
    sections: ['Jingle d’introduction', 'Présentation du sujet', 'Contexte', 'Événement principal', 'Analyse', 'Conclusion', 'Jingle de fin'],
  },
  {
    id: 'interview',
    title: 'Interview',
    description: 'Introduction, questions, relances et conclusion.',
    sections: ['Introduction', 'Présentation de l’invité', 'Questions principales', 'Questions de relance', 'Conclusion'],
  },
  {
    id: 'column',
    title: 'Chronique',
    description: 'Un point de vue clair en quelques parties.',
    sections: ['Accroche', 'Sujet', 'Arguments ou exemples', 'Avis personnel', 'Conclusion'],
  },
  {
    id: 'radio',
    title: 'Émission radio',
    description: 'Une émission rythmée avec plusieurs rubriques.',
    sections: ['Jingle', 'Prise d’antenne', 'Rubrique 1', 'Transition', 'Rubrique 2', 'Conclusion et remise d’antenne'],
  },
  {
    id: 'story',
    title: 'Récit ou histoire',
    description: 'Pour créer une narration avec ambiance et bruitages.',
    sections: ['Début', 'Élément déclencheur', 'Péripéties', 'Moment décisif', 'Fin'],
  },
];
