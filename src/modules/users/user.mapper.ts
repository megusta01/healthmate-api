import type { Professional, User } from 'src/generated/prisma/client'

export type UserWithProfessional = User & { professional: Professional | null }

/** Nunca expõe hashes de senha/token. */
export function toProfile(user: UserWithProfessional) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    hasPassword: !!user.passwordHash,
    googleLinked: !!user.googleId,
    createdAt: user.createdAt,
    professional: user.professional
      ? {
          id: user.professional.id,
          specialty: user.professional.specialty,
          license: user.professional.license,
          bio: user.professional.bio,
          avatarUrl: user.professional.avatarUrl,
        }
      : null,
  }
}

export type UserProfile = ReturnType<typeof toProfile>
