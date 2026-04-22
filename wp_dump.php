<?php
$dirs = ['/home/u889203727/domains/mangamukai.com/public_html/wp-content/themes', '/home/u889203727/domains/mangamukai.com/public_html/wp-content/plugins'];
$found = [];

function search_dir($dir, $text)
{
    global $found;
    $files = glob($dir . '/*');
    foreach ($files as $file) {
        if (is_dir($file)) {
            search_dir($file, $text);
        } else if (pathinfo($file, PATHINFO_EXTENSION) === 'php') {
            $content = file_get_contents($file);
            if (stripos($content, $text) !== false) {
                $found[] = $file;
            }
        }
    }
}

foreach ($dirs as $d) {
    search_dir($d, 'ero_bookmark_count');
}
print_r($found);
