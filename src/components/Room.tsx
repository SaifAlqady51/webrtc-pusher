"use client";
import adapter from "webrtc-adapter"; // Adapter to handle cross-browser WebRTC compatibility
import Pusher, { PresenceChannel, Members } from "pusher-js"; // Pusher library for real-time messaging and presence channels
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation"; // Next.js router for navigation
import { useStreamHook } from "../hooks/useMediaStream"; // Custom hook for managing media stream
import { useWebRtcHook } from "@/hooks/useWebRTC"; // Custom hook for managing WebRTC connections
import { ControlButtons } from "./ControlButtons"; // Component for control buttons (mute, camera, leave)

export default function Room() {
  const router = useRouter(); // Next.js router instance for navigation
  const host = useRef(false); // Ref to track if the user is the host of the room
  const pusherRef = useRef<Pusher | null>(null); // Ref to store the Pusher instance
  const channelRef = useRef<PresenceChannel | null>(null); // Ref to store the Pusher channel instance
  const userStream = useRef<MediaStream | null>(null); // Ref to store the user's media stream
  const userVideo = useRef<HTMLVideoElement>(null); // Ref to the user's video element
  const partnerVideo = useRef<HTMLVideoElement>(null); // Ref to the partner's video element
  const [micActive, setMicActive] = useState(true); // State to track microphone activity
  const [cameraActive, setCameraActive] = useState(true); // State to track camera activity

  // Custom hook to manage media stream (toggle mic/camera, handle room join)
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

  // Custom hook to manage WebRTC connections (initiate call, handle offers/answers, ICE candidates, peer leaving)
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
    // Initialize Pusher with environment key and authentication endpoint
    pusherRef.current = new Pusher(process.env.PUSHER_KEY!, {
      authEndpoint: "/api/pusher/auth",
      auth: {
        params: { username: "saif" }, // Replace with dynamic username if needed
      },
      cluster: "eu",
    });

    // Subscribe to the presence channel
    channelRef.current = pusherRef.current.subscribe(
      `presence-room`
    ) as PresenceChannel;

    // Handle successful subscription to the channel
    channelRef.current.bind(
      "pusher:subscription_succeeded",
      (members: Members) => {
        if (members.count === 1) {
          host.current = true; // Set user as host if they are the first member
        }
        if (members.count > 2) {
          router.push("/room"); // Redirect if room exceeds capacity
        }
        handleRoomJoined(); // Perform actions after joining the room
      }
    );

    // Handle "client-ready" event to initiate call
    channelRef.current.bind("client-ready", () => {
      console.log("Client ready, initiating call...");
      initiateCall();
    });

    // Handle "client-offer" event to process received offer
    channelRef.current.bind(
      "client-offer",
      (offer: RTCSessionDescriptionInit) => {
        console.log("Received offer:", offer);
        if (!host.current) {
          handleReceivedOffer(offer);
        }
      }
    );

    // Handle peer leaving the room
    channelRef.current.bind("pusher:member_removed", handlePeerLeaving);

    // Handle "client-answer" event to process received answer
    channelRef.current.bind(
      "client-answer",
      (answer: RTCSessionDescriptionInit) => {
        console.log("Received answer:", answer);
        if (host.current) {
          handleAnswerReceived(answer as RTCSessionDescriptionInit);
        }
      }
    );

    // Handle "client-ice-candidate" event to process received ICE candidate
    channelRef.current.bind(
      "client-ice-candidate",
      (iceCandidate: RTCIceCandidate) => {
        console.log("Received ICE candidate:", iceCandidate);
        handlerNewIceCandidateMsg(iceCandidate);
      }
    );

    // Cleanup function to unbind all events and disconnect from Pusher when component unmounts
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
          <video autoPlay ref={userVideo} muted className="w-full h-full" />{" "}
          {/* User's video */}
          <ControlButtons
            toggleMic={toggleMic}
            micActive={micActive}
            leaveRoom={leaveRoom}
            toggleCamera={toggleCamera}
            cameraActive={cameraActive}
          />
        </div>

        <div className="w-1/2 h-96 bg-gray-800 rounded-xl ">
          <video autoPlay ref={partnerVideo} className="w-full h-full" />{" "}
          {/* Partner's video */}
        </div>
      </div>
    </div>
  );
}
