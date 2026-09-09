import { useLocation } from "react-router";
import { ExperimentFlowVertical } from "./experiment-flow-vertical";

// O acesso do participante é sempre por link individual, com o token no
// fragmento da URL (#token=...) — assim ele não vai parar em log de servidor.
export function ParticipantAccessPage() {
  const { hash } = useLocation();
  const token = new URLSearchParams(hash.slice(1)).get("token") ?? "";
  // h-screen dá altura ao h-full do jogo, que antes vinha do GameLayout.
  return (
    <div className="h-screen overflow-hidden">
      <ExperimentFlowVertical key={token} token={token} />
    </div>
  );
}
