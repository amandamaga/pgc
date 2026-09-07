import { ReactNode } from "react";

interface StimulusCardProps {
  characterAImage?: string;
  characterBImage?: string;
  situation: string;
  distributorSide: string;
}

export function StimulusCard({ 
  characterAImage, 
  characterBImage, 
  situation,
  distributorSide 
}: StimulusCardProps) {
  const isLeftDistributor = distributorSide === "Esquerda";

  return (
    <div
      className="bg-white rounded-3xl p-6 border-2 border-b-[5px]"
      style={{ borderColor: "#E5E5E5" }}
    >
      {/* Characters */}
      <div className="flex items-center justify-center gap-8 mb-6">
        {/* Character A */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {characterAImage ? (
              <img
                src={characterAImage}
                alt="Personagem A"
                className="w-24 h-24 rounded-full object-cover border-4"
                style={{ borderColor: "#1CB0F6" }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full border-4 flex items-center justify-center text-3xl"
                style={{ backgroundColor: "#E3F4FD", borderColor: "#1CB0F6" }}
              >
                👤
              </div>
            )}
            {isLeftDistributor && (
              <div
                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black text-white border-2"
                style={{ backgroundColor: "#FFD900", borderColor: "#CE9200", color: "#7A5800" }}
              >
                Distribuidor
              </div>
            )}
          </div>
          <span
            className="mt-4 font-nunito font-bold text-sm"
            style={{ color: "#AFAFAF" }}
          >
            Personagem A
          </span>
        </div>

        {/* Divider */}
        <div
          className="w-px h-20"
          style={{ backgroundColor: "#E5E5E5" }}
        />

        {/* Character B */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {characterBImage ? (
              <img
                src={characterBImage}
                alt="Personagem B"
                className="w-24 h-24 rounded-full object-cover border-4"
                style={{ borderColor: "#58CC02" }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full border-4 flex items-center justify-center text-3xl"
                style={{ backgroundColor: "#F0FFF4", borderColor: "#58CC02" }}
              >
                👤
              </div>
            )}
            {!isLeftDistributor && (
              <div
                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black border-2"
                style={{ backgroundColor: "#FFD900", borderColor: "#CE9200", color: "#7A5800" }}
              >
                Distribuidor
              </div>
            )}
          </div>
          <span
            className="mt-4 font-nunito font-bold text-sm"
            style={{ color: "#AFAFAF" }}
          >
            Personagem B
          </span>
        </div>
      </div>

      {/* Situation Text */}
      <div
        className="text-center p-4 rounded-2xl border-2"
        style={{ backgroundColor: "#F7F7F7", borderColor: "#E5E5E5" }}
      >
        <p
          className="font-nunito text-lg leading-relaxed"
          style={{ color: "#3C3C3C" }}
        >
          {situation}
        </p>
      </div>
    </div>
  );
}