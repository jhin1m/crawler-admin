import { useState, useEffect } from 'react'
import { configService, type AppConfig } from '@/services/config.service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, Plus, Save, RotateCcw, RefreshCw } from 'lucide-react'
import { toast } from 'sonner' 


export function ConfigurationPage() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [isImporting, setIsImporting] = useState(false)

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

  const handleImportProxies = async () => {
    if (!config) return
    setIsImporting(true)
    const url = 'https://rayobyte.com/proxy/dashboard/api/export/4/all/raween.silva1@gmail.com/aLpwG0WS/list.csv'
    
    try {
      let text = ''
      try {
         // Try direct fetch first
         const res = await fetch(url)
         if (!res.ok) throw new Error('Direct fetch failed')
         text = await res.text()
      } catch (e) {
         // Fallback to specific CORS proxies regardless of global setting
         // We need to fetch this CSV to even populate the list
         const proxies = [
            'https://api.codetabs.com/v1/proxy?quest=',
            'https://api.cors.lol/?url=', 
            'https://cors-anywhere.com/'
         ]
         
         let fetched = false
         for (const proxy of proxies) {
            try {
                const res = await fetch(`${proxy}${encodeURIComponent(url)}`)
                if (res.ok) {
                    text = await res.text()
                    fetched = true
                    break
                }
            } catch (err) {
                console.warn(`Proxy ${proxy} failed`, err)
            }
         }
         
         if (!fetched) throw new Error('Failed to fetch proxy list via all available CORS proxies')
      }

      if (!text) throw new Error('Empty response')

      const lines = text.split(/\r?\n/)
      const newProxies = lines
        .map(line => line.trim())
        .filter(line => line)
        .map(line => {
             // Line format: ip:port:user:pass
             // We want: http://user:pass@ip:port
             const parts = line.split(':')
             if (parts.length >= 4) {
               const [ip, port, user, pass] = parts
               return `http://${user}:${pass}@${ip}:${port}`
             }
             return null
        })
        .filter(Boolean) as string[]

      if (newProxies.length > 0) {
        setConfig({
          ...config,
          httpProxies: newProxies
        })
        toast.success(`Imported ${newProxies.length} proxies`)
      } else {
        toast.warning('No valid proxies found in response')
      }

    } catch (error) {
      console.error('Import failed', error)
      toast.error('Failed to import proxies: ' + (error as Error).message)
    } finally {
      setIsImporting(false)
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Proxy Mode</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="mode-cors"
                      name="proxyMode"
                      value="cors"
                      checked={config.proxyMode === 'cors'}
                      onChange={() => setConfig({ ...config, proxyMode: 'cors' })}
                      className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="mode-cors">CORS Proxies (Recommended for Browser)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="mode-http"
                      name="proxyMode"
                      value="http"
                      checked={config.proxyMode === 'http'}
                      onChange={() => setConfig({ ...config, proxyMode: 'http' })}
                      className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="mode-http">HTTP Proxy (Pure)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="mode-none"
                      name="proxyMode"
                      value="none"
                      checked={config.proxyMode === 'none'}
                      onChange={() => setConfig({ ...config, proxyMode: 'none' })}
                      className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="mode-none">No Proxy (Direct)</Label>
                  </div>
                </div>
              </div>

              {config.proxyMode === 'cors' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>CORS Proxies List</Label>
                      <CardDescription>Proxies used to bypass CORS restrictions. Used in rotation.</CardDescription>
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
                </div>
              )}

              {config.proxyMode === 'http' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>HTTP Proxies List</Label>
                      <CardDescription>
                        Pure HTTP proxies (e.g. http://user:pass@ip:port).
                        Used in rotation (client-side fallback to direct fetch if unsupported).
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleImportProxies}
                        disabled={isImporting}
                      >
                       <RefreshCw className={`h-4 w-4 mr-2 ${isImporting ? 'animate-spin' : ''}`} />
                       {isImporting ? 'Importing...' : 'Auto Import'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfig({ ...config, httpProxies: [...config.httpProxies, ''] })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Proxy
                      </Button>
                    </div>
                  </div>
                  {config.httpProxies.map((proxy, index) => (
                    <div key={index} className="flex gap-2">
                       <Input
                        value={proxy}
                        placeholder="http://username:password@ip:port"
                        onChange={(e) => {
                          const newProxies = [...config.httpProxies]
                          newProxies[index] = e.target.value
                          setConfig({ ...config, httpProxies: newProxies })
                        }}
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        disabled={config.httpProxies.length === 0}
                        onClick={() => {
                          const newProxies = config.httpProxies.filter((_, i) => i !== index)
                          setConfig({ ...config, httpProxies: newProxies })
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                   <p className="text-xs text-muted-foreground">
                    Note: Direct HTTP proxy usage usually requires backend support or a specific environment.
                    The browser cannot use this directly for cross-origin requests unless configured specifically.
                  </p>
                </div>
              )}
            </div>
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
