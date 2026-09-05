import { useState } from "react";

export default function InteractionPlayground() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [message, setMessage] = useState("");

  function handleDoubleClick() {
    setMessage("Double click detected");
  }

  function handleContextMenu(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    setMessage("Right click detected");
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Interaction Playground</h1>

      {/* Hover */}
      <div
        onMouseEnter={() => setMenuOpen(true)}
        onMouseLeave={() => setMenuOpen(false)}
      >
        <button>Profile</button>

        {menuOpen && (
          <div>
            <button>Settings</button>
            <button>Logout</button>
          </div>
        )}
      </div>

      {/* Focus / Blur */}
      <input
        aria-label="Focus Input"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />

      <p>{focused ? "Input focused" : "Input not focused"}</p>

      {/* Keyboard */}
      <input
        aria-label="Keyboard Input"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setMessage("Enter pressed");
          }

          if (e.key === "Escape") {
            setMessage("Escape pressed");
          }
        }}
      />

      {/* Double click */}
      <button onDoubleClick={handleDoubleClick}>Double Click Me</button>

      {/* Right click */}
      <button onContextMenu={handleContextMenu}>Right Click Me</button>

      {/* Modifier */}
      <button
        onClick={(e) => {
          if (e.ctrlKey) {
            setMessage("Ctrl + Click detected");
          } else {
            setMessage("Normal click detected");
          }
        }}
      >
        Modifier Button
      </button>

      {/* Drag & Drop */}
      <div>
        <h2>Drag & Drop</h2>

        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", "Job A");
          }}
          style={{
            padding: 20,
            border: "1px solid black",
            width: 150,
          }}
        >
          Job A
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const job = e.dataTransfer.getData("text/plain");
            setMessage(`${job} dropped successfully`);
          }}
          style={{
            marginTop: 20,
            padding: 40,
            border: "2px dashed black",
          }}
        >
          Drop Job Here
        </div>
      </div>

      {/* Scroll target */}
      <div style={{ height: 1200 }}>
        <p>Scroll down...</p>

        <button
          style={{ marginTop: 1000 }}
          onClick={() => setMessage("Bottom button clicked")}
        >
          Bottom Button
        </button>
      </div>

      {/* Result */}
      <h2 role="status">{message}</h2>
    </div>
  );
}
