export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in h-full">
      {children}
    </div>
  );
}
