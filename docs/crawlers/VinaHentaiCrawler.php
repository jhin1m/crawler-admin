<?php

namespace App\Services\Leech\Drivers;

use App\Services\Leech\BaseCrawler;
use Illuminate\Support\Str;

/**
 * Crawler cho trang vinahentai.xyz
 * Trang này sử dụng HTML parsing
 */
class VinaHentaiCrawler extends BaseCrawler
{
    protected $baseUrl = 'https://vinahentai.fun';
    protected $originUrl = 'https://vinahentai.fun/';

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
        // Pattern: <a href="/truyen-hentai/{slug}">Tên truyện</a>
        $crawler->filter('a[href*="/truyen-hentai/"]')->each(function ($node) use (&$mangaData) {
            $href = $node->attr('href');
            $name = trim($node->text());

            // Bỏ qua nếu không phải link manga chính (có thể là link chapter)
            if (empty($name) || preg_match('/\/(truyen-hentai\/chapter\/[^\/]+)/', $href)) {
                return;
            }

            // Chỉ lấy link manga chính
            if (preg_match('/^\/truyen-hentai\/([^\/]+)$/', $href, $matches)) {
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
            if ($crawler->filter('h1')->count() > 0) {
                $title = $crawler->filter('h1')->text();
                // Tách tên truyện từ title (format: "Tên truyện - Vina Hentai...")
                $name = preg_replace('/ - Vina Hentai.*$/i', '', $title);
                $name = preg_replace('/ \| VinaHentai.*$/i', '', $name);
            }

            // Fallback to h1 if title parsing fails or is empty
            if (empty($name) && $crawler->filter('h1')->count() > 0) {
                $name = trim($crawler->filter('h1')->text());
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
            $crawler->filter('a[href*="/genres/"]')->each(function ($node) use (&$genreNames) {
                $genre = trim($node->text());
                if (!empty($genre) && !in_array($genre, $genreNames)) {
                    $genreNames[] = $genre;
                }
            });

            // Lấy tác giả
            $artist = null;
            $crawler->filter('a[href*="/authors/"]')->each(function ($node) use (&$artist) {
                $authorName = trim($node->text());
                if (!empty($authorName)) {
                    $artist = $artist ? $artist . ', ' . $authorName : $authorName;
                }
            });

            // Lấy mô tả (pilot)
            $pilot = null;
            $descriptionNode = $crawler->filter('strong:contains("GIỚI THIỆU")');
            if ($descriptionNode->count() > 0) {
                $parent = $descriptionNode->closest('div');
                if ($parent->count() > 0) {
                    $pilot = trim(str_replace('GIỚI THIỆU', '', $parent->text()));
                }
            }

            if (empty($pilot)) {
                $crawler->filter('div.text-sm.text-gray-400')->each(function ($node) use (&$pilot) {
                    if (empty($pilot))
                        $pilot = trim($node->text());
                });
            }


            $coverUrl = '';
            // Selector: div.rounded-lg.bg-cover
            // Selector: .relative.flex.flex-shrink-0.items-center.justify-center img
            $coverNode = $crawler->filter('.relative.flex.flex-shrink-0.items-center.justify-center img');
            if ($coverNode->count() > 0) {
                $coverUrl = $coverNode->attr('src');
                if ($coverNode->attr('data-src')) {
                    $coverUrl = $coverNode->attr('data-src');
                }
            }

            // Lấy danh sách chapter
            $chapterLinks = [];
            // Pattern: a[href*="/truyen-hentai/chapter/"]
            // Pattern: .flex-col.gap-2.overflow-y-auto a[href*="/truyen-hentai/chapter/"]
            $crawler->filter('.flex.flex-col.gap-4 a.block')->each(function ($node) use (&$chapterLinks, $slug) {
                $href = $node->attr('href');
                $chapterName = trim($node->text());

                if ($node->filter('span')->count() > 0) {
                    $chapterName = $node->filter('span')->text();
                }

                if (Str::contains($href, '/truyen-hentai/')) {
                    $chapterSlug = null;
                    if (preg_match('/chapter\/([^\?]+)/', $href, $matches)) {
                        $chapterSlug = $matches[1];
                        if (strpos($href, '?') !== false) {
                            $chapterSlug .= '-' . md5($href);
                        }
                    } else {
                        $chapterSlug = md5($href);
                    }

                    $exists = false;
                    foreach ($chapterLinks as $item) {
                        if ($item['link'] === $this->baseUrl . $href || ($href[0] !== '/' && $item['link'] === $href)) {
                            $exists = true;
                            break;
                        }
                    }

                    $fullLink = $href;
                    if (strpos($href, 'http') !== 0) {
                        $fullLink = $this->baseUrl . (strpos($href, '/') === 0 ? '' : '/') . $href;
                    }

                    if (!$exists && !empty($chapterName)) {
                        $chapterLinks[] = [
                            'name' => $chapterName,
                            'link' => $fullLink,
                            'slug' => $chapterSlug,
                        ];
                    }
                }
            });

            // Đảo ngược mảng chapter để có thứ tự từ cũ đến mới
            $chapterLinks = array_reverse($chapterLinks);

            // Status
            $status = 1; // 2: Hoàn thành, 1: Đang tiến hành
            if ($crawler->filter('a[href*="filter%5Bstatus%5D=1"]')->count() > 0) {
                $statusText = $crawler->filter('a[href*="filter%5Bstatus%5D=1"]')->text();
                if (stripos($statusText, 'hoàn thành') !== false || stripos($statusText, 'đã hoàn thành') !== false) {
                    $status = 2;
                }
            }

            $mangaData = [
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

            // print_r($mangaData);
            // exit;
            return $mangaData;

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
        try {
            $name = $chapterInfo['name'] ?? 'Unknown';
            $images = [];

            // Extract images directly from source (handling lazy load/script tags)
            if (preg_match_all('/https:\/\/cdn\.vinahentai\.fun\/[^"\'\s\\\\]+?\.(?:jpg|jpeg|png|webp)/', $html, $matches)) {
                $allImages = array_unique($matches[0]);

                // Filter for likely chapter images (usually in /manga-images/ path based on observation)
                // If this is too strict, we can relax it, but 'images-story' appear to be thumbnails/covers.
                $chapterImages = array_filter($allImages, function ($url) {
                    return strpos($url, '/manga-images/') !== false;
                });

                // If we found specific chapter images, use them. Otherwise return all found images.
                if (!empty($chapterImages)) {
                    $images = array_values($chapterImages);
                } else {
                    $images = array_values($allImages);
                }
            }

            $chapterImg = [
                'name' => $name,
                'images' => $images,
            ];

            // print_r($chapterImg);
            // exit;

            return $chapterImg;

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
     */
    protected function getImageDownloadHeaders($imageUrl, $chapterUrl = null)
    {
        return [
            'User-Agent' => $this->getUserAgent(),
            'Accept' => 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language' => 'en,en-US;q=0.9,vi;q=0.8',
            'Referer' => 'https://vinahentai.xyz/',
            'Cache-Control' => 'no-cache',
            'Pragma' => 'no-cache',
            'DNT' => '1'
        ];
    }

    /**
     * Override downloadAndSaveCover để sử dụng headers phù hợp
     */
    public function downloadAndSaveCover($coverUrl, $mangaId, $mangaSlug = null)
    {
        if ($this->storageType === 'hotlink') {
            $this->command->info("\n[COVER] Sử dụng URL gốc: {$coverUrl}");
            return 'hotlink:' . $coverUrl;
        }

        try {
            $client = $this->useProxyForImages ? $this->createClient() : $this->createClientWithoutProxy();
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

                $chapterName = $chapter['name'];
                $chapterOrder = $index + 1;
                $chapterSlug = \Illuminate\Support\Str::slug($chapterName, '-', 'en');

                $existingChapter = \App\Models\Chapter::where('manga_id', $manga->id)
                    ->where(function ($query) use ($chapterName, $chapterSlug) {
                        $query->where('name', $chapterName)
                            ->orWhere('slug', $chapterSlug);
                    })
                    ->first();

                if ($existingChapter) {
                    if ($existingChapter->order > $maxOrder) {
                        $maxOrder = $existingChapter->order;
                        $lastChapterId = $existingChapter->id;
                    }
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
                        $dbChapter = \App\Models\Chapter::create([
                            'id' => $chapterId,
                            'manga_id' => $manga->id,
                            'user_id' => config('const.admin_user_id', '327273ff-557e-4914-9c36-d292a80c65a4'),
                            'name' => $chapterName,
                            'slug' => $chapterSlug,
                            'order' => $chapterOrder,
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
