export default function AlignmentOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-[12%_8%] rounded-full border border-white/25" />
      <div className="absolute inset-[22%_18%] rounded-full border border-white/35" />
      <div className="absolute inset-[32%_28%] rounded-full border border-white/50" />
      <div className="absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] w-[6px] h-[6px] rounded-full bg-white" />
    </div>
  );
}
