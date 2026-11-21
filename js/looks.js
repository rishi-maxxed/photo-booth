// Quick looks: one tap sets the design, filter, caption, font and stickers together.
// Sticker positions are fractions of the strip (x and y are the centre, size is relative to its width).

export const LOOKS = [
  {
    id: 'birthday',
    name: 'Birthday',
    design: 'mint',
    filter: 'vivid',
    caption: 'Happy Birthday!',
    font: 'comic',
    stickers: [
      { char: 'svg:props-5', x: 0.2, y: 0.14, size: 0.2, rot: -0.2 },
      { char: 'svg:burst-6', x: 0.8, y: 0.5, size: 0.24, rot: 0.2 },
      { char: 'svg:doodle-1', x: 0.82, y: 0.12, size: 0.12, rot: 0.3 }
    ]
  },
  {
    id: 'date',
    name: 'Date',
    design: 'neon',
    filter: 'noir',
    caption: 'Date night',
    font: 'marker',
    stickers: [
      { char: 'svg:props-7', x: 0.2, y: 0.2, size: 0.16, rot: -0.2 },
      { char: 'svg:doodle-2', x: 0.82, y: 0.5, size: 0.15, rot: 0.2 },
      { char: 'svg:doodle-2', x: 0.2, y: 0.8, size: 0.1, rot: -0.2 }
    ]
  },
  {
    id: 'retro',
    name: 'Retro',
    design: 'kraft',
    filter: 'vintage',
    caption: 'Good old days',
    font: 'mono',
    stickers: [
      { char: 'svg:tape-5', x: 0.16, y: 0.1, size: 0.24, rot: 0 },
      { char: 'svg:tape-6', x: 0.74, y: 0.55, size: 0.26, rot: -0.1 },
      { char: 'svg:tape-3', x: 0.27, y: 0.8, size: 0.26, rot: -0.15 }
    ]
  },
  {
    id: 'party',
    name: 'Party',
    design: 'holo',
    filter: 'vivid',
    caption: "Let's party!",
    font: 'block',
    stickers: [
      { char: 'svg:burst-2', x: 0.8, y: 0.15, size: 0.24, rot: 0.2 },
      { char: 'svg:doodle-4', x: 0.18, y: 0.45, size: 0.14, rot: -0.2 },
      { char: 'svg:props-4', x: 0.78, y: 0.8, size: 0.2, rot: 0.15 },
      { char: 'svg:doodle-3', x: 0.2, y: 0.12, size: 0.12, rot: 0 }
    ]
  },
  {
    id: 'friends',
    name: 'Friends',
    design: 'comic',
    filter: 'vivid',
    caption: 'Squad goals',
    font: 'chewy',
    stickers: [
      { char: 'svg:burst-4', x: 0.8, y: 0.15, size: 0.22, rot: 0.2 },
      { char: 'svg:burst-3', x: 0.2, y: 0.5, size: 0.22, rot: -0.2 },
      { char: 'svg:props-3', x: 0.7, y: 0.8, size: 0.2, rot: 0 }
    ]
  },
  {
    id: 'love',
    name: 'Love',
    design: 'hearts',
    filter: 'warm',
    caption: 'You and me',
    font: 'signature',
    stickers: [
      { char: 'svg:doodle-2', x: 0.18, y: 0.14, size: 0.14, rot: -0.2 },
      { char: 'svg:bubble-4', x: 0.82, y: 0.48, size: 0.2, rot: 0.15 },
      { char: 'svg:doodle-3', x: 0.2, y: 0.8, size: 0.12, rot: 0 },
      { char: 'svg:doodle-2', x: 0.8, y: 0.84, size: 0.1, rot: 0.2 }
    ]
  }
];

export function getLook(id) {
  return LOOKS.find((l) => l.id === id);
}
