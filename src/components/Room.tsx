"use client";
import adapter from "webrtc-adapter";
import Pusher, { PresenceChannel, Members } from "pusher-js";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStreamHook } from "../hooks/useMediaStream";
import { useWebRtcHook } from "@/hooks/useWebRTC";

export default function Room() {
  const router = useRouter();
  const host = useRef(false);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<PresenceChannel | null>(null);
  const userStream = useRef<MediaStream | null>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const partnerVideo = useRef<HTMLVideoElement>(null);
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);

  const { toggleMic, toggleCamera, handleRoomJoined } = useStreamHook({
    micActive,
    cameraActive,
    setMicActive,
    setCameraActive,
    userStream,
    userVideo,
    host,
    channelRef,
  });

  const {
    initiateCall,
    handleReceivedOffer,
    handleAnswerReceived,
    handlerNewIceCandidateMsg,
    handlePeerLeaving,
    leaveRoom,
  } = useWebRtcHook({
    host,
    userStream,
    channelRef,
    partnerVideo,
    router,
    userVideo,
  });

  useEffect(() => {
    pusherRef.current = new Pusher(process.env.PUSHER_KEY!, {
      authEndpoint: "/api/pusher/auth",
      auth: {
        params: { username: "saif" },
      },
      cluster: "eu",
    });

    channelRef.current = pusherRef.current.subscribe(
      `presence-room`
    ) as PresenceChannel;

    channelRef.current.bind(
      "pusher:subscription_succeeded",
      (members: Members) => {
        if (members.count === 1) {
          host.current = true;
        }
        if (members.count > 2) {
          router.push("/");
        }
        handleRoomJoined();
      }
    );

    channelRef.current.bind("client-ready", () => {
      initiateCall();
    });

    channelRef.current.bind(
      "client-offer",

      (offer: RTCSessionDescriptionInit) => {
        if (!host.current) {
          handleReceivedOffer(offer);
        }
      }
    );
    channelRef.current.bind("pusher:member_removed", handlePeerLeaving);
    channelRef.current.bind(
      "client-answer",

      (answer: RTCSessionDescriptionInit) => {
        if (host.current) {
          handleAnswerReceived(answer as RTCSessionDescriptionInit);
        }
      }
    );

    channelRef.current.bind(
      "client-ice-candidate",
      (iceCandidate: RTCIceCandidate) => {
        handlerNewIceCandidateMsg(iceCandidate);
      }
    );
  }, []);

  return (
    <div>
      <div className="w-full h-full flex gap-12">
        <div className="w-1/2 h-96 bg-white">
          <video autoPlay ref={userVideo} muted />

          <div className=" flex gap-4">
            <button
              onClick={toggleMic}
              type="button"
              className="bg-blue-400 rounded-md">
              {micActive ? "Mute Mic" : "UnMute Mic"}
            </button>

            <button
              onClick={leaveRoom}
              type="button"
              className="bg-blue-400 rounded-md">
              Leave
            </button>

            <button
              onClick={toggleCamera}
              type="button"
              className="bg-blue-400 rounded-md">
              {cameraActive ? "Stop Camera" : "Start Camera"}
            </button>
          </div>
        </div>

        <div className="w-1/2 h-96 bg-white">
          <video autoPlay ref={partnerVideo} />
        </div>
      </div>
    </div>
  );
}
