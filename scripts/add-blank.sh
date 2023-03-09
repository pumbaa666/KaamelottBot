#!/bin/bash

# This bash script is for adding 2 seconds of blank audio to each audio file in a folder

# Check if sox is installed on the system
command -v sox >/dev/null 2>&1 || { echo >&2 "I require sox but it's not installed.\nInstall it with > apt install sox && apt-get install libsox-fmt-mp3\n\nAborting."; exit 1; }

blankDuration=2 # in seconds
soundDir="./sounds"
extendedSoundDir="./sounds-extended"
files=($(ls $soundDir))

for file in "${files[@]}"
do
    echo -e "\nProcessing $file"
    fileFullPath="$soundDir/$file"
    extendedFileFullPath="$extendedSoundDir/$file"

    # Check if file is a not mp3 file
    if [[ $file != *.mp3 ]]; then
        echo "Skipping $file (not an mp3 file)"
        continue;
    fi

    # Check if the file is already extended
    if [ -f "$extendedFileFullPath" ]; then
        echo "Skipping $file (already extended)"
        continue;
    fi

    # Get number of channels and sampleRate
    channels=$(soxi -c "$fileFullPath")
    sampleRate=$(soxi -r "$fileFullPath")
    blankFileName="blank-$channels-$sampleRate.mp3"

    # Check if the blank audio file already exists and create it if it doesn't
    if [ ! -f "$blankFileName" ]; then
        echo "Creating $blankDuration sec blank file ($channels channel(s), $sampleRate Hz)"
        sox -n -r $sampleRate -c $channels $blankFileName trim 0 $blankDuration
    fi

    # Add blank audio to the end of the file
    echo "Adding $blankFileName at the end of $file ($blankDuration sec))"
    sox "$fileFullPath" "$blankFileName" "$extendedFileFullPath"

    # if sox ended in error
    # if [ $? -ne 0 ]; then
    #     echo "Unable to add blank audio to $fileFullPath"
    # fi
done
