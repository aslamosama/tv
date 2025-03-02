#!/bin/bash

# Paths
MOVIE_JSON="series.json"
COVERS_DIR="covers"

# Check dependencies
if ! command -v jq &>/dev/null || ! command -v fzf &>/dev/null; then
    echo "❌ Required tools (jq, fzf) are missing. Install them first!"
    exit 1
fi

while true; do
    # Step 1: Select an image from the covers folder
    selected_image=$(ls "$COVERS_DIR" | fzf \
        --prompt="🎞 Select an image: " \
        --preview="fuz-preview $COVERS_DIR/{}" \
        --preview-window=right:60%:wrap \
        --layout=reverse --border --info=inline)

    # Check if an image was selected
    if [[ -z "$selected_image" ]]; then
        echo "❌ No image selected. Exiting."
        exit 0
    fi

    echo "📷 Selected image: $selected_image"

    # Step 2: Select a movie title from JSON
    selected_title=$(jq -r 'keys[]' "$MOVIE_JSON" | fzf \
        --prompt="🎬 Select a movie for this image: " \
        --height=40% --layout=reverse --border --info=inline)

    # Check if a title was selected
    if [[ -z "$selected_title" ]]; then
        echo "❌ No title selected. Skipping."
        continue
    fi

    # Format filename to be lowercase and hyphenated
    formatted_name=$(echo "$selected_title" | tr '[:upper:]' '[:lower:]' | tr ' ' '_').jpg

    # Rename the selected image
    mv "$COVERS_DIR/$selected_image" "$COVERS_DIR/$formatted_name"
    echo "✅ Renamed: $selected_image → $formatted_name"

    # Update JSON file with the new cover path
    jq --arg title "$selected_title" --arg cover "$COVERS_DIR/$formatted_name" \
        '.[$title].cover = $cover' "$MOVIE_JSON" > tmp.json && mv tmp.json "$MOVIE_JSON"

    echo "🔄 Updated JSON for: $selected_title"

    # # Ask if the user wants to assign another cover
    # read -p "▶️ Assign another cover? (y/n): " choice
    # if [[ "$choice" != "y" ]]; then
    #     echo "🎉 Cover assignment complete!"
    #     exit 0
    # fi
done
