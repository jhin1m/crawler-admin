<?php

namespace App\Services\Leech\Drivers;

use App\Services\Leech\BaseCrawler;
use Illuminate\Support\Str;

/**
 * Crawler cho trang vi-hentai.org
 * Trang này sử dụng HTML parsing
 */
class ViHentaiCrawler extends BaseCrawler
{
    protected $baseUrl = 'https://vi-hentai.moe';
    protected $originUrl = 'https://vi-hentai.moe/';
    /**
     * Trả về URL cho trang danh sách manga
     */
    protected function getMangaListUrl($page)
    {
        return 'danh-sach?page=' . $page;
    }

    /**
     * Trích xuất dữ liệu manga từ HTML trang danh sách
     */
    protected function extractMangaData($html)
    {
        $crawler = $this->createDomCrawler($html);

        $mangaData = [];

        // Tìm các link manga trong danh sách
        // Pattern: <a href="/truyen/{slug}">Tên truyện</a>
        $crawler->filter('a[href*="/truyen/"]')->each(function ($node) use (&$mangaData) {
            $href = $node->attr('href');
            $name = trim($node->text());

            // Bỏ qua nếu không phải link manga chính (có thể là link chapter)
            if (empty($name) || preg_match('/\/(truyen\/[^\/]+)\//', $href)) {
                return;
            }

            // Chỉ lấy link manga chính (không có chapter slug)
            if (preg_match('/^\/truyen\/([^\/]+)$/', $href, $matches)) {
                $slug = $matches[1];

                // Kiểm tra xem đã có trong danh sách chưa (tránh trùng lặp)
                $exists = false;
                foreach ($mangaData as $item) {
                    if ($item['link'] === $this->baseUrl . $href) {
                        $exists = true;
                        break;
                    }
                }

                if (!$exists && !empty($name) && strlen($name) > 2) {
                    $mangaData[] = [
                        'name' => $name,
                        'link' => $this->baseUrl . $href,
                        'slug' => $slug,
                    ];
                }
            }
        });

        return $mangaData;
    }

    /**
     * Trích xuất thông tin chi tiết manga từ HTML trang manga
     */
    protected function extractMangaDetails($html)
    {
        $crawler = $this->createDomCrawler($html);

        try {
            // Lấy tên truyện từ breadcrumb hoặc title
            $name = null;
            if ($crawler->filter('title')->count() > 0) {
                $title = $crawler->filter('title')->text();
                // Tách tên truyện từ title (format: "Tên truyện - Việt Hentai...")
                $name = preg_replace('/ - Việt Hentai.*$/', '', $title);
            }

            if (empty($name)) {
                $this->command->warn('[PARSE] Không tìm thấy tên manga');
                return null;
            }

            $slug = Str::slug($name, '-', 'en');

            // Lấy tên thay thế
            $nameAlt = null;

            // Lấy thể loại
            $genreNames = [];
            $crawler->filter('.mt-2.flex.flex-wrap.gap-1 a[href*="/the-loai/"]')->each(function ($node) use (&$genreNames) {
                $genre = trim($node->text());
                if (!empty($genre) && !in_array($genre, $genreNames)) {
                    $genreNames[] = $genre;
                }
            });

            // Lấy tác giả
            $artist = null;
            $crawler->filter('.mt-2.flex.flex-wrap.gap-1 a[href*="/tac-gia/"]')->each(function ($node) use (&$artist) {
                $authorName = trim($node->text());
                if (!empty($authorName)) {
                    $artist = $artist ? $artist . ', ' . $authorName : $authorName;
                }
            });

            // Lấy mô tả (pilot)
            $pilot = null;

            $style = $crawler->filter('div.rounded-lg.bg-cover')->attr('style');
            preg_match('/url\([\'"]?(.*?)?[\'"]?\)/', $style, $matches);

            $coverUrl = $matches[1] ?? '';

            // Lấy danh sách chapter
            $chapterLinks = [];
            $crawler->filter('.overflow-y-auto.overflow-x-hidden a[href*="/truyen/"]')->each(function ($node) use (&$chapterLinks, $slug) {
                $href = $node->attr('href');
                $chapterName = $node->filter('span.text-ellipsis')->text();

                // Chỉ lấy link chapter (có pattern /truyen/{manga-slug}/{chapter-slug})
                if (preg_match('/^\/truyen\/[^\/]+\/([^\/]+)$/', $href, $matches)) {
                    $chapterSlug = $matches[1];

                    // Kiểm tra xem đã có trong danh sách chưa
                    $exists = false;
                    foreach ($chapterLinks as $item) {
                        if ($item['link'] === $this->baseUrl . $href) {
                            $exists = true;
                            break;
                        }
                    }

                    if (!$exists && !empty($chapterName) && strlen($chapterName) > 1) {
                        $chapterLinks[] = [
                            'name' => $chapterName,
                            'link' => $this->baseUrl . $href,
                            'slug' => $chapterSlug,
                        ];
                    }
                }
            });

            // Đảo ngược mảng chapter để có thứ tự từ cũ đến mới
            $chapterLinks = array_reverse($chapterLinks);

            // Status - mặc định là đang tiến hành
            $status = 2; // 1: Hoàn thành, 2: Đang tiến hành

            // Kiểm tra tình trạng
            if ($crawler->filter('a[href*="filter%5Bstatus%5D=1"]')->count() > 0) {
                $statusText = $crawler->filter('a[href*="filter%5Bstatus%5D=1"]')->text();
                if (stripos($statusText, 'hoàn thành') !== false || stripos($statusText, 'đã hoàn thành') !== false) {
                    $status = 1;
                }
            }

            return [
                'name' => $name,
                'name_alt' => $nameAlt,
                'artist' => $artist,
                'status' => $status,
                'genres' => $genreNames,
                'pilot' => $pilot,
                'chapters' => $chapterLinks,
                'cover_url' => $coverUrl,
                'slug' => $slug,
            ];

        } catch (\Exception $e) {
            $this->command->error("[PARSE] Lỗi khi parse manga details: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Trích xuất thông tin chi tiết chapter từ HTML trang chapter
     */
    protected function extractChapterDetails($html, $chapterInfo, $client = null)
    {
        $crawler = $this->createDomCrawler($html);

        try {
            // Lấy tên chapter
            $name = $chapterInfo['name'] ?? 'Unknown';

            // Tìm tất cả các thẻ img trong trang
            $images = [];
            $crawler->filter('img')->each(function ($node) use (&$images) {
                $src = $node->attr('src');

                // Chỉ lấy ảnh từ img.shousetsu.dev hoặc các CDN khác
                if (
                    !empty($src) && (
                        strpos($src, 'img.shousetsu.dev') !== false ||
                        strpos($src, '/images/data/') !== false
                    )
                ) {
                    // Đảm bảo URL đầy đủ
                    if (strpos($src, 'http') !== 0) {
                        $src = 'https:' . $src;
                    }

                    $images[] = $src;
                }
            });

            // Nếu không tìm thấy ảnh, thử tìm trong attribute data-src
            if (empty($images)) {
                $crawler->filter('img[data-src]')->each(function ($node) use (&$images) {
                    $src = $node->attr('data-src');

                    if (
                        !empty($src) && (
                            strpos($src, 'img.shousetsu.dev') !== false ||
                            strpos($src, '/images/data/') !== false
                        )
                    ) {
                        if (strpos($src, 'http') !== 0) {
                            $src = 'https:' . $src;
                        }

                        $images[] = $src;
                    }
                });
            }

            return [
                'name' => $name,
                'images' => array_values(array_unique($images)),
            ];

        } catch (\Exception $e) {
            $this->command->error("[PARSE] Lỗi khi parse chapter details: " . $e->getMessage());
            return [
                'name' => $chapterInfo['name'] ?? 'Unknown',
                'images' => [],
            ];
        }
    }

    /**
     * Override headers cho download ảnh
     * CDN Cloudflare của vi-hentai chỉ cần Referer đơn giản, không cần Origin
     */
    protected function getImageDownloadHeaders($imageUrl, $chapterUrl = null)
    {
        return [
            'User-Agent' => $this->getUserAgent(),
            'Accept' => 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language' => 'en,en-US;q=0.9,vi;q=0.8',
            'Accept-Encoding' => 'gzip, deflate, br',
            'Referer' => 'https://vi-hentai.moe/',
            'Cache-Control' => 'no-cache',
            'Pragma' => 'no-cache',
            'Sec-Fetch-Dest' => 'image',
            'Sec-Fetch-Mode' => 'no-cors',
            'Sec-Fetch-Site' => 'cross-site',
            'DNT' => '1'
        ];
    }

    /**
     * Override downloadAndSaveCover để sử dụng headers phù hợp với vi-hentai CDN
     */
    public function downloadAndSaveCover($coverUrl, $mangaId, $mangaSlug = null)
    {
        // Nếu sử dụng chế độ hotlink, trả về trực tiếp URL ảnh
        if ($this->storageType === 'hotlink') {
            $this->command->info("\n[COVER] Sử dụng URL gốc: {$coverUrl}");
            return 'hotlink:' . $coverUrl;
        }

        try {
            // Sử dụng client với proxy hoặc không tùy theo cấu hình
            $client = $this->useProxyForImages ? $this->createClient() : $this->createClientWithoutProxy();

            // Sử dụng headers từ getImageDownloadHeaders
            $headers = $this->getImageDownloadHeaders($coverUrl);

            $response = $client->request('GET', $coverUrl, [
                'verify' => false,
                'headers' => $headers,
            ]);

            $coverData = $response->getBody()->getContents();

            // Xử lý ảnh bìa với các cấu hình resize và nén
            $image = \Intervention\Image\ImageManagerStatic::make($coverData);

            // Áp dụng resize cố định cho ảnh bìa (400px)
            $image->resize(400, null, function ($constraint) {
                $constraint->aspectRatio();
            });

            // Áp dụng nén nếu được bật
            if ($this->compressImages) {
                $image = $image->encode('jpg', $this->compressQuality);
            } else {
                $image = $image->encode('jpg', 90);
            }

            // Tạo đường dẫn tùy theo storage type
            $fileName = $mangaSlug ? "{$mangaSlug}.jpg" : "{$mangaId}.jpg";

            if ($this->storageType === 's3') {
                $coverPath = "images/covers/{$fileName}";
                \Illuminate\Support\Facades\Storage::disk('s3')->put($coverPath, (string) $image, 'public');
                $fullUrl = config('app.aws_custom_url') . '/' . $coverPath;
                $this->command->info("[COVER] Lưu ảnh bìa lên S3 thành công");
                return $fullUrl;
            } elseif ($this->storageType === 'sftp') {
                $coverPath = "images/covers/{$fileName}";
                \Illuminate\Support\Facades\Storage::disk('sftp')->put($coverPath, (string) $image, 'public');
                $fullUrl = config('filesystems.disks.sftp.url') . '/' . $coverPath;
                $this->command->info("[COVER] Lưu ảnh bìa lên SFTP thành công");
                return $fullUrl;
            } else {
                // Local storage - sử dụng public disk
                $coverPath = "images/covers/{$fileName}";
                \Illuminate\Support\Facades\Storage::disk('public')->put($coverPath, (string) $image);
                $this->command->info("[COVER] Lưu ảnh bìa thành công");
                return $coverPath;
            }
        } catch (\Exception $e) {
            $this->command->error("[COVER] Lỗi khi tải ảnh bìa: " . $e->getMessage());

            // Thử lại không dùng proxy nếu đang sử dụng proxy và cấu hình cho phép
            if ($this->useProxyForImages && $this->retryWithoutProxy) {
                $this->command->warn("[COVER] Thử lại tải ảnh bìa không sử dụng proxy...");

                try {
                    $client = $this->createClientWithoutProxy();
                    $headers = $this->getImageDownloadHeaders($coverUrl);

                    $response = $client->request('GET', $coverUrl, [
                        'verify' => false,
                        'headers' => $headers,
                    ]);

                    $coverData = $response->getBody()->getContents();
                    $image = \Intervention\Image\ImageManagerStatic::make($coverData);

                    $image->resize(400, null, function ($constraint) {
                        $constraint->aspectRatio();
                    });

                    if ($this->compressImages) {
                        $image = $image->encode('jpg', $this->compressQuality);
                    } else {
                        $image = $image->encode('jpg', 90);
                    }

                    // Tạo đường dẫn tùy theo storage type
                    $fileName = $mangaSlug ? "{$mangaSlug}.jpg" : "{$mangaId}.jpg";

                    if ($this->storageType === 's3') {
                        $coverPath = "images/covers/{$fileName}";
                        \Illuminate\Support\Facades\Storage::disk('s3')->put($coverPath, (string) $image, 'public');
                        $fullUrl = config('app.aws_custom_url') . '/' . $coverPath;
                        $this->command->info("[COVER] Lưu ảnh bìa lên S3 thành công (không sử dụng proxy)");
                        return $fullUrl;
                    } elseif ($this->storageType === 'sftp') {
                        $coverPath = "images/covers/{$fileName}";
                        \Illuminate\Support\Facades\Storage::disk('sftp')->put($coverPath, (string) $image, 'public');
                        $fullUrl = config('filesystems.disks.sftp.url') . '/' . $coverPath;
                        $this->command->info("[COVER] Lưu ảnh bìa lên SFTP thành công (không sử dụng proxy)");
                        return $fullUrl;
                    } else {
                        // Local storage - sử dụng public disk
                        $coverPath = "images/covers/{$fileName}";
                        \Illuminate\Support\Facades\Storage::disk('public')->put($coverPath, (string) $image);
                        $this->command->info("[COVER] Lưu ảnh bìa thành công (không sử dụng proxy)");
                        return $coverPath;
                    }
                } catch (\Exception $e2) {
                    $this->command->error("[COVER] Lỗi khi tải ảnh bìa (không sử dụng proxy): " . $e2->getMessage());
                    return null;
                }
            }

            return null;
        }
    }

    /**
     * Override crawlFromUrl để sử dụng tên gốc của chapter và order theo index
     */
    public function crawlFromUrl($url, $storageType = 'public')
    {
        $this->setStorageType($storageType);
        try {
            $response = $this->makeRequest('GET', $url);
            if (!$response) {
                $this->command->error("Không thể tải thông tin manga từ URL: $url");
                $this->logFailedMangaUrl($url);
                return;
            }

            $html = (string) $response->getBody();
            $mangaDetails = $this->extractMangaDetails($html);
            $mangaDetails['crawler'] = $this;

            $manga = $this->processor->updateOrCreateManga($mangaDetails);

            if (!$manga) {
                return;
            }
            $this->processor->attachGenres($manga, $mangaDetails['genres']);

            // KHÔNG sắp xếp lại - giữ nguyên thứ tự từ website
            $maxOrder = 0;
            $lastChapterId = null;
            $hasUpdatedChapter = false;
            $totalChapters = count($mangaDetails['chapters']);

            $this->command->info("[CHAPTER] {$totalChapters} chapter cho manga: {$manga->name}");

            $chapterBar = $this->command->getOutput()->createProgressBar($totalChapters);
            $chapterBar->setFormat(' %current%/%max% [%bar%] %percent:3s%% - %message%');
            $chapterBar->setMessage('Chuẩn bị xử lý...');
            $chapterBar->start();

            $processedChapters = 0;

            foreach ($mangaDetails['chapters'] as $index => $chapter) {
                $processedChapters++;
                $chapterBar->setMessage("Đang xử lý: " . $chapter['name']);

                // Sử dụng tên gốc và order theo index (bắt đầu từ 1)
                $chapterName = $chapter['name'];
                $chapterOrder = $index + 1;
                $chapterSlug = \Illuminate\Support\Str::slug($chapterName, '-', 'en');

                // Kiểm tra chapter đã tồn tại
                $existingChapter = \App\Models\Chapter::where('manga_id', $manga->id)
                    ->where(function ($query) use ($chapterName, $chapterSlug) {
                        $query->where('name', $chapterName)
                            ->orWhere('slug', $chapterSlug);
                    })
                    ->first();

                if ($existingChapter) {
                    $chapterBar->advance();
                    continue;
                }

                try {
                    $client = $this->createClient(true);
                    $chapterResponse = $client->request('GET', $chapter['link']);
                    $chapterHtml = (string) $chapterResponse->getBody();

                    $chapterData = $this->extractChapterDetails($chapterHtml, $chapter, $client);
                    $imageUrls = $chapterData['images'];
                    $chapterId = \Ramsey\Uuid\Uuid::uuid4()->toString();

                    if (empty($imageUrls)) {
                        $chapterBar->advance();
                        continue;
                    }

                    $downloadedImages = $this->downloadImagesAsync($imageUrls, $manga->id, $chapterId, $manga->slug, $chapterSlug, $this->useProxyForImages, $chapter['link']);

                    if (
                        ($this->useProxyForImages && $this->retryWithoutProxy) &&
                        (empty($downloadedImages) || count($downloadedImages) < count($imageUrls) * 0.5)
                    ) {
                        $this->command->warn("[Chapter] Không đủ ảnh tải được. Thử lại không dùng proxy...");
                        $downloadedImages = $this->downloadImagesAsync($imageUrls, $manga->id, $chapterId, $manga->slug, $chapterSlug, false, $chapter['link']);
                    }

                    if (!empty($downloadedImages)) {
                        // Tạo chapter với tên gốc và order theo index
                        $dbChapter = \App\Models\Chapter::create([
                            'id' => $chapterId,
                            'manga_id' => $manga->id,
                            'user_id' => config('const.admin_user_id', '327273ff-557e-4914-9c36-d292a80c65a4'),
                            'name' => $chapterName, // Giữ nguyên tên gốc
                            'slug' => $chapterSlug,
                            'order' => $chapterOrder, // Order theo index
                            'content' => implode("\r\n", $downloadedImages),
                        ]);
                        $dbChapter->save();

                        $this->command->info("[CHAPTER] Đã lưu: " . $dbChapter->name);

                        if ($dbChapter) {
                            $hasUpdatedChapter = true;

                            if ($dbChapter->order > $maxOrder) {
                                $maxOrder = $dbChapter->order;
                                $lastChapterId = $dbChapter->id;
                            }
                        }
                    }

                } catch (\Exception $e) {
                    $this->command->error("[Chapter] Xử lý chapter thất bại: " . $chapter['name'] . " - Lỗi: " . $e->getMessage());
                }

                $chapterBar->advance();
                usleep(200000);
            }

            $chapterBar->setMessage("Hoàn thành xử lý tất cả chapter");
            $chapterBar->finish();
            $this->command->newLine(2);

            if ($hasUpdatedChapter || (!$manga->last_chapter_id && $lastChapterId)) {
                $manga->last_chapter_id = $lastChapterId;
                $manga->save();
                $this->processor->invalidateCache($manga);
            }

            $this->command->info("Hoàn thành crawl manga từ URL: {$url}");

        } catch (\Exception $e) {
            $this->command->error('Request failed: ' . $e->getMessage());
            $this->logFailedMangaUrl($url);
        }
    }
}
