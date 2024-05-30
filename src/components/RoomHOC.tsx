import { useRouter } from "next/navigation";
import Pusher, { PresenceChannel } from "pusher-js";
import { ReactNode, useRef, useState } from "react";

export const RoomHOC = (WrappedComponenet: any) => {
  const withStats = (props: any) => {
    const router = useRouter();
    const host = useRef(false);

    const pusherRef = useRef<Pusher | null>(null);
    const channelRef = useRef<PresenceChannel | null>(null);

    const rtcConnection = useRef<RTCPeerConnection | null>();
    const userStream = useRef<MediaStream>();
    const userVideo = useRef<HTMLVideoElement>(null);
    const partnerVideo = useRef<HTMLVideoElement>(null);

    const [micActive, setMicActive] = useState(true);

    const [cameraActive, setCameraActive] = useState(true);

    return (
      <WrappedComponenet
        {...props}
        pusherRef={pusherRef}
        channelRef={channelRef}
        rtcConnection={rtcConnection}
        userStream={userStream}
        userVideo={userVideo}
        partnerVideo={partnerVideo}
        host={host}
        micActive={micActive}
        setMicActive={setMicActive}
        cameraActive={cameraActive}
        setCameraActive={setCameraActive}
        router={router}
      />
    );
  };
  return withStats;
};
