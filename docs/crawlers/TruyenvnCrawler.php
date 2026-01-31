<?php

namespace App\Services\Leech\Drivers;

use App\Services\Leech\BaseCrawler;
use Illuminate\Support\Str;

class TruyenvnCrawler extends BaseCrawler
{
    protected $baseUrl = 'https://truyenvn.shop'; // URL nguồn LxManga

    /**
     * Trả về URL cho trang danh sách manga
     */
    protected function getMangaListUrl($page)
    {
        return '/the-loai/truyen-tranh-18/page/' . $page;
    }

    /**
     * Trích xuất dữ liệu manga từ HTML trang danh sách
     */
    protected function extractMangaData($html)
    {
        $crawler = $this->createDomCrawler($html);

        $mangaData = [];
        $crawler->filter('.page-item-detail.manga')->each(function ($node) use (&$mangaData) {
            $mangaData[] = [
                'name' => $node->filter('.item-thumb a')->attr('title'),
                'link' => $node->filter('.post-title h3 a')->attr('href'),
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

        $name = $crawler->filter('.post-title h1')->text();
        $slug = Str::slug($name, '-', 'en');
        $nameAlt = null;
        $artist = null;
        $status = 2;
        $genreNames = $crawler->filter('.genres-content a')->each(function ($node) {
            return $node->text();
        });
        if ($crawler->filter('.summary__content p')->count() == 0) {
            $pilot = null;
        } else {
            $pilot = $crawler->filter('.summary__content p')->text();
        }

        if (Str::contains($pilot, $name)) {
            $pilot = null;
        }

        // $urlAjax = $crawler->filter('div.c-breadcrumb-wrapper > div > ol > li:nth-child(4) > a')->attr('href') . 'ajax/chapters/';

        // $client = new Client(['verify' => false]);
        // $response = $client->post($urlAjax, [
        //     'form_params' => [
        //         'action' => 'manga_get_chapters'
        //     ]
        // ]);

        // $chaptersHtml = (string) $response->getBody();
        // $chaptersCrawler = new \Symfony\Component\DomCrawler\Crawler($chaptersHtml);
        $chapterLinks = $crawler->filter('.wp-manga-chapter > a')->each(function ($node) {
            return [
                'name' => $node->text(),
                'link' => $node->attr('href')
            ];
        });

        $chapterLinks = array_reverse($chapterLinks);

        $coverUrl = $crawler->filter('meta[property="og:image"]')->eq(1)->attr('content');

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
        $crawler = $this->createDomCrawler($html);

        // Sử dụng thông tin chapter từ danh sách đã có
        $name = $chapterInfo['name'];
        $images = $crawler->filter('.reading-content img')->each(function ($node) {
            return trim($node->attr('src'));
        });

        $images = array_filter($images, function ($image) {
            return !Str::contains($image, 'www.w3.org');
        });

        $chapterContent = [
            'name' => $name,
            'images' => $images,
        ];

        return $chapterContent;
    }
}