/**
 * A small built-in prompt pack so a game can start without anyone typing
 * anything. Hosts can replace or extend it in the lobby.
 */
export const DEFAULT_PROMPTS: readonly string[] = [
  'The worst thing to whisper during a hug',
  'A terrible name for a new breakfast cereal',
  'The real reason the dinosaurs went extinct',
  'Something you should never say to your boss',
  'What the cat is actually planning',
  'A bad superpower to discover you have',
  'The worst possible thing to find in your shoe',
  'What aliens will think of us',
  'A terrible theme for a birthday party',
  'The most useless invention of the future',
  'What your phone would say if it could talk',
  'The worst advice to give a new parent',
  'A suspiciously specific fortune cookie',
  'The worst thing to hear from your dentist',
  'What really happens at 3 a.m. in a hotel',
  'A terrible thing to say at a wedding',
  'The next big reality TV show',
  'Something you should never microwave',
  'The worst thing to find in a rental car',
  'What the pigeons are organizing',
  'A bad reason to call the fire department',
  'The true identity of the person in the moon',
  'The worst thing to bring to a potluck',
  'A terrible slogan for a funeral home',
  'What your houseplants are judging you for',
  'The worst possible job interview answer',
  'A bad thing to find at the bottom of the ocean',
  'The real reason the printer is always broken',
  'What a dog would order at a restaurant',
  'A terrible thing to say when you win the lottery',
  'The worst way to describe the internet to a caveman',
  'Something suspicious to hear from your GPS',
  'A bad name for a very fast snail',
  'The worst thing to say to a ghost',
  'What the vending machine is thinking',
  'A terrible place to fall asleep',
  'The worst thing to find in a library book',
  'A bad superpower for a plumber',
  'What your reflection does when you leave',
  'The worst group chat to be accidentally added to',
];

/** Split a textarea into clean prompts. */
export function parsePrompts(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export function promptsToText(prompts: readonly string[]): string {
  return prompts.join('\n');
}
