import { useState, useEffect } from 'react'
import { configService, type AppConfig } from '@/services/config.service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, Plus, Save, RotateCcw } from 'lucide-react'
import { toast } from 'sonner' 

export function ConfigurationPage() {
  const [config, setConfig] = useState<AppConfig | null>(null)

  useEffect(() => {
    setConfig(configService.getConfig())
  }, [])

  const handleSave = () => {
    if (config) {
      configService.saveConfig(config)
      toast.success('Configuration saved successfully')
    }
  }

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      configService.resetConfig()
      setConfig(configService.getConfig())
      toast.info('Configuration reset to defaults')
    }
  }

  if (!config) return null

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuration</h1>
        <p className="text-muted-foreground mt-2">Manage your crawler settings and proxies.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Crawler Sources</CardTitle>
            <CardDescription>Configure base URLs for each source. Changes take effect on next crawl.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="vinaHeantai">VinaHentai URL</Label>
              <Input
                id="vinaHeantai"
                value={config.crawlers.vinaHeantai.baseUrl}
                onChange={(e) => setConfig({
                  ...config,
                  crawlers: {
                    ...config.crawlers,
                    vinaHeantai: { ...config.crawlers.vinaHeantai, baseUrl: e.target.value }
                  }
                })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vyvy">Vyvy URL</Label>
              <Input
                id="vyvy"
                value={config.crawlers.vyvy.baseUrl}
                onChange={(e) => setConfig({
                  ...config,
                  crawlers: {
                    ...config.crawlers,
                    vyvy: { ...config.crawlers.vyvy, baseUrl: e.target.value }
                  }
                })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="truyenVn">TruyenVN URL</Label>
              <Input
                id="truyenVn"
                value={config.crawlers.truyenVn.baseUrl}
                onChange={(e) => setConfig({
                  ...config,
                  crawlers: {
                    ...config.crawlers,
                    truyenVn: { ...config.crawlers.truyenVn, baseUrl: e.target.value }
                  }
                })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="viHentai">ViHentai URL</Label>
              <Input
                id="viHentai"
                value={config.crawlers.viHentai.baseUrl}
                onChange={(e) => setConfig({
                  ...config,
                  crawlers: {
                    ...config.crawlers,
                    viHentai: { ...config.crawlers.viHentai, baseUrl: e.target.value }
                  }
                })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                 <CardTitle>CORS Proxies</CardTitle>
                 <CardDescription>Manage proxies used to bypass CORS restrictions. Used in rotation.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfig({ ...config, corsProxies: [...config.corsProxies, ''] })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Proxy
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.corsProxies.map((proxy, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={proxy}
                  placeholder="https://proxy.example.com/?url="
                  onChange={(e) => {
                    const newProxies = [...config.corsProxies]
                    newProxies[index] = e.target.value
                    setConfig({ ...config, corsProxies: newProxies })
                  }}
                />
                <Button
                  variant="destructive"
                  size="icon"
                  disabled={config.corsProxies.length === 1}
                  onClick={() => {
                    const newProxies = config.corsProxies.filter((_, i) => i !== index)
                    setConfig({ ...config, corsProxies: newProxies })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={handleReset}>
             <RotateCcw className="h-4 w-4 mr-2" />
             Reset Defaults
          </Button>
          <Button onClick={handleSave}>
             <Save className="h-4 w-4 mr-2" />
             Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
