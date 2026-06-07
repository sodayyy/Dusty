import AppList from "@/components/AppList";

export default function Home() {
  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Header */}
      <header className="shrink-0 px-4 pt-5 pb-3">
        <h1 className="text-xl font-semibold text-foreground">
          <span className="text-primary">🧹</span> Dusty
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">你的专属 Windows 清洁工</p>
      </header>

      {/* App list */}
      <main className="flex-1 min-h-0">
        <AppList />
      </main>
    </div>
  );
}
