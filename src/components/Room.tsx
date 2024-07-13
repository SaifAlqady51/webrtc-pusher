"use client";
import adapter from "webrtc-adapter";
import Pusher, { PresenceChannel, Members } from "pusher-js";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStreamHook } from "../hooks/useMediaStream";
import { useWebRtcHook } from "@/hooks/useWebRTC";
import { ControlButtons } from "./ControlButtons";

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
          router.push("/room");
        }
        handleRoomJoined();
      }
    );

    channelRef.current.bind("client-ready", () => {
      console.log("Client ready, initiating call...");
      initiateCall();
    });

    channelRef.current.bind(
      "client-offer",
      (offer: RTCSessionDescriptionInit) => {
        console.log("Received offer:", offer);
        if (!host.current) {
          handleReceivedOffer(offer);
        }
      }
    );

    channelRef.current.bind("pusher:member_removed", handlePeerLeaving);

    channelRef.current.bind(
      "client-answer",
      (answer: RTCSessionDescriptionInit) => {
        console.log("Received answer:", answer);
        if (host.current) {
          handleAnswerReceived(answer as RTCSessionDescriptionInit);
        }
      }
    );

    channelRef.current.bind(
      "client-ice-candidate",
      (iceCandidate: RTCIceCandidate) => {
        console.log("Received ICE candidate:", iceCandidate);
        handlerNewIceCandidateMsg(iceCandidate);
      }
    );

    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all();
        channelRef.current.unsubscribe();
      }
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div>
      <div className="w-full h-full flex gap-12">
        <div className="w-1/2 h-96 bg-gray-800 rounded-xl relative ">
          <video autoPlay ref={userVideo} muted className="w-full h-full" />

          <ControlButtons
            toggleMic={toggleMic}
            micActive={micActive}
            leaveRoom={leaveRoom}
            toggleCamera={toggleCamera}
            cameraActive={cameraActive}
          />
        </div>

        <div className="w-1/2 h-96 bg-gray-800 rounded-xl ">
          <video autoPlay ref={partnerVideo} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}
