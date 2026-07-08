import { useState, useCallback } from "react"
import {
  loadBaseUrl,
  saveBaseUrl,
  loadAuthToken,
  saveAuthToken,
  checkHealth,
  submitCrawl,
} from "./api"
import "./App.css"

type TestStatus = "idle" | "loading" | "success" | "error"

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <section className="section">
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  )
}

function JsonView({ data }: { data: unknown }): React.ReactElement {
  return (
    <pre className="json-block">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function StatusBadge({ status }: { status: TestStatus }) {
  const labels: Record<TestStatus, string> = {
    idle: "Idle",
    loading: "Running…",
    success: "Success",
    error: "Error",
  }
  return <span className={`badge badge-${status}`}>{labels[status]}</span>
}

export default function App() {
  const [baseUrl, setBaseUrl] = useState(loadBaseUrl)
  const [authToken, setAuthToken] = useState(loadAuthToken)

  const [healthStatus, setHealthStatus] = useState<TestStatus>("idle")
  const [healthData, setHealthData] = useState<unknown>(null)

  const [urlsInput, setUrlsInput] = useState("")
  const [pubKeyInput, setPubKeyInput] = useState("")
  const [crawlStatus, setCrawlStatus] = useState<TestStatus>("idle")
  const [crawlData, setCrawlData] = useState<unknown>(null)

  const handleBaseUrlChange = useCallback((val: string) => {
    setBaseUrl(val)
    saveBaseUrl(val)
  }, [])

  const handleAuthTokenChange = useCallback((val: string) => {
    setAuthToken(val)
    saveAuthToken(val)
  }, [])

  const handleHealthCheck = useCallback(async () => {
    setHealthStatus("loading")
    setHealthData(null)
    try {
      const res = await checkHealth(baseUrl)
      setHealthData(res)
      setHealthStatus(res.ok ? "success" : "error")
    } catch (err) {
      setHealthData({ error: String(err) })
      setHealthStatus("error")
    }
  }, [baseUrl])

  const handleCrawl = useCallback(async () => {
    const urls = urlsInput
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
    if (urls.length === 0) return
    setCrawlStatus("loading")
    setCrawlData(null)
    try {
      const res = await submitCrawl(baseUrl, urls, pubKeyInput, authToken)
      setCrawlData(res)
      setCrawlStatus(res.ok ? "success" : "error")
    } catch (err) {
      setCrawlData({ error: String(err) })
      setCrawlStatus("error")
    }
  }, [baseUrl, authToken, urlsInput, pubKeyInput])

  return (
    <div className="app">
      <header className="header">
        <h1>
          <span className="logo">🕷️</span> Sp1d3r API Test Panel
        </h1>
        <p className="subtitle">
          Test panel for{" "}
          <code>/d31337m3/sp1d3r</code> API &mdash;{" "}
          <a
            href="https://sp1d3r.d31337m3.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            sp1d3r.d31337m3.com
          </a>
        </p>
      </header>

      <Section title="Configuration">
        <div className="field">
          <label htmlFor="baseUrl">API Base URL</label>
          <input
            id="baseUrl"
            type="text"
            value={baseUrl}
            onChange={(e) => handleBaseUrlChange(e.target.value)}
            placeholder="http://localhost:8080"
          />
        </div>
        <div className="field">
          <label htmlFor="authToken">Auth Token (optional)</label>
          <input
            id="authToken"
            type="password"
            value={authToken}
            onChange={(e) => handleAuthTokenChange(e.target.value)}
            placeholder="Bearer token for /v1/crawl"
          />
        </div>
      </Section>

      <Section title="Health Check">
        <div className="test-row">
          <code className="endpoint-label">GET /health</code>
          <button onClick={handleHealthCheck} disabled={healthStatus === "loading"}>
            {healthStatus === "loading" ? "Checking…" : "Run Health Check"}
          </button>
          <StatusBadge status={healthStatus} />
        </div>
        {healthData ? <JsonView data={healthData} /> : null}
      </Section>

      <Section title="Crawl Test">
        <div className="field">
          <label htmlFor="urls">URLs (one per line)</label>
          <textarea
            id="urls"
            rows={4}
            value={urlsInput}
            onChange={(e) => setUrlsInput(e.target.value)}
            placeholder={"https://example.com\nhttps://example.org"}
          />
        </div>
        <div className="field">
          <label htmlFor="pubKey">Recipient Public Key (hex)</label>
          <input
            id="pubKey"
            type="text"
            value={pubKeyInput}
            onChange={(e) => setPubKeyInput(e.target.value)}
            placeholder="ed25519 public key in hex"
          />
        </div>
        <div className="test-row">
          <code className="endpoint-label">POST /v1/crawl</code>
          <button onClick={handleCrawl} disabled={crawlStatus === "loading"}>
            {crawlStatus === "loading" ? "Running..." : "Run Crawl"}
          </button>
          <StatusBadge status={crawlStatus} />
        </div>
        {crawlData ? <JsonView data={crawlData} /> : null}
      </Section>

      <footer className="footer">
        <p>
          Built for{" "}
          <a
            href="https://github.com/d31337m3"
            target="_blank"
            rel="noopener noreferrer"
          >
            d31337m3_ORM_alpha
          </a>
        </p>
      </footer>
    </div>
  )
}
