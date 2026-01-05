// Local avatar images from pics folder
export const AVATARS = [
  { id: 'manas', image: '/pics/manas.png' },
  { id: 'avatar1', image: '/pics/Screenshot 2026-01-05 184222.png' },
  { id: 'avatar2', image: '/pics/Screenshot 2026-01-05 184242.png' },
  { id: 'avatar3', image: '/pics/Screenshot 2026-01-05 184251.png' },
  { id: 'avatar4', image: '/pics/Screenshot 2026-01-05 184317.png' },
  { id: 'avatar5', image: '/pics/Screenshot 2026-01-05 184328.png' },
  { id: 'avatar6', image: '/pics/Screenshot 2026-01-05 184347.png' },
  { id: 'avatar7', image: '/pics/Screenshot 2026-01-05 184406.png' },
  { id: 'avatar8', image: '/pics/Screenshot 2026-01-05 184426.png' },
  { id: 'avatar9', image: '/pics/Screenshot 2026-01-05 184453.png' },
  { id: 'avatar10', image: '/pics/Screenshot 2026-01-05 184505.png' },
];

export const getAvatarById = (id: string) => {
  return AVATARS.find(a => a.id === id) || AVATARS[0];
};
