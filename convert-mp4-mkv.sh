#!/bin/bash
for file in *.mp4;
do
    ffmpeg -i "$file" "${file}.mkv"
done

rename 's/mp4.mkv$/mkv/' *mkv

echo 'rm -v *mp4'
