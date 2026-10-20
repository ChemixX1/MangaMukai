import alexBackdrop from '../../../assets/character/alex-backdrop.webp';
import alexPortrait from '../../../assets/character/alex.webp';
import arianelBackdrop from '../../../assets/character/arianel-backdrop.webp';
import arianelPortrait from '../../../assets/character/arianel.webp';
import estrellaBackdrop from '../../../assets/character/estrella-backdrop.webp';
import estrellaPortrait from '../../../assets/character/estrella.webp';
import ravenBackdrop from '../../../assets/character/raven-backdrop.webp';
import ravenPortrait from '../../../assets/character/raven.webp';

export interface CharacterCard {

  id: string;
  label: string;
  backdrop: string;
  portrait: string;

  nameColor: string;
  nameOpacity: number;

  portraitHeight: string;
}

export const CHARACTER_CARDS: CharacterCard[] = [
  { id: 'alex', label: 'Alex', backdrop: alexBackdrop, portrait: alexPortrait, nameColor: '#fb923c', nameOpacity: 1, portraitHeight: '76%' },
  { id: 'raven', label: 'Raven', backdrop: ravenBackdrop, portrait: ravenPortrait, nameColor: '#a21caf', nameOpacity: 0.75, portraitHeight: '81%' },
  { id: 'arianel', label: 'Arianel', backdrop: arianelBackdrop, portrait: arianelPortrait, nameColor: '#0ea5e9', nameOpacity: 0.6, portraitHeight: '87%' },
  { id: 'estrella', label: 'Estrella', backdrop: estrellaBackdrop, portrait: estrellaPortrait, nameColor: '#b000ad', nameOpacity: 0.67, portraitHeight: '84%' },
];
