import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PresenceChannel } from "pusher-js";
import { useRef, useCallback, MutableRefObject, RefObject } from "react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:openrelay.metered.ca:80" },
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

type WebRTCHookProps = {
  channelRef: MutableRefObject<PresenceChannel | null>;
  userStream: MutableRefObject<MediaStream | undefined>;
  partnerVideo: RefObject<HTMLVideoElement>;
  userVideo: RefObject<HTMLVideoElement>;
  host: MutableRefObject<boolean>;
  router: AppRouterInstance;
};

export const useWebRTC = ({
  channelRef,
  userStream,
  userVideo,
  partnerVideo,
  host,
  router,
}: WebRTCHookProps) => {
  const rtcConnection = useRef<RTCPeerConnection | null>();

  const createPeerConnection = () => {
    const connection = new RTCPeerConnection(ICE_SERVERS);

    connection.onicecandidate = handleICECandidateEvent;
    connection.ontrack = handleTrackEvent;
    connection.onicecandidateerror = (e) => console.log(e);

    return connection;
  };

  const handleICECandidateEvent = async (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate) {
      channelRef.current?.trigger("client-ice-candidate", event.candidate);
    }
  };

  const handleTrackEvent = (event: RTCTrackEvent) => {
    partnerVideo.current!.srcObject = event.streams[0];
  };

  const leaveRoom = () => {
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
    if (rtcConnection.current) {
      rtcConnection.current.ontrack = null;
      rtcConnection.current.onicecandidate = null;
      rtcConnection.current.close();
      rtcConnection.current = null;
    }
    router.push("/");
  };

  const initiateCall = () => {
    if (host.current) {
      rtcConnection.current = createPeerConnection();

      userStream.current?.getTracks().forEach((track) => {
        rtcConnection.current?.addTrack(track, userStream.current!);
      });

      rtcConnection.current
        .createOffer()
        .then((offer) => {
          rtcConnection.current!.setLocalDescription(offer);
          channelRef.current?.trigger("client-offer", offer);
        })
        .catch((error) => {
          console.log(error);
        });
    }
  };

  const handleReceivedOffer = (offer: RTCSessionDescriptionInit) => {
    rtcConnection.current = createPeerConnection();

    userStream.current?.getTracks().forEach((track) => {
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
    rtcConnection.current!.setRemoteDescription(answer).catch((error) => {
      console.log(error);
    });
  };

  const handlerNewIceCandidateMsg = (incoming: RTCIceCandidate) => {
    const candidate = new RTCIceCandidate(incoming);

    rtcConnection.current!.addIceCandidate(candidate).catch((error) => {
      console.log(error);
    });
  };

  const handlePeerLeaving = () => {
    host.current = true;

    if (partnerVideo.current?.srcObject) {
      (partnerVideo.current.srcObject as MediaStream)
        .getTracks()
        .forEach((track) => track.stop());
    }

    if (rtcConnection.current) {
      rtcConnection.current.ontrack = null;
      rtcConnection.current.onicecandidate = null;
      rtcConnection.current.close();
      rtcConnection.current = null;
    }
  };

  return {
    rtcConnection,
    initiateCall,
    handleReceivedOffer,
    handleAnswerReceived,
    handlerNewIceCandidateMsg,
    handlePeerLeaving,
    leaveRoom,
  };
};
