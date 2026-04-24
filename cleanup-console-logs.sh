#!/bin/bash

# Remove console.log statements from all JavaScript files

echo "🧹 Starting console.log removal process..."

# Function to remove console statements from a file
remove_console_logs() {
  local file="$1"

  # Check if file exists
  if [ ! -f "$file" ]; then
    echo "❌ File not found: $file"
    return 1
  fi

  # Replace console.log, console.error, console.warn, console.info, console.debug
  # Using sed with -i flag for in-place editing
  sed -i.bak \
    -e "/console\.log(/d" \
    -e "/console\.error(/d" \
    -e "/console\.warn(/d" \
    -e "/console\.info(/d" \
    -e "/console\.debug(/d" \
    "$file"

  # Remove backup file
  rm -f "${file}.bak"

  echo "✅ Cleaned: $file"
}

echo ""
echo "📁 Processing backend controllers..."
for file in backend/controllers/*.js; do
  remove_console_logs "$file"
done

echo ""
echo "📁 Processing backend middleware..."
for file in backend/middleware/*.js; do
  remove_console_logs "$file"
done

echo ""
echo "📁 Processing backend routes..."
for file in backend/routes/*.js; do
  remove_console_logs "$file"
done

echo ""
echo "📁 Processing backend config..."
for file in backend/config/*.js; do
  remove_console_logs "$file"
done

echo ""
echo "📁 Processing frontend components..."
for file in components/*.tsx components/**/*.tsx; do
  if [ -f "$file" ]; then
    remove_console_logs "$file"
  fi
done

echo ""
echo "✨ Console.log removal complete!"
