export const loadSettings = () => {
  try {
    const saved = localStorage.getItem('aim-champ-settings');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export const saveSettings = (settings) => {
  localStorage.setItem('aim-champ-settings', JSON.stringify(settings));
};
