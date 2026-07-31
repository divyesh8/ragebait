import { z } from "zod";
import { isGender, type Gender } from "@/lib/gender";

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

export const genderSchema = z.custom<Gender>(isGender, {
  message: "Please select your gender.",
});

export const signupSchema = z
  .object({
    username: usernameSchema,
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[0-9]/, "Password must contain a number"),
    confirmPassword: z.string(),
    dob: z.string().refine((val) => !Number.isNaN(Date.parse(val)), "Enter a valid date"),
    gender: genderSchema,
    acceptTerms: z.boolean(),
    policyVersion: z.string().min(1, "Missing policy version"),
  })
  .refine((data) => data.acceptTerms === true, {
    message: "You must accept the Terms & Conditions to create an account",
    path: ["acceptTerms"],
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => {
    const dob = new Date(data.dob);
    const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age >= 13;
  }, {
    message: "You must be at least 13 years old to join Ragebait",
    path: ["dob"],
  });

export const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your username or email"),
  password: z.string().min(1, "Enter your password"),
});

export const profileUpdateSchema = z.object({
  bio: z.string().max(300, "Bio must be at most 300 characters").optional(),
  avatarUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  gender: genderSchema.optional(),
  showGenderOnPublicProfile: z.boolean().optional(),
  country: z.string().trim().min(2).max(80).optional(),
  languages: z.array(z.string().trim().min(2).max(30)).max(8).optional(),
  favoriteBattleCategory: z.string().trim().min(2).max(60).optional(),
  profileVisibility: z.enum(["public", "partners", "private"]).optional(),
  showOnlineStatus: z.boolean().optional(),
  showLastSeen: z.boolean().optional(),
  partnerRequestPolicy: z.enum(["anyone", "partners_only", "nobody"]).optional(),
});

export const groupSchema = z.object({
  name: z.string().min(3, "Group name must be at least 3 characters").max(60),
  description: z.string().max(300).optional().default(""),
  topics: z.array(z.string().min(1).max(60)).min(1, "Add at least one topic").max(5),
  bannerUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

export const battleCreateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(140),
  topic: z.string().min(1).max(60),
  battleType: z.enum(["casual", "ranked", "friend", "tournament", "group", "event"]),
  mode: z.enum(["text", "image", "meme"]),
  rounds: z.number().int().min(1).max(5),
});

export const battleCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4)
    .max(8)
    .regex(/^[A-Za-z0-9]+$/, "Battle codes are letters and numbers only"),
});

export const inviteCreateSchema = z.object({
  toUsername: usernameSchema,
  title: z.string().min(3, "Title must be at least 3 characters").max(140),
  topic: z.string().min(1).max(60),
  battleType: z.enum(["casual", "ranked", "friend", "tournament", "group", "event"]).default("friend"),
  mode: z.enum(["text", "image", "meme"]).default("text"),
  rounds: z.number().int().min(1).max(5).default(3),
});

export const changeUsernameSchema = z.object({
  newUsername: usernameSchema,
  currentPassword: z.string().min(1, "Enter your current password"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[0-9]/, "Password must contain a number"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export const requestEmailChangeSchema = z.object({
  newEmail: z.string().email("Enter a valid email address"),
  currentPassword: z.string().min(1, "Enter your current password"),
});

export const verifyEmailChangeSchema = z.object({
  newEmail: z.string().email(),
  code: z.string().trim().length(6, "Enter the 6-digit code"),
});

export const requestSignupOtpSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const verifySignupOtpSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  code: z.string().trim().length(6, "Enter the 6-digit code"),
});

export const battleEditSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters").max(140).optional(),
    topic: z.string().min(1).max(60).optional(),
    rounds: z.number().int().min(1).max(5).optional(),
  })
  .refine((data) => data.title !== undefined || data.topic !== undefined || data.rounds !== undefined, {
    message: "Provide at least one field to update.",
  });

export const avatarSelectSchema = z.object({
  avatarId: z.string().min(1, "Pick an avatar"),
});

export const interestsUpdateSchema = z.object({
  categoryIds: z.array(z.string().min(1)).max(20),
});
