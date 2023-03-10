#!/bin/bash

# For some reason the Discord api call the "On End" event of an audio file too soon.
# a lot of people have described this issue on the internet but none have found a solution.
# A dirty but functional workaround is to add 2 seconds of blank audio to the end of the file.
#
# This bash script adds a few seconds of blank audio to a mp3 file (see $BLANK_DURATION)
BLANK_DURATION=3 # in seconds

# Get the path of the script
# https://stackoverflow.com/a/246128/104380
workingDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

filename=$1
initialSoundDir=$2
extendedSoundDir=$3

# # Check if source is a directory
# if [ ! -d "$initialSoundDir" ]; then
#     echo "Source $initialSoundDir is not a directory"
#     exit 1;
# fi

# # Check if destination is a directory
# if [ ! -d "$extendedSoundDir" ]; then
#     echo "Destination $extendedSoundDir is not a directory"
#     exit 1;
# fi

filePath="$initialSoundDir/$filename"
extendedFilePath="$extendedSoundDir/$filename"

# Check if sox is installed on the system
command -v sox >/dev/null 2>&1 || { echo >&2 "I require sox but it's not installed.\nInstall it with > apt install sox && apt-get install libsox-fmt-mp3\n\nAborting."; exit 1; }
echo -e "Processing $filePath with base file at $initialSoundDir and destination at $extendedSoundDir"

# Check if file is a not mp3 file
if [[ $filename != *.mp3 ]]; then
    echo "Skipping $filename (not an mp3 file)"
    exit 1;
fi

# # Check if the file exist
# # TODO Why does that fail ????
# if [ -f "$filePath" ]; then
#     echo "$filePath does not exist"
#     exit 1;
# fi

# # Check if the file is already extended
# # TODO Why does that SOMETIMES fail ???? I know it worked before
# if [ -f "$extendedFilePath" ]; then
#     echo "Skipping $filename (already extended)"
#     exit 0;
# fi

# Get number of channels and sampleRate
echo "reading audio file info at $filePath"
channels=$(soxi -c "$filePath")
sampleRate=$(soxi -r "$filePath")
blankFileName="$workingDir/blank/blank-$channels-$sampleRate.mp3"
echo "channels: $channels"
echo "sampleRate: $sampleRate Hz"

# Check if the blank audio file already exists and create it if it doesn't
if [ ! -f "$blankFileName" ]; then
    echo "Creating $BLANK_DURATION sec blank file ($channels channel(s), $sampleRate Hz) at $blankFileName"
    sox -n -r $sampleRate -c $channels $blankFileName trim 0 $BLANK_DURATION
fi

# Add blank audio to the end of the file
sox "$filePath" "$blankFileName" "$extendedFilePath"

if [ $? -ne 0 ]; then # if sox ended in error
    echo "Unable to add blank audio from $filePath to $extendedFilePath"
else
    echo "Extended version successfully created at $extendedFilePath"
fi
