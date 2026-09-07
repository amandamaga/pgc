import { Outlet } from "react-router";
import "../../styles/game-theme.css";

export function GameLayout() {
  return (
    <div className="w-screen h-dvh flex flex-col overflow-hidden" style={{ backgroundColor: "#F7F7F7" }}>
      <Outlet />
    </div>
  );
}
