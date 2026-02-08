import { useRouteError } from "react-router-dom";

export default function RouteError() {
  const err: any = useRouteError();
  return (
    <div style={{ padding: 24, color: "#fff", background: "#111", minHeight: "100vh" }}>
      <h2>Route Error</h2>
      <pre className="whitespace-pre-wrap">
        {err instanceof Error ? err.stack || err.message : JSON.stringify(err, null, 2)}
      </pre>
    </div>
  );
}
