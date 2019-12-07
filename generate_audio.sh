#!/usr/bin/env bash

MEDIA_FILE_PATH=server/media

#rm -rf ${MEDIA_FILE_PATH}
mkdir -p ${MEDIA_FILE_PATH}

# Ref http://mobilehackerz.jp/archive/wiki/index.php?%BA%C7%BF%B7ffmpeg%A4%CE%A5%AA%A5%D7%A5%B7%A5%E7%A5%F3%A4%DE%A4%C8%A4%E1
ffmpeg \
    -i files/test4.wav \
    -codec:a aac \
    -b:a 64k \
    -vn \
    -hls_list_size 0 \
    -hls_base_url http://localhost:8080/ \
    -hls_flags append_list \
    server/media/index.m3u8
