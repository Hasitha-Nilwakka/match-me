#!/usr/bin/env node

/**
 * Fix Prisma schema after db pull
 * 
 * This script fixes the incorrect BigInt types that Prisma introspection 
 * generates for foreign keys. All IDs in our GORM database are integers,
 * but Prisma incorrectly detects foreign keys as BigInt.
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');

console.log('🔧 Fixing Prisma schema types...');

try {
  let content = fs.readFileSync(schemaPath, 'utf8');
  
  // Replace BigInt with Int for foreign key fields
  // This handles all BigInt occurrences except for genuine big integer fields (like age)
  content = content.replace(/BigInt(?!\s*\??\s*$)/g, 'Int');
  
  // Handle BigInt? fields (nullable) - keep age as BigInt but convert foreign keys
  content = content.replace(/\b(user_id|requester_id|receiver_id|dismissed_user_id|chat_id|sender_id|connection_id|hobby_id|interest_id|music_genre_id|movie_genre_id|food_preference_id|travel_type_id|language_id)\s+BigInt\?/g, '$1 Int?');
  content = content.replace(/\b(user_id|requester_id|receiver_id|dismissed_user_id|chat_id|sender_id|connection_id|hobby_id|interest_id|music_genre_id|movie_genre_id|food_preference_id|travel_type_id|language_id)\s+BigInt(?!\?)/g, '$1 Int');
  
  // Add header comment if not present
  if (!content.includes('This schema is auto-generated from the GORM database structure')) {
    const headerComment = `// This schema is auto-generated from the GORM database structure.
// Database schema management is handled by GORM AutoMigrate in the Go backend.
// This file is used solely for Prisma Studio database visualization.
// To update this schema, run \`npx prisma db pull\` then \`node fix-schema.js\`.

`;
    
    // Find the generator/datasource block and insert comment before it
    content = content.replace(/(generator client \{)/, headerComment + '$1');
  }
  
  fs.writeFileSync(schemaPath, content, 'utf8');
  console.log('✅ Schema types fixed successfully!');
  console.log('   - Converted BigInt foreign keys to Int');
  console.log('   - Added header comment');
  console.log('');
  console.log('🚀 You can now run: pnpm db:studio');
  
} catch (error) {
  console.error('❌ Error fixing schema:', error.message);
  process.exit(1);
}