import { useState } from "react";

const emojiCategories = {
  smileys: {
    icon: "😊",
    title: "Smileys & Emotion",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
      "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️",
      "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓",
      "🤗", "🤔", "🫣", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🫠", "😴", "🤤", "😪", "😵", "🤢", "🤮", "🤧", "😷", "😈"
    ]
  },
  people: {
    icon: "👋",
    title: "People & Gestures",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️",
      "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🧠", "👀", "👅", "👄"
    ]
  },
  animals: {
    icon: "🐱",
    title: "Animals & Nature",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐒", "🐔", "🐧", "🐦", "🐤",
      "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🕸️", "🕷️", "🐢", "🐍", "🐙", "🐬"
    ]
  },
  food: {
    icon: "🍎",
    title: "Food & Drink",
    emojis: [
      "🍏", "🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍒", "🍑", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🌽", "🥕", "🥔",
      "🍞", "🥐", "🧀", "🥚", "🍳", "🥓", "🥩", "🍗", "🌭", "🍔", "🍟", "🍕", "🥪", "🌮", "🍣", "🍿", "🍩", "🍪", "🎂", "☕"
    ]
  },
  activities: {
    icon: "⚽",
    title: "Activities & Sports",
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", " volleyball", "🎱", "🏓", " Badminton", "🏒", "🥊", "🥋", "🏆", "🛹", "🛼", "⛷️", "🏋️", "🧘", "🏄"
    ]
  },
  travel: {
    icon: "🚗",
    title: "Travel & Places",
    emojis: [
      "🚗", "🚕", "🚙", "🚌", "🏎️", "🚓", "🚑", "🚒", "🚐", "🚚", "🚜", "🛵", "🚲", "🛴", "⚓", "⛵", "🚤", "🚢", "✈️", "🚀"
    ]
  },
  objects: {
    icon: "💡",
    title: "Objects & Symbols",
    emojis: [
      "⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "💿", "📷", "🎥", "📺", "📻", "🎙️", "⏰", "🔋", "🔌", "💡", "🔦", "💵", "✉️"
    ]
  },
  hearts: {
    icon: "❤️",
    title: "Hearts & Flags",
    emojis: [
      "❤️", "🩷", "🧡", "💛", "💚", "💙", "🩵", "💜", "🖤", "🩶", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗"
    ]
  }
};

export default function EmojiPicker({ onSelectEmoji }) {
  const [activeTab, setActiveTab] = useState("smileys");
  const [searchQuery, setSearchQuery] = useState("");

  const handleEmojiClick = (emoji) => {
    onSelectEmoji(emoji);
  };

  // Build a list of all emojis for search
  const allEmojis = Object.values(emojiCategories).flatMap((cat) => cat.emojis);

  // Filter emojis based on search
  const filteredEmojis = searchQuery
    ? allEmojis.filter((emoji) => emoji.includes(searchQuery)) // A primitive search, but works well for basic input
    : emojiCategories[activeTab].emojis;

  return (
    <div
      style={{
        background: "#222e35",
        border: "1px solid #374248",
        borderRadius: "8px",
        width: "320px",
        height: "320px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
        zIndex: 1000,
        position: "absolute",
        bottom: "64px",
        left: "12px",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search Input */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #2f3b43" }}>
        <input
          type="text"
          placeholder="Search emoji..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: "#111b21",
            border: "none",
            borderRadius: "6px",
            color: "#d1d7db",
            fontSize: "13px",
            padding: "8px 12px",
            width: "100%",
            outline: "none",
          }}
        />
      </div>

      {/* Tabs */}
      {!searchQuery && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            background: "#111b21",
            padding: "4px 8px",
            borderBottom: "1px solid #2f3b43",
          }}
        >
          {Object.entries(emojiCategories).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              title={cat.title}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
                padding: "4px 6px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: activeTab === key ? "#222e35" : "transparent",
                transition: "background 0.2s",
              }}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 12px",
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gap: "8px",
          alignContent: "start",
        }}
      >
        {filteredEmojis.map((emoji, index) => (
          <button
            key={index}
            onClick={() => handleEmojiClick(emoji)}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "22px",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.1s, background 0.1s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#2f3b43")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            {emoji}
          </button>
        ))}
        {filteredEmojis.length === 0 && (
          <div
            style={{
              gridColumn: "span 8",
              textAlign: "center",
              color: "#8696a0",
              fontSize: "13px",
              paddingTop: "20px",
            }}
          >
            No emojis found
          </div>
        )}
      </div>
    </div>
  );
}
