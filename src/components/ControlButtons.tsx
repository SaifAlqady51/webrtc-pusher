import {
  BsMicFill,
  BsMicMuteFill,
  BsCameraVideoOffFill,
  BsCameraVideoFill,
} from "react-icons/bs";
import { GoSignOut } from "react-icons/go";

type ControlButtonsProps = {
  toggleMic: () => void;
  micActive: boolean;
  leaveRoom: () => void;
  toggleCamera: () => void;
  cameraActive: boolean;
};
export function ControlButtons({
  toggleMic,
  micActive,
  leaveRoom,
  toggleCamera,
  cameraActive,
}: ControlButtonsProps) {
  return (
    <div className=" flex gap-4 absolute bottom-2 left-3">
      <button
        onClick={leaveRoom}
        type="button"
        className="bg-blue-800 hover:bg-blue-500 rounded-md p-2 opacity-70">
        <GoSignOut className="w-7 h-7" />
      </button>
      <button
        onClick={toggleMic}
        type="button"
        className="bg-blue-800  hover:bg-blue-500 rounded-md p-2 opacity-70">
        {micActive ? (
          <BsMicFill className="w-7 h-7" />
        ) : (
          <BsMicMuteFill className="w-7 h-7" />
        )}
      </button>

      <button
        onClick={toggleCamera}
        type="button"
        className="bg-blue-800   hover:bg-blue-500 rounded-md p-2 opacity-70">
        {cameraActive ? (
          <BsCameraVideoFill className="w-7 h-7" />
        ) : (
          <BsCameraVideoOffFill className="w-7 h-7 " />
        )}
      </button>
    </div>
  );
}
