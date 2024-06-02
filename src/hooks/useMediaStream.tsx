import { PresenceChannel } from "pusher-js";
import { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";

type StreamHookProps = {
  micActive: boolean;
  cameraActive: boolean;
  setMicActive: Dispatch<SetStateAction<boolean>>;
  setCameraActive: Dispatch<SetStateAction<boolean>>;
  userStream: MutableRefObject<MediaStream | null>;
  userVideo: RefObject<HTMLVideoElement>;
  host: MutableRefObject<boolean>;
  channelRef: MutableRefObject<PresenceChannel | null>;
};

export function useStreamHook({
  micActive,
  cameraActive,
  userStream,
  setMicActive,
  setCameraActive,
  userVideo,
  host,
  channelRef,
}: StreamHookProps) {
  const handleRoomJoined = () => {
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: { width: 1280, height: 720 },
      })
      .then((stream) => {
        /* use the stream */
        userStream.current = stream;
        userVideo.current!.srcObject = stream;
        userVideo.current!.onloadedmetadata = () => {
          userVideo.current!.play();
        };
        if (!host.current) {
          // the 2nd peer joining will tell to host they are ready
          console.log("triggering client ready");
          channelRef.current!.trigger("client-ready", {});
        }
      })
      .catch((err) => {
        /* handle the error */
        console.error("Error accessing media devices:", err);
        if (err.name === "NotAllowedError") {
          alert(
            "Permission to access camera and microphone was denied. Please allow access."
          );
        } else if (
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError"
        ) {
          alert(
            "No camera or microphone found. Please connect a camera and microphone."
          );
        } else if (
          err.name === "NotReadableError" ||
          err.name === "TrackStartError"
        ) {
          alert(
            "Camera or microphone is already in use by another application."
          );
        } else {
          alert(
            "An error occurred while accessing media devices. Please check your settings and try again."
          );
        }
      });
  };
  const toggleMediaStream = (type: "video" | "audio", state: boolean) => {
    userStream.current!.getTracks().forEach((track) => {
      if (track.kind === type) {
        track.enabled = !state;
      }
    });
  };

  const toggleMic = () => {
    toggleMediaStream("audio", micActive);

    setMicActive((prev) => !prev);
  };

  const toggleCamera = () => {
    toggleMediaStream("video", cameraActive);

    setCameraActive((prev) => !prev);
  };

  return {
    toggleMic,
    toggleCamera,
    handleRoomJoined,
  };
}
