<?php

namespace App\Services\Leech\Drivers;

use App\Services\Leech\BaseCrawler;
use Illuminate\Support\Str;

class VyvyCrawler extends BaseCrawler
{
    protected $baseUrl = 'https://vivicomi14.info';

    /**
     * Trả về URL cho trang danh sách manga
     */
    protected function getMangaListUrl($page)
    {
        return '/the-loai/18/?page=' . $page;
    }

    /**
     * Trích xuất dữ liệu manga từ HTML trang danh sách
     */
    protected function extractMangaData($html)
    {
        $crawler = $this->createDomCrawler($html);

        $mangaData = [];
        $crawler->filter('.comic-item-box')->each(function ($node) use (&$mangaData) {
            $mangaData[] = [
                'name' => $node->filter('.keywords-scroller-container:nth-child(1) a')->attr('title'),
                'link' => $node->filter('.keywords-scroller-container:nth-child(1) a')->attr('href'),
                'cover' => $node->filter('.comic-img a img')->attr('src'),
                'latest_chapter' => $node->filter('.keywords-scroller-container .comic-chapter')->text(),
            ];
        });

        return $mangaData;
    }

    /**
     * Trích xuất thông tin chi tiết manga từ HTML trang manga
     */
    protected function extractMangaDetails($html)
    {
        $crawler = $this->createDomCrawler($html);

        $name = $crawler->filter('.comic-info h2.info-title')->text();
        $slug = Str::slug($name, '-', 'en');
        $nameAlt = null;
        $artist = null;

        $crawler->filter('.comic-info .comic-intro-text strong')->each(function ($node) use (&$nameAlt, &$artist) {
            $text = trim($node->text());
            if (Str::contains($text, 'Tên khác')) {
                $next = $node->nextAll()->first();
                if ($next->count() > 0 && $next->nodeName() === 'span') {
                    $nameAlt = trim($next->text());
                }
            } elseif (Str::contains($text, 'Tác giả')) {
                $next = $node->nextAll()->first();
                if ($next->count() > 0 && $next->nodeName() === 'span') {
                    $artist = trim($next->text());
                }
            }
        });
        $status = 2; // Mặc định đang tiến hành
        $genreNames = $crawler->filter('.comic-info .tags a')->each(function ($node) {
            return $node->text();
        });
        // Thêm thể loại tùy chỉnh
        $genreNames[] = 'Con gái';

        // Kiểm tra xem selector có tồn tại không
        $pilot = null;
        if ($crawler->filter('div.margin-bottom-15px.intro-container > p')->count() > 0) {
            $pilot = $crawler->filter('div.margin-bottom-15px.intro-container > p')->text();
            // Kiểm tra nếu $pilot chứa 'Vivicomi', đặt $pilot thành null
            if (Str::contains($pilot, 'Vivicomi')) {
                $pilot = null;
            }
        }

        // Kiểm tra nếu $pilot chứa $name, đặt $pilot thành null
        if ($pilot && Str::contains($pilot, $name)) {
            $pilot = null;
        }

        $chapterLinks = $crawler->filter('div.table-scroll > table > tbody > tr > td > a')->each(function ($node) {
            return [
                'name' => $this->extractChapterNumber($node->filter('.hidden-xs')->text()),
                'link' => $node->attr('href')
            ];
        });

        $chapterLinks = array_reverse($chapterLinks);

        $coverUrl = $crawler->filter('div.col-sm-5.margin-bottom-15px > div > img')->attr('src');

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

        return $mangaData;
    }

    /**
     * Trích xuất thông tin chi tiết chapter từ HTML trang chapter
     */
    protected function extractChapterDetails($html, $chapterInfo)
    {
        // Sử dụng tên từ thông tin chapter đã có
        $name = $chapterInfo['name'];

        // Trích xuất dữ liệu được mã hóa trong HTML
        $crawler = $this->createDomCrawler($html);
        $dataEncode = $crawler->filter('#view-chapter > script')->text();
        $startPos = strpos($dataEncode, 'var htmlContent = "') + strlen('var htmlContent = "');
        $endPos = strpos($dataEncode, '";', $startPos);
        $dataEncode = substr($dataEncode, $startPos, $endPos - $startPos);

        // Giải mã nội dung HTML
        $dataEncode = stripslashes($dataEncode);
        $htmlContent = $this->cryptoJSAesDecrypt('EhwuFpSJkhMVuUPzrw', $dataEncode);
        $htmlContent = str_replace(['EhwuFp', 'SJkhMV', 'uUPzrw'], ['.', ':', '/'], $htmlContent);

        // Trích xuất các URL ảnh từ nội dung đã giải mã
        $crawler = $this->createDomCrawler($htmlContent);
        $images = $crawler->filter('img')->each(function ($node) {
            $imgUrl = urldecode(trim($node->attr('data-ehwufp')));
            return $imgUrl;
        });

        // Lọc bỏ các giá trị null
        $images = array_filter($images);

        // Xóa URL cuối của array (nếu cần)
        array_pop($images);

        $chapterData = [
            'name' => $name,
            'images' => $images,
        ];

        return $chapterData;
    }

    /**
     * Giải mã dữ liệu được mã hóa bởi CryptoJS
     */
    private function cryptoJSAesDecrypt($passphrase, $jsonString)
    {
        $jsondata = json_decode($jsonString, true);
        try {
            $salt = hex2bin($jsondata["salt"]);
            $iv = hex2bin($jsondata["iv"]);
        } catch (\Exception $e) {
            return null;
        }

        $ciphertext = base64_decode($jsondata["ciphertext"]);
        $iterations = 999; // Giống như quá trình mã hóa JS

        $key = hash_pbkdf2("sha512", $passphrase, $salt, $iterations, 64);

        return openssl_decrypt($ciphertext, 'aes-256-cbc', hex2bin($key), OPENSSL_RAW_DATA, $iv);
    }

    /**
     * Trích xuất số chapter từ tên chapter
     */
    protected function extractChapterNumber($chapterName)
    {
        // Ưu tiên lấy số sau từ "Chap" (không phân biệt hoa thường, có thể có dấu cách)
        if (preg_match('/chap\s*([\d.]+)/i', $chapterName, $matches)) {
            return floatval($matches[1]);
        }
        // Nếu không có "Chap", lấy số cuối cùng trong chuỗi
        if (preg_match_all('/(\d+(?:\.\d+)?)/', $chapterName, $allMatches)) {
            $last = end($allMatches[1]);
            return floatval($last);
        }
        return 0;
    }
}