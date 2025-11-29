"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shield, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"

type ModelType = "email" | "url" | "umpire"

interface ApiResponse {
  prediction: number
  confidence: number
  model_type: string
}

export default function PhishShieldPage() {
  const [inputText, setInputText] = useState("")
  const [modelType, setModelType] = useState<ModelType>("email")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheck = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to analyze")
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      // Use environment variable for base URL
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL
      const response = await fetch(`${API_BASE}/${modelType}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: inputText }),
      })

      if (!response.ok) {
        throw new Error("API request failed")
      }

      const data: ApiResponse = await response.json()
      setResult(data)
    } catch (err) {
      console.error("[v0] API error:", err)
      setError("⚠️ Could not connect to detection server")
    } finally {
      setIsLoading(false)
    }
  }

  const getModelLabel = (type: string) => {
    switch (type) {
      case "email":
        return "Email Detector"
      case "url":
        return "URL Detector"
      case "umpire":
        return "Umpire Model"
      default:
        return type
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-xl border-zinc-200 dark:border-zinc-800">
          <CardHeader className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="h-8 w-8 text-blue-600 dark:text-blue-500" />
              <CardTitle className="text-3xl font-bold text-balance">PhishAI</CardTitle>
            </div>
            <CardDescription className="text-base text-pretty">
              AI-powered phishing detector to keep you safe from malicious emails and URLs
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Input Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="input-text" className="text-sm font-medium text-foreground">
                  Content to Analyze
                </label>
                <Textarea
                  id="input-text"
                  placeholder="Paste email content or URL here…"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="min-h-32 resize-none focus-visible:ring-blue-500 dark:focus-visible:ring-blue-600"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="model-select" className="text-sm font-medium text-foreground">
                  Detection Model
                </label>
                <Select
                  value={modelType}
                  onValueChange={(value) => setModelType(value as ModelType)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="model-select" className="focus:ring-blue-500 dark:focus:ring-blue-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email Detector</SelectItem>
                    <SelectItem value="url">URL Detector</SelectItem>
                    <SelectItem value="umpire">Umpire Model</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCheck}
                disabled={isLoading || !inputText.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Check Now"
                )}
              </Button>
            </div>

            {/* Results Section */}
            {error && (
              <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
                <CardContent className="pt-6">
                  <p className="text-red-600 dark:text-red-400 font-medium text-center">{error}</p>
                </CardContent>
              </Card>
            )}

            {result && (
              <Card
                className={`border-2 ${
                  result.prediction === 1
                    ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20"
                    : "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20"
                }`}
              >
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    {result.prediction === 1 ? (
                      <>
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        <h3 className="text-xl font-bold text-red-600 dark:text-red-400">
                          🚨 Phishing / Spam Detected
                        </h3>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">✅ Safe</h3>
                      </>
                    )}
                  </div>

                  <div className="space-y-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm text-muted-foreground">Confidence:</span>
                      <span
                        className={`text-lg font-semibold ${
                          result.prediction === 1
                            ? "text-red-600 dark:text-red-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {(result.confidence * 100).toFixed(2)}%
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">Model: {getModelLabel(result.model_type)}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Protected by PhishAI • Always verify suspicious content
        </p>
      </div>
    </div>
  )
}
