"use client";
import adapter from "webrtc-adapter";
import Pusher, { PresenceChannel, Members } from "pusher-js";
import {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { RoomHOC } from "./RoomHOC";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

function Room({
  micActive,
  setMicActive,
  cameraActive,
  setCameraActive,
  router,
  pusherRef,
  host,
  channelRef,
  rtcConnection,
  userStream,
  userVideo,
  partnerVideo,
}: {
  micActive: boolean;
  setMicActive: Dispatch<SetStateAction<boolean>>;
  cameraActive: boolean;
  setCameraActive: Dispatch<SetStateAction<boolean>>;
  router: AppRouterInstance;
  pusherRef: MutableRefObject<Pusher | null>;
  host: MutableRefObject<boolean>;
  channelRef: MutableRefObject<PresenceChannel | null>;
  rtcConnection: MutableRefObject<RTCPeerConnection | null>;
  userStream: MutableRefObject<MediaStream | null>;
  userVideo: RefObject<HTMLVideoElement>;
  partnerVideo: RefObject<HTMLVideoElement>;
}) {
  const ICE_SERVERS = {
    // you can add TURN servers here too

    iceServers: [
      {
        urls: "stun:openrelay.metered.ca:80",
      },

      {
        urls: "stun:stun.l.google.com:19302",
      },

      {
        urls: "stun:stun2.l.google.com:19302",
      },
    ],
  };

  // Webrtc refs

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

  const initiateCall = () => {
    if (host.current) {
      rtcConnection.current = createPeerConnection();

      // Host creates offer

      userStream.current?.getTracks().forEach((track) => {
        rtcConnection.current?.addTrack(track, userStream.current!);
      });
      rtcConnection
        .current!.createOffer()
        .then((offer) => {
          rtcConnection.current!.setLocalDescription(offer);
          // 4. Send offer to other peer via pusher
          // Note: 'client-' prefix means this event is not being sent directly from the client
          // This options needs to be turned on in Pusher app settings
          channelRef.current?.trigger("client-offer", offer);
        })

        .catch((error) => {
          console.log(error);
        });
    }
  };

  const createPeerConnection = () => {
    // We create a RTC Peer Connection

    const connection = new RTCPeerConnection(ICE_SERVERS);

    // We implement our onicecandidate method for when we received a ICE candidate from the STUN server

    connection.onicecandidate = handleICECandidateEvent;

    // We implement our onTrack method for when we receive tracks

    connection.ontrack = handleTrackEvent;

    connection.onicecandidateerror = (e) => console.log(e);

    return connection;
  };

  const handleReceivedOffer = (offer: RTCSessionDescriptionInit) => {
    rtcConnection.current = createPeerConnection();
    userStream.current?.getTracks().forEach((track) => {
      // Adding tracks to the RTCPeerConnection to give peer access to it
      rtcConnection.current?.addTrack(track, userStream.current!);
    });
    rtcConnection.current.setRemoteDescription(offer);
    rtcConnection.current
      .createAnswer()

      .then((answer) => {
        rtcConnection.current!.setLocalDescription(answer);

        channelRef.current?.trigger("client-answer", answer);
      })

      .catch((error) => {
        console.log(error);
      });
  };

  const handleAnswerReceived = (answer: RTCSessionDescriptionInit) => {
    rtcConnection

      .current!.setRemoteDescription(answer)

      .catch((error) => console.log(error));
  };

  const handleICECandidateEvent = async (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate) {
      // return sentToPusher('ice-candidate', event.candidate)

      channelRef.current?.trigger("client-ice-candidate", event.candidate);
    }
  };

  const handlerNewIceCandidateMsg = (incoming: RTCIceCandidate) => {
    // We cast the incoming candidate to RTCIceCandidate

    const candidate = new RTCIceCandidate(incoming);

    rtcConnection
      .current!.addIceCandidate(candidate)
      .catch((error) => console.log(error));
  };

  const handleTrackEvent = (event: RTCTrackEvent) => {
    partnerVideo.current!.srcObject = event.streams[0];
  };

  const handlePeerLeaving = () => {
    host.current = true;

    if (partnerVideo.current?.srcObject) {
      (partnerVideo.current.srcObject as MediaStream)
        .getTracks()
        .forEach((track) => track.stop()); // Stops receiving all track of Peer.
    }

    // Safely closes the existing connection established with the peer who left.

    if (rtcConnection.current) {
      rtcConnection.current.ontrack = null;
      rtcConnection.current.onicecandidate = null;
      rtcConnection.current.close();
      rtcConnection.current = null;
    }
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

  const leaveRoom = () => {
    // socketRef.current.emit('leave', roomName); // Let's the server know that user has left the room.

    if (userVideo.current!.srcObject) {
      (userVideo.current!.srcObject as MediaStream)

        .getTracks()

        .forEach((track) => track.stop()); // Stops sending all tracks of User.
    }

    if (partnerVideo.current!.srcObject) {
      (partnerVideo.current!.srcObject as MediaStream)

        .getTracks()

        .forEach((track) => track.stop()); // Stops receiving all tracks from Peer.
    }

    // Checks if there is peer on the other side and safely closes the existing connection established with the peer.

    if (rtcConnection.current) {
      rtcConnection.current.ontrack = null;

      rtcConnection.current.onicecandidate = null;

      rtcConnection.current.close();

      rtcConnection.current = null;
    }

    router.push("/");
  };

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
  }, [
    channelRef,
    handleAnswerReceived,
    handlePeerLeaving,
    handleReceivedOffer,
    handleRoomJoined,
    handlerNewIceCandidateMsg,
    host,
    initiateCall,
    pusherRef,
    router,
  ]);

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

export default RoomHOC(Room);
