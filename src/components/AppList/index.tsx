import { useEffect } from "react";
import { Search, Loader2, Package } from "lucide-react";
import { useAppStore } from "@/store";
import { formatSize } from "@/lib/utils";

export default function AppList() {
  const {
    apps,
    loading,
    error,
    selectedApp,
    searchQuery,
    fetchApps,
    selectApp,
    setSearchQuery,
    filteredApps,
  } = useAppStore();

  useEffect(() => {
    fetchApps();
  }, []);

  const visibleApps = filteredApps();
  const hasQuery = searchQuery.trim().length > 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: 8,
        gap: 5,
        overflow: "hidden",
      }}
    >
      {/* Search */}
      <div style={{ position: "relative" }}>
        <Search
          style={{
            position: "absolute",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
            width: 12,
            height: 12,
            color: "#8A7060",
          }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索…"
          style={{
            width: "100%",
            height: 28,
            paddingLeft: 24,
            paddingRight: 8,
            borderRadius: 6,
            border: "0.5px solid #EDE0D0",
            background: "#FFF8EE",
            fontSize: 10,
            color: "#3D2C1E",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Section title */}
      {!loading && !error && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: "#3D2C1E",
            marginBottom: 2,
          }}
        >
          {hasQuery
            ? `搜索结果 · ${visibleApps.length}个`
            : `已安装软件 · ${apps.length}个`}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px 0",
              gap: 6,
            }}
          >
            <Loader2
              style={{
                width: 14,
                height: 14,
                color: "#E8A87C",
                animation: "spin 1s linear infinite",
              }}
            />
            <span style={{ fontSize: 10, color: "#8A7060" }}>
              正在读取…
            </span>
          </div>
        )}

        {error && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "40px 0",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 10, color: "#E07060" }}>{error}</span>
            <button
              onClick={() => fetchApps()}
              style={{
                background: "#E8A87C",
                color: "white",
                border: "none",
                borderRadius: 6,
                padding: "4px 12px",
                fontSize: 9,
                cursor: "pointer",
              }}
            >
              重试
            </button>
          </div>
        )}

        {!loading && !error && hasQuery && visibleApps.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "40px 0",
              gap: 4,
            }}
          >
            <Package style={{ width: 20, height: 20, color: "#EDE0D0" }} />
            <span style={{ fontSize: 10, color: "#8A7060" }}>无匹配</span>
          </div>
        )}

        {!loading &&
          !error &&
          visibleApps.map((app) => {
            const isSelected = selectedApp?.name === app.name;
            return (
              <button
                key={app.name}
                onClick={() => selectApp(isSelected ? null : app)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: isSelected ? "#FFF3E3" : "#FFF8EE",
                  border: `0.5px solid ${isSelected ? "#E8A87C" : "#EDE0D0"}`,
                  borderRadius: 6,
                  padding: "5px 8px",
                  fontSize: 10,
                  color: "#3D2C1E",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    marginRight: 8,
                  }}
                >
                  {app.name}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <span style={{ color: "#8A7060", fontSize: 9 }}>
                    {app.size_kb > 0 ? formatSize(app.size_kb) : ""}
                  </span>
                  {isSelected && (
                    <span
                      style={{
                        fontSize: 8,
                        padding: "1px 5px",
                        borderRadius: 8,
                        background: "#EAF3DE",
                        color: "#3B6D11",
                      }}
                    >
                      已选
                    </span>
                  )}
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}
