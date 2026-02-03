import { TruyenVnCrawler } from './truyenvn'
import { VyvyCrawler } from './vyvy'
import { VinaHentaiCrawler } from './vinahentai'
import type { CrawlerImplementation } from './crawler.interface'
import type { CrawlerSource } from '@/types/crawler.types'

const crawlers: Record<CrawlerSource, CrawlerImplementation> = {
  truyenvn: new TruyenVnCrawler(),
  vyvy: new VyvyCrawler(),
  vinahentai: new VinaHentaiCrawler()
}

export function getCrawler(source: CrawlerSource): CrawlerImplementation {
  const crawler = crawlers[source]
  if (!crawler) {
    throw new Error(`Crawler source '${source}' not implemented`)
  }
  return crawler
}

export * from './crawler.interface'
export * from './truyenvn'
export * from './vyvy'
export * from './vinahentai'
export * from './utils'

