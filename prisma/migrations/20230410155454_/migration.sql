-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('Hiking', 'Mountaineering', 'Alpinism', 'Cycling', 'Car', 'Water', 'Ski', 'Speleo', 'Autostop');

-- CreateEnum
CREATE TYPE "TripDifficulty" AS ENUM ('NonKatecorigal', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('Summer', 'Autumn', 'Winter', 'Spring');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('Height', 'Mountain', 'MountainPass', 'MountainRange', 'Lake', 'Stream', 'Waterfall', 'WaterSource', 'Walley', 'Polonyna', 'Settlement', 'NatureObject', 'ArtificialObject');

-- CreateEnum
CREATE TYPE "LocationDifficulty" AS ENUM ('NonCategorized', 'First_A', 'First_A_star', 'First_B', 'First_B_star', 'Second_A', 'Second_A_star', 'Second_B', 'Second_B_star', 'Third_A', 'Third_A_star', 'Third_B', 'Third_B_star');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "passwordSalt" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorId" INTEGER,
    "tripType" "TripType" NOT NULL,
    "difficulty" "TripDifficulty",
    "season" "Season" NOT NULL,
    "year" DATE NOT NULL,
    "routeId" INTEGER NOT NULL,
    "url" TEXT,
    "fileUrl" TEXT,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" SERIAL NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_stops" (
    "id" SERIAL NOT NULL,
    "routeId" INTEGER NOT NULL,
    "name" TEXT,
    "stopNumber" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,

    CONSTRAINT "route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "description" TEXT,
    "longitude" DECIMAL(65,30),
    "latitude" DECIMAL(65,30),
    "elevation" DECIMAL(65,30),
    "type" "LocationType",

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations_to_difficulties" (
    "id" SERIAL NOT NULL,
    "locationId" INTEGER NOT NULL,
    "season" "Season",
    "difficulty" "LocationDifficulty" NOT NULL,
    "sourceUrl" TEXT,
    "sourseDescription" TEXT,
    "soureReportId" INTEGER,

    CONSTRAINT "locations_to_difficulties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "names_to_locations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "locationId" INTEGER NOT NULL,

    CONSTRAINT "names_to_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations_to_difficulties" ADD CONSTRAINT "locations_to_difficulties_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations_to_difficulties" ADD CONSTRAINT "locations_to_difficulties_soureReportId_fkey" FOREIGN KEY ("soureReportId") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "names_to_locations" ADD CONSTRAINT "names_to_locations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
