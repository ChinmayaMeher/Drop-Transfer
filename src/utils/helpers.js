export const generateId = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) id += "-";
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
};

export const timeAgo = (ts) => {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
};
