import {
  useState,
  useCallback,
  MutableRefObject,
  RefObject,
  Dispatch,
  SetStateAction,
} from "react";

type MediaStreamHookProps = {
  userStream: MutableRefObject<MediaStream | undefined>;
  userVideo: RefObject<HTMLVideoElement>;
  isMicActive: boolean;
  isCameraActive: boolean;
  setIsMicActive: Dispatch<SetStateAction<boolean>>;
  setIsCameraActive: Dispatch<SetStateAction<boolean>>;
};

export const useMediaStream = ({
  userStream,
  userVideo,
  isMicActive,
  isCameraActive,
  setIsMicActive,
  setIsCameraActive,
}: MediaStreamHookProps) => {
  const handleRoomJoined = () => {
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: { width: 1280, height: 720 },
      })
      .then((stream) => {
        userStream.current = stream;
        userVideo.current!.srcObject = stream;
        userVideo.current!.onloadedmetadata = () => {
          userVideo.current!.play();
        };
      })
      .catch((err) => {
        handleMediaError(err);
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
    toggleMediaStream("audio", isMicActive);
    setIsMicActive((prev) => !prev);
  };
  const toggleCamera = () => {
    toggleMediaStream("video", isCameraActive);
    setIsCameraActive((prev) => !prev);
  };
  return {
    handleRoomJoined,
    toggleMic,
    toggleCamera,
  };
};

const handleMediaError = (err: Error) => {
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
    alert("Camera or microphone is already in use by another application.");
  } else {
    alert(
      "An error occurred while accessing media devices. Please check your settings and try again."
    );
  }
};
