import AppList from "@/components/AppList";

export default function Home() {
  return (
    <div className="flex flex-col h-full bg-[#FAF6EF]">
      <header className="shrink-0 px-6 pt-4 pb-2">
        <h1 className="text-lg font-semibold text-foreground">
          <span className="text-primary">Dusty</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">你的专属 Windows 清洁工</p>
      </header>

      <main className="flex-1 min-h-0">
        <AppList />
      </main>
    </div>
  );
}
