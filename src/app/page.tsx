import Link from "next/link";

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <h1>Home</h1>
      <Link href="/room" className="py-2 px-4 font-semibold text-3xl">
        Join Room
      </Link>
    </div>
  );
}
