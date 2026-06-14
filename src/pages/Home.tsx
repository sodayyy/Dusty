import { useEffect } from "react";
import { Search } from "lucide-react";
import { useAppStore } from "@/store";
import { formatSize } from "@/lib/utils";

export default function HomePage() {
  const apps = useAppStore((s) => s.apps);
  const fetchApps = useAppStore((s) => s.fetchApps);
  const selectedApp = useAppStore((s) => s.selectedApp);
  const selectApp = useAppStore((s) => s.selectApp);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);

  useEffect(() => {
    fetchApps();
  }, []);

  const filteredApps = searchQuery.trim()
    ? apps.filter(
        (app) =>
          app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.publisher.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : apps;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", backgroundColor: "#FAF6EF" }}>
      {/* 搜索框区域 */}
      <div style={{ padding: "10px 24px", borderBottom: "0.5px solid #EDE0D0", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 36,
            padding: "0 16px",
            borderRadius: 8,
            backgroundColor: "#FFF8EE",
          }}
        >
          <Search size={16} style={{ color: "#8A7060" }} />
          <input
            type="text"
            placeholder="搜索应用..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              outline: "none",
              fontSize: 13,
              color: "#3D2C1E",
              border: "none",
            }}
          />
        </div>
        <p style={{ fontSize: 13, color: "#8A7060", marginTop: 10 }}>
          可卸载软件 · {apps.length}个
        </p>
        <p style={{ fontSize: 11, color: "#8A7060", marginTop: 4 }}>
          系统登记在册，支持深度卸载
        </p>
      </div>

      {/* 软件列表 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredApps.map((app) => {
            const isSelected = selectedApp?.name === app.name;
            return (
              <div
                key={app.name}
                onClick={() => selectApp(isSelected ? null : app)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: 44,
                  padding: "12px 16px",
                  boxSizing: "border-box",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  border: `0.5px solid ${isSelected ? "#E8A87C" : "#EDE0D0"}`,
                  backgroundColor: isSelected ? "#FFF3E3" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "#FFF8EE";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <span
                  style={{
                    color: "#3D2C1E",
                    fontWeight: 500,
                    fontSize: 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {app.name}
                </span>
                <span
                  style={{
                    color: "#8A7060",
                    fontSize: 12,
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                >
                  {formatSize(app.size_kb)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
