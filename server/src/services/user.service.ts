import prisma from "../prisma";

export async function saveUser(athlete: any) {
  return await prisma.user.upsert({
    where: {
      stravaId: athlete.id.toString(),
    },

    update: {
      firstName: athlete.firstname,
      lastName: athlete.lastname,
      city: athlete.city,
      country: athlete.country,
      profilePicture: athlete.profile,
    },

    create: {
      stravaId: athlete.id.toString(),
      firstName: athlete.firstname,
      lastName: athlete.lastname,
      city: athlete.city,
      country: athlete.country,
      profilePicture: athlete.profile,
    },
  });
}
