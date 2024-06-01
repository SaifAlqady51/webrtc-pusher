"use client";
import Pusher, { PresenceChannel, Members } from "pusher-js";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useMediaStream } from "@/hooks/useMediaStream";

export default function CustomedRoom() {
  const router = useRouter();
  const host = useRef(false);

  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<PresenceChannel | null>(null);

  const userStream = useRef<MediaStream>();
  const userVideo = useRef<HTMLVideoElement>(null);
  const partnerVideo = useRef<HTMLVideoElement>(null);
  const [isMicActive, setIsMicActive] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(true);

  const {
    initiateCall,
    handleReceivedOffer,
    handleAnswerReceived,
    handlerNewIceCandidateMsg,
    handlePeerLeaving,
    leaveRoom,
  } = useWebRTC({
    channelRef,
    userStream,
    partnerVideo,
    userVideo,
    host,
    router,
  });

  const { handleRoomJoined, toggleMic, toggleCamera } = useMediaStream({
    userStream,
    userVideo,
    isMicActive,
    isCameraActive,
    setIsMicActive,
    setIsCameraActive,
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
          console.log(members);
          // when subscribing, if you are the first member, you are the host

          host.current = true;
        }

        // example only supports 2 users per call

        if (members.count > 2) {
          // 3+ person joining will get sent back home

          // Can handle however you'd like
          router.push("/");
        }

        console.log("members: ", members);

        handleRoomJoined();
      }
    );
    channelRef.current.bind("client-ready", () => {
      initiateCall();
    });

    channelRef.current.bind(
      "client-offer",

      (offer: RTCSessionDescriptionInit) => {
        // offer is sent by the host, so only non-host should handle it

        if (!host.current) {
          handleReceivedOffer(offer);
        }
      }
    );

    // when a member leaves the chat

    channelRef.current.bind("pusher:member_removed", handlePeerLeaving);

    channelRef.current.bind(
      "client-answer",

      (answer: RTCSessionDescriptionInit) => {
        // answer is sent by non-host, so only host should handle it

        if (host.current) {
          handleAnswerReceived(answer as RTCSessionDescriptionInit);
        }
      }
    );

    channelRef.current.bind(
      "client-ice-candidate",

      (iceCandidate: RTCIceCandidate) => {
        // answer is sent by non-host, so only host should handle it

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
              {isMicActive ? "Mute Mic" : "UnMute Mic"}
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
              {isCameraActive ? "Stop Camera" : "Start Camera"}
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
