import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

//This file populates the database with initial data for various categories.
//In other words it creates default entries in tables like hobbies, interests, music genres, movie genres, food preferences, travel types, and languages. 
//Run `npx prisma db seed` to execute this file after setting up the database.


async function main() {
  // Seed hobbies
  const hobbies = [
    { name: 'Reading', category: 'Intellectual' },
    { name: 'Gaming', category: 'Entertainment' },
    { name: 'Cooking', category: 'Creative' },
    { name: 'Hiking', category: 'Outdoor' },
    { name: 'Photography', category: 'Creative' },
    { name: 'Fitness', category: 'Health' },
    { name: 'Traveling', category: 'Adventure' },
    { name: 'Music', category: 'Creative' },
    { name: 'Dancing', category: 'Physical' },
    { name: 'Art', category: 'Creative' },
  ]             

  for (const hobby of hobbies) {
    await prisma.hobby.upsert({
      where: { name: hobby.name },
      update: {},
      create: hobby,
    })
  }

  // Seed interests
  const interests = [
    { name: 'Technology' },
    { name: 'Science' },
    { name: 'Politics' },
    { name: 'Philosophy' },
    { name: 'History' },
    { name: 'Psychology' },
    { name: 'Environment' },
    { name: 'Business' },
    { name: 'Health' },
    { name: 'Education' },
  ]

  for (const interest of interests) {
    await prisma.interest.upsert({
      where: { name: interest.name },
      update: {},
      create: interest,
    })
  }

  // Seed music genres
  const musicGenres = [
    { name: 'Pop' },
    { name: 'Rock' },
    { name: 'Jazz' },
    { name: 'Classical' },
    { name: 'Hip Hop' },
    { name: 'Electronic' },
    { name: 'Country' },
    { name: 'R&B' },
    { name: 'Folk' },
    { name: 'Indie' },
  ]

  for (const genre of musicGenres) {
    await prisma.musicGenre.upsert({
      where: { name: genre.name },
      update: {},
      create: genre,
    })
  }

  // Seed movie genres
  const movieGenres = [
    { name: 'Action' },
    { name: 'Comedy' },
    { name: 'Drama' },
    { name: 'Horror' },
    { name: 'Romance' },
    { name: 'Sci-Fi' },
    { name: 'Thriller' },
    { name: 'Documentary' },
    { name: 'Animation' },
    { name: 'Fantasy' },
  ]

  for (const genre of movieGenres) {
    await prisma.movieGenre.upsert({
      where: { name: genre.name },
      update: {},
      create: genre,
    })
  }

  // Seed food preferences
  const foodPreferences = [
    { name: 'Vegetarian' },
    { name: 'Vegan' },
    { name: 'Pescatarian' },
    { name: 'Keto' },
    { name: 'Paleo' },
    { name: 'Gluten-Free' },
    { name: 'Mediterranean' },
    { name: 'Asian Cuisine' },
    { name: 'Italian Cuisine' },
    { name: 'Mexican Cuisine' },
  ]

  for (const food of foodPreferences) {
    await prisma.foodPreference.upsert({
      where: { name: food.name },
      update: {},
      create: food,
    })
  }

  // Seed travel types
  const travelTypes = [
    { name: 'Adventure Travel' },
    { name: 'Beach Vacation' },
    { name: 'City Break' },
    { name: 'Cultural Tourism' },
    { name: 'Eco Tourism' },
    { name: 'Luxury Travel' },
    { name: 'Backpacking' },
    { name: 'Road Trip' },
    { name: 'Cruise' },
    { name: 'Camping' },
  ]

  for (const travel of travelTypes) {
    await prisma.travelType.upsert({
      where: { name: travel.name },
      update: {},
      create: travel,
    })
  }

  // Seed languages
  const languages = [
    { name: 'English', code: 'en' },
    { name: 'Spanish', code: 'es' },
    { name: 'French', code: 'fr' },
    { name: 'German', code: 'de' },
    { name: 'Italian', code: 'it' },
    { name: 'Portuguese', code: 'pt' },
    { name: 'Russian', code: 'ru' },
    { name: 'Chinese', code: 'zh' },
    { name: 'Japanese', code: 'ja' },
    { name: 'Korean', code: 'ko' },
  ]

  for (const language of languages) {
    await prisma.language.upsert({
      where: { name: language.name },
      update: {},
      create: language,
    })
  }

  console.log('Database seeded successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
