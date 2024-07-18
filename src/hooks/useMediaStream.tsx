import { PresenceChannel } from "pusher-js";
import { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";

// Define the type for the props that the useStreamHook will use
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

// Define the useStreamHook function
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
  // Function to handle actions when a room is joined
  const handleRoomJoined = () => {
    // Request access to user's media devices (microphone and camera)
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: { width: 1280, height: 720 },
      })
      .then((stream) => {
        // Set the user's stream to the obtained media stream
        userStream.current = stream;
        userVideo.current!.srcObject = stream;

        // Play the video when metadata is loaded
        userVideo.current!.onloadedmetadata = () => {
          userVideo.current!.play();
        };

        // If not the host, trigger a client-ready event
        if (!host.current) {
          console.log("triggering client ready");
          channelRef.current!.trigger("client-ready", {});
        }
      })
      .catch((err) => {
        // Handle errors that occur while accessing media devices
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

  // Function to toggle media stream (audio/video) on or off
  const toggleMediaStream = (type: "video" | "audio", state: boolean) => {
    userStream.current!.getTracks().forEach((track) => {
      if (track.kind === type) {
        track.enabled = !state;
      }
    });
  };

  // Function to toggle the microphone on or off
  const toggleMic = () => {
    toggleMediaStream("audio", micActive);
    setMicActive((prev) => !prev);
  };

  // Function to toggle the camera on or off
  const toggleCamera = () => {
    toggleMediaStream("video", cameraActive);
    setCameraActive((prev) => !prev);
  };

  // Return the functions to be used outside the hook
  return {
    toggleMic,
    toggleCamera,
    handleRoomJoined,
  };
}
