
export interface AppConfig {
  crawlers: {
    vinaHeantai: {
      baseUrl: string
    }
    vyvy: {
      baseUrl: string
    }
    truyenVn: {
      baseUrl: string
    }
    viHentai: {
      baseUrl: string
    }
  }
  corsProxies: string[]
}

const DEFAULT_CONFIG: AppConfig = {
  crawlers: {
    vinaHeantai: {
      baseUrl: 'https://vinahentai.fun'
    },
    vyvy: {
      baseUrl: 'https://vivicomi14.info'
    },
    truyenVn: {
      baseUrl: 'https://truyenvn.shop'
    },
    viHentai: {
      baseUrl: 'https://vi-hentai.moe'
    }
  },
  corsProxies: [
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://api.cors.lol/?url=',
    'https://cors-anywhere.com/'
  ]
}

const STORAGE_KEY = 'app_config_v1'

export const configService = {
  getConfig(): AppConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) }
      }
    } catch (e) {
      console.error('Failed to load config', e)
    }
    return DEFAULT_CONFIG
  },

  saveConfig(config: AppConfig) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  },

  resetConfig() {
    localStorage.removeItem(STORAGE_KEY)
  },
  
  // Helpers for individual consumers
  getVinaHentaiUrl() {
    return this.getConfig().crawlers.vinaHeantai.baseUrl
  },

  getVyvyUrl() {
    return this.getConfig().crawlers.vyvy.baseUrl
  },

  getTruyenVnUrl() {
    return this.getConfig().crawlers.truyenVn.baseUrl
  },

  getViHentaiUrl() {
    return this.getConfig().crawlers.viHentai.baseUrl
  },

  getCorsProxies() {
    return this.getConfig().corsProxies
  }
}
